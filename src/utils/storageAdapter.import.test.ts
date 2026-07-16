import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { Assessment, SavedState } from "../types/types";
import {
  IndexedDBAdapter,
  IDB_IMPORT_MARKER,
  MAX_REVISIONS_PER_ASSESSMENT,
} from "./storageAdapter";
import { ForwardCompatError } from "./stateSchema";

const makeAssessment = (
  id: string,
  updatedAt = "2026-07-05T10:00:00.000Z",
): Assessment => ({
  id,
  name: id,
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: "",
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: { createdAt: "2026-07-05T10:00:00.000Z", updatedAt },
});

let store: Record<string, string>;

beforeEach(() => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  store = {};
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

describe("one-time localStorage import", () => {
  const legacyState: SavedState = {
    stateSchemaVersion: 1,
    activeId: "id-1",
    assessments: [makeAssessment("id-1")],
  };

  it("imports pkimm-sa into IDB, sets the marker, and leaves localStorage untouched", async () => {
    store["pkimm-sa"] = JSON.stringify(legacyState);
    const adapter = await open();
    const state = await adapter.readSavedState();
    expect(state!.assessments.map((a) => a.id)).toEqual(["id-1"]);
    expect(store["pkimm-sa"]).toBe(JSON.stringify(legacyState));
    expect(store[IDB_IMPORT_MARKER]).toBeTruthy();
    adapter.close();
  });

  it("does not re-import when the marker is present", async () => {
    store["pkimm-sa"] = JSON.stringify(legacyState);
    store[IDB_IMPORT_MARKER] = "2026-07-01T00:00:00.000Z";
    const adapter = await open();
    expect(await adapter.readSavedState()).toBeNull();
    adapter.close();
  });

  it("does not import when IDB already has state", async () => {
    const first = await open();
    await first.writeSavedState({
      stateSchemaVersion: 1,
      activeId: "id-9",
      assessments: [makeAssessment("id-9")],
    });
    first.close();
    store["pkimm-sa"] = JSON.stringify(legacyState);
    const second = await open();
    const state = await second.readSavedState();
    expect(state!.assessments.map((a) => a.id)).toEqual(["id-9"]);
    second.close();
  });

  it("throws ForwardCompatError (not silent fallback) when localStorage data is newer", async () => {
    store["pkimm-sa"] = JSON.stringify({
      ...legacyState,
      stateSchemaVersion: 99,
    });
    const adapter = new IndexedDBAdapter();
    await expect(adapter.init()).rejects.toThrow(ForwardCompatError);
    expect(store["pkimm-sa"]).toBeTruthy();
  });
});

describe("revision ring buffer", () => {
  it("snapshotRevision + listRevisions round-trip, newest first by seq", async () => {
    const adapter = await open();
    const a = makeAssessment("id-1");
    await adapter.snapshotRevision(a, "pre-migration");
    await adapter.snapshotRevision({ ...a, name: "later" }, "pre-import");
    const revs = await adapter.listRevisions("id-1");
    expect(revs).toHaveLength(2);
    expect(revs.map((r) => r.seq)).toEqual([2, 1]); // deterministic even on ISO ties
    expect(revs[0].reason).toBe("pre-import");
    expect(revs[1].assessment.name).toBe("id-1");
    adapter.close();
  });

  it(`prunes to ${MAX_REVISIONS_PER_ASSESSMENT}, evicting the LOWEST seq (oldest) first`, async () => {
    const adapter = await open();
    const a = makeAssessment("id-1");
    for (let i = 0; i < MAX_REVISIONS_PER_ASSESSMENT + 5; i++) {
      await adapter.snapshotRevision({ ...a, name: `v${i}` }, "pre-migration");
    }
    const revs = await adapter.listRevisions("id-1");
    expect(revs).toHaveLength(MAX_REVISIONS_PER_ASSESSMENT);
    const names = revs.map((r) => r.assessment.name);
    expect(names).toContain(`v${MAX_REVISIONS_PER_ASSESSMENT + 4}`); // newest kept
    expect(names).not.toContain("v0");
    expect(names).not.toContain("v4"); // exactly the first 5 evicted
    expect(names).toContain("v5");
    adapter.close();
  });

  it("timer snapshots skip unchanged assessments (idle rings never churn)", async () => {
    const adapter = await open();
    const a = makeAssessment("id-1", "2026-07-05T10:00:00.000Z");
    await adapter.snapshotRevision(a, "pre-migration"); // safety-net snapshot
    // 25 whole-state writes with the SAME updatedAt: no new timer revisions
    for (let i = 0; i < 25; i++) {
      await adapter.writeSavedState({
        stateSchemaVersion: 1,
        activeId: "id-1",
        assessments: [a],
      });
    }
    const revs = await adapter.listRevisions("id-1");
    expect(revs.filter((r) => r.reason === "timer")).toHaveLength(0);
    expect(revs.some((r) => r.reason === "pre-migration")).toBe(true); // net intact
    adapter.close();
  });

  it("restoreRevision snapshots current as pre-restore and returns the restored assessment", async () => {
    const adapter = await open();
    const original = makeAssessment("id-1");
    await adapter.writeSavedState({
      stateSchemaVersion: 1,
      activeId: "id-1",
      assessments: [original],
    });
    await adapter.snapshotRevision(original, "pre-migration");
    const target = (await adapter.listRevisions("id-1"))[0];
    const mutated = makeAssessment("id-1", "2026-07-05T12:00:00.000Z");
    mutated.name = "mutated";
    await adapter.writeSavedState({
      stateSchemaVersion: 1,
      activeId: "id-1",
      assessments: [mutated],
    });
    const restored = await adapter.restoreRevision(target.revId);
    expect(restored.name).toBe("id-1");
    const revs = await adapter.listRevisions("id-1");
    expect(revs.some((r) => r.reason === "pre-restore")).toBe(true);
    const state = await adapter.readSavedState();
    expect(state!.assessments[0].name).toBe("id-1");
    adapter.close();
  });

  it("does not snapshot transient assessments on write", async () => {
    const adapter = await open();
    await adapter.writeSavedState({
      stateSchemaVersion: 1,
      activeId: "transient-1",
      assessments: [makeAssessment("transient-1")],
    });
    expect(await adapter.listRevisions("transient-1")).toHaveLength(0);
    adapter.close();
  });
});
