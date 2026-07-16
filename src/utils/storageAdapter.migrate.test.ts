import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import type { Assessment, SavedState } from "../types/types";
import { IndexedDBAdapter } from "./storageAdapter";
import type { RevisionRecord } from "./storageTypes";
import { DB_NAME, DB_STRUCTURAL_VERSION } from "./storageTypes";

const makeAssessment = (
  id: string,
  name: string,
  updatedAt = "2026-07-05T10:00:00.000Z",
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
  meta: { createdAt: "2026-07-05T10:00:00.000Z", updatedAt },
});

const makeState = (
  assessments: Assessment[],
  activeId: string | null,
  stateSchemaVersion: number = 1,
): SavedState => ({
  stateSchemaVersion: stateSchemaVersion as SavedState["stateSchemaVersion"],
  activeId,
  assessments,
});

const makeAssessmentWithRequirementProgress = (
  id: string,
  name: string,
  updatedAt = "2026-07-05T10:00:00.000Z",
): Assessment => ({
  ...makeAssessment(id, name, updatedAt),
  requirementProgress: {
    "G.c1.r1": { level: 3, applicability: true, notes: "", evidence: "" },
  },
});

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

/** Seeds a "genuinely pre-existing v1" record directly into the fake
 *  IndexedDB, bypassing writeSavedState entirely (writeSavedState always
 *  stamps the current WIDGET_MAX_STATE_SCHEMA_VERSION, so it can never be
 *  used to leave a stored v1 record behind — that's the very thing under
 *  test). Mirrors the object-store layout created by IndexedDBAdapter.init. */
const seedV1 = async (assessments: Assessment[], activeId: string | null) => {
  const db = await openDB(DB_NAME, DB_STRUCTURAL_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("assessments")) {
        d.createObjectStore("assessments", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("meta")) {
        d.createObjectStore("meta");
      }
      if (!d.objectStoreNames.contains("revisions")) {
        const rev = d.createObjectStore("revisions", { keyPath: "revId" });
        rev.createIndex("byAssessment", "assessmentId");
      }
    },
  });
  const tx = db.transaction(["assessments", "meta"], "readwrite");
  for (const a of assessments) {
    await tx.objectStore("assessments").put(a);
  }
  await tx.objectStore("meta").put(
    {
      stateSchemaVersion: 1,
      activeId,
      order: assessments.map((a) => a.id),
    },
    "state",
  );
  await tx.done;
  db.close();
};

const preMigrationRevisions = (
  revs: RevisionRecord[],
  assessmentId: string,
): RevisionRecord[] =>
  revs.filter(
    (r) => r.assessmentId === assessmentId && r.reason === "pre-migration",
  );

describe("IndexedDBAdapter migrate-on-write (v1 -> v2)", () => {
  it("stamps meta.stateSchemaVersion to 2 and records exactly one pre-migration revision per incoming assessment when the stored version is 1", async () => {
    const a = makeAssessment("id-a", "A");
    const b = makeAssessment("id-b", "B");
    await seedV1([a, b], "id-a");

    const adapter = await open();
    const preWrite = JSON.parse(await adapter.dumpRaw()) as {
      state: { stateSchemaVersion: number };
    };
    expect(preWrite.state.stateSchemaVersion).toBe(1);

    // Incoming write: content unchanged from what's stored.
    await adapter.writeSavedState(makeState([a, b], "id-a", 1));

    const after = await adapter.readSavedState();
    expect(after!.stateSchemaVersion).toBe(2);
    expect(after!.assessments.map((x) => x.id).sort()).toEqual([
      "id-a",
      "id-b",
    ]);
    // content otherwise unchanged
    expect(after!.assessments.find((x) => x.id === "id-a")!.name).toBe("A");
    expect(after!.assessments.find((x) => x.id === "id-b")!.name).toBe("B");

    const revsA = await adapter.listRevisions("id-a");
    const revsB = await adapter.listRevisions("id-b");
    expect(preMigrationRevisions(revsA, "id-a")).toHaveLength(1);
    expect(preMigrationRevisions(revsB, "id-b")).toHaveLength(1);

    adapter.close();
  });

  it("is idempotent: a second write records no additional pre-migration revision", async () => {
    const a = makeAssessment("id-a", "A");
    await seedV1([a], "id-a");

    const adapter = await open();
    // First write while stored version is 1 -> migrates and snapshots once.
    await adapter.writeSavedState(makeState([a], "id-a", 1));
    const afterFirst = await adapter.readSavedState();
    expect(afterFirst!.stateSchemaVersion).toBe(2);
    const revsAfterFirst = preMigrationRevisions(
      await adapter.listRevisions("id-a"),
      "id-a",
    );
    expect(revsAfterFirst).toHaveLength(1);

    // Second write: stored version is now 2 -> must not snapshot again.
    const changed = {
      ...a,
      name: "A2",
      meta: { ...a.meta, updatedAt: "2026-07-05T11:00:00.000Z" },
    };
    await adapter.writeSavedState(makeState([changed], "id-a", 2));
    const revsAfterSecond = preMigrationRevisions(
      await adapter.listRevisions("id-a"),
      "id-a",
    );
    expect(revsAfterSecond).toHaveLength(1);

    adapter.close();
  });

  it("a fresh adapter whose first write is v2-content records no pre-migration revision", async () => {
    const adapter = await open();
    const a = makeAssessment("id-a", "A");
    // No prior stored state at all -> nothing to migrate from.
    await adapter.writeSavedState(makeState([a], "id-a", 2));
    const after = await adapter.readSavedState();
    expect(after!.stateSchemaVersion).toBe(2);
    const revs = preMigrationRevisions(
      await adapter.listRevisions("id-a"),
      "id-a",
    );
    expect(revs).toHaveLength(0);
    adapter.close();
  });

  it("readSavedState records no revision and does not mutate the DB", async () => {
    const a = makeAssessment("id-a", "A");
    await seedV1([a], "id-a");

    const adapter = await open();
    const first = await adapter.readSavedState();
    const second = await adapter.readSavedState();

    expect(first).toEqual(second);
    expect(first!.stateSchemaVersion).toBe(1); // read must not migrate
    const revs = preMigrationRevisions(
      await adapter.listRevisions("id-a"),
      "id-a",
    );
    expect(revs).toHaveLength(0);

    const raw = JSON.parse(await adapter.dumpRaw()) as {
      state: { stateSchemaVersion: number };
      revisions: unknown[];
    };
    expect(raw.state.stateSchemaVersion).toBe(1);
    expect(raw.revisions).toHaveLength(0);

    adapter.close();
  });

  it("a fresh adapter's first write with non-empty requirementProgress stamps 2 and records no pre-migration revision", async () => {
    const adapter = await open();
    const a = makeAssessmentWithRequirementProgress("id-a", "A");
    // No prior stored state at all -> content-aware stamp, not a v1->v2 migration.
    await adapter.writeSavedState(makeState([a], "id-a", 1));

    const after = await adapter.readSavedState();
    expect(after!.stateSchemaVersion).toBe(2);
    expect(
      after!.assessments.find((x) => x.id === "id-a")!.requirementProgress,
    ).toEqual(a.requirementProgress);

    const revs = preMigrationRevisions(
      await adapter.listRevisions("id-a"),
      "id-a",
    );
    expect(revs).toHaveLength(0);

    adapter.close();
  });

  it("a 99-stamped write with no requirementProgress still round-trips 99 (forward-compat unaffected)", async () => {
    const adapter = await open();
    const a = makeAssessment("id-a", "A");
    await adapter.writeSavedState(makeState([a], "id-a", 99));

    const raw = JSON.parse(await adapter.dumpRaw()) as {
      state: { stateSchemaVersion: number };
    };
    expect(raw.state.stateSchemaVersion).toBe(99);

    adapter.close();
  });
});
