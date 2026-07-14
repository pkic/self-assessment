import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { Assessment, SavedState } from "../types/types";
import { IndexedDBAdapter } from "./storageAdapter";

// C3/C4 regression coverage for the import-collision Replace flow:
// storageAdapter.ts's writeSavedState has a merge-on-write "stored-newer
// wins" guard (`if (stored.meta.updatedAt > a.meta.updatedAt) continue`).
// Replace must bump the incoming record's updatedAt BEFORE writing —
// otherwise an imported file older than the local copy would be silently
// dropped, defeating the user's explicit choice. This suite proves the
// bump defeats the guard, and that a "pre-import" revision of the
// prior record is snapshotted first (via the adapter's existing public
// snapshotRevision, not the private putRevision).

const makeAssessment = (
  id: string,
  name: string,
  updatedAt: string,
): Assessment => ({
  id,
  name,
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: name,
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: { createdAt: updatedAt, updatedAt },
});

const makeState = (
  assessments: Assessment[],
  activeId: string | null,
): SavedState => ({ stateSchemaVersion: 1, activeId, assessments });

beforeEach(() => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => void (store[k] = v),
    removeItem: (k) => void delete store[k],
    key: () => null,
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    length: 0,
  } as Storage;
});

const open = async (): Promise<IndexedDBAdapter> => {
  const a = new IndexedDBAdapter();
  await a.init();
  return a;
};

/** Mirrors the Replace handler in Assessment.tsx: snapshot the existing
 *  record as "pre-import", bump the incoming record's updatedAt, then write
 *  it through the normal writeSavedState path (same path the debounced
 *  useTabPersistence effect uses). */
const performReplace = async (
  adapter: IndexedDBAdapter,
  existing: Assessment,
  incoming: Assessment,
): Promise<Assessment> => {
  await adapter.snapshotRevision(existing, "pre-import");
  const replacement: Assessment = {
    ...incoming,
    meta: { ...incoming.meta, updatedAt: new Date().toISOString() },
  };
  await adapter.writeSavedState(makeState([replacement], replacement.id));
  return replacement;
};

describe("import collision Replace (C3: updatedAt bump defeats stored-newer-wins guard)", () => {
  it("overwrites even when the imported file's own updatedAt is OLDER than the local copy", async () => {
    const adapter = await open();
    const local = makeAssessment(
      "id-1",
      "Local (edited)",
      "2026-07-06T12:00:00.000Z",
    );
    await adapter.writeSavedState(makeState([local], "id-1"));

    // The file being imported is OLDER than the local copy — without the
    // updatedAt bump, writeSavedState's guard would keep `local` untouched.
    const fileVersion = makeAssessment(
      "id-1",
      "File (older)",
      "2026-01-01T00:00:00.000Z",
    );

    await performReplace(adapter, local, fileVersion);

    const back = await adapter.readSavedState();
    const stored = back!.assessments.find((a) => a.id === "id-1")!;
    // The file's content won — proves the bump defeated the guard. If the
    // bump were missing, this would still read "Local (edited)".
    expect(stored.name).toBe("File (older)");
    adapter.close();
  });

  it("records a pre-import revision of the prior (about-to-be-overwritten) record", async () => {
    const adapter = await open();
    const local = makeAssessment(
      "id-1",
      "Local (edited)",
      "2026-07-06T12:00:00.000Z",
    );
    await adapter.writeSavedState(makeState([local], "id-1"));

    const fileVersion = makeAssessment(
      "id-1",
      "File (older)",
      "2026-01-01T00:00:00.000Z",
    );
    await performReplace(adapter, local, fileVersion);

    const revisions = await adapter.listRevisions("id-1");
    const preImport = revisions.find((r) => r.reason === "pre-import");
    expect(preImport).toBeDefined();
    // The snapshot captures the pre-overwrite (local) content, not the
    // incoming file's.
    expect(preImport!.assessment.name).toBe("Local (edited)");
    adapter.close();
  });

  it("also overwrites the normal case where the file is newer than the local copy", async () => {
    const adapter = await open();
    const local = makeAssessment(
      "id-1",
      "Local (stale)",
      "2026-01-01T00:00:00.000Z",
    );
    await adapter.writeSavedState(makeState([local], "id-1"));

    const fileVersion = makeAssessment(
      "id-1",
      "File (newer)",
      "2026-07-06T12:00:00.000Z",
    );
    await performReplace(adapter, local, fileVersion);

    const back = await adapter.readSavedState();
    const stored = back!.assessments.find((a) => a.id === "id-1")!;
    expect(stored.name).toBe("File (newer)");
    adapter.close();
  });
});

describe("no-collision import vs. a tombstoned id", () => {
  it("re-importing a file whose id was previously deleted in this browser still lands, once updatedAt is bumped", async () => {
    const adapter = await open();
    const original = makeAssessment(
      "id-1",
      "Original",
      "2026-01-01T00:00:00.000Z",
    );
    await adapter.writeSavedState(makeState([original], "id-1"));
    // Delete it — this tombstones id-1 with "now" (fake-indexeddb's clock,
    // i.e. real Date.now()), which postdates the fixture's fixed
    // 2026-01-01 updatedAt above.
    await adapter.writeSavedState(makeState([], null), {
      deleteIds: ["id-1"],
    });
    expect((await adapter.readSavedState())!.assessments).toHaveLength(0);

    // Re-importing the ORIGINAL export bytes verbatim (stale updatedAt) is
    // exactly what the tombstone guard is designed to reject — a stale
    // whole-array flush from another tab. Without the updatedAt bump this
    // import would be silently dropped.
    const staleReimport = { ...original };
    await adapter.writeSavedState(makeState([staleReimport], "id-1"));
    expect((await adapter.readSavedState())!.assessments).toHaveLength(0);

    // Mirrors handleManagerUpload's no-collision branch: bump updatedAt to
    // now before writing, exactly like Replace does against the
    // stored-newer-wins guard.
    const reimported: Assessment = {
      ...original,
      meta: { ...original.meta, updatedAt: new Date().toISOString() },
    };
    await adapter.writeSavedState(makeState([reimported], "id-1"));

    const back = await adapter.readSavedState();
    expect(back!.assessments).toHaveLength(1);
    expect(back!.assessments[0].name).toBe("Original");
    adapter.close();
  });

  it("a reimport whose updatedAt exactly equals the tombstone timestamp wins the tie deterministically", async () => {
    const adapter = await open();
    const original = makeAssessment(
      "id-1",
      "Original",
      "2026-01-01T00:00:00.000Z",
    );
    await adapter.writeSavedState(makeState([original], "id-1"));
    await adapter.writeSavedState(makeState([], null), {
      deleteIds: ["id-1"],
    });
    expect((await adapter.readSavedState())!.assessments).toHaveLength(0);

    // Pin the exact same-millisecond tie: the reimport's updatedAt equals
    // the tombstone timestamp bit-for-bit (not merely "close in time"),
    // which is what the `>=` guard used to reject and the `>` guard now
    // accepts. This removes any dependency on real clock timing. dumpRaw()
    // is the adapter's public introspection escape hatch, so this reads
    // the tombstone without reaching into private internals.
    const dumped = JSON.parse(await adapter.dumpRaw()) as {
      meta: { deletions?: Record<string, string> };
    };
    const tomb = dumped.meta.deletions?.["id-1"];
    expect(tomb).toBeDefined();

    const reimported: Assessment = {
      ...original,
      meta: { ...original.meta, updatedAt: tomb as string },
    };
    await adapter.writeSavedState(makeState([reimported], "id-1"));

    const back = await adapter.readSavedState();
    expect(back!.assessments).toHaveLength(1);
    expect(back!.assessments[0].name).toBe("Original");
    expect(back!.assessments[0].meta.updatedAt).toBe(tomb);
    adapter.close();
  });
});

describe("import collision Keep both", () => {
  it("yields two records; the second's meta.importedFromId points at the original", async () => {
    const adapter = await open();
    const local = makeAssessment(
      "id-1",
      "Original",
      "2026-07-01T00:00:00.000Z",
    );
    await adapter.writeSavedState(makeState([local], "id-1"));

    // Mirrors handleImportKeepBoth in Assessment.tsx: new id, " (imported)"
    // suffix, importedFromId set to the original.
    const copy: Assessment = {
      ...local,
      id: "id-2",
      name: `${local.name} (imported)`,
      meta: {
        ...local.meta,
        updatedAt: "2026-07-06T12:00:00.000Z",
        importedFromId: local.id,
      },
    };
    await adapter.writeSavedState(makeState([local, copy], "id-2"));

    const back = await adapter.readSavedState();
    expect(back!.assessments).toHaveLength(2);
    const second = back!.assessments.find((a) => a.id === "id-2")!;
    expect(second.name).toBe("Original (imported)");
    expect(second.meta.importedFromId).toBe("id-1");
    const first = back!.assessments.find((a) => a.id === "id-1")!;
    expect(first.meta.importedFromId).toBeUndefined();
    adapter.close();
  });
});
