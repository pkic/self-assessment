import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { Assessment, SavedState } from "../types/types";
import { IndexedDBAdapter } from "./storageAdapter";
import { MemoryStorageAdapter } from "./memoryStorageAdapter";

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

describe("IndexedDBAdapter delete durability", () => {
  it("a deleted assessment is not resurrected by a later stale whole-array write from another tab", async () => {
    const c = makeAssessment("id-c", "C", "2026-07-05T10:00:00.000Z");
    const tabA = await open();
    await tabA.writeSavedState(makeState([c], "id-c"));
    // tab B loads the same assessment before it is deleted, keeping a stale copy
    const tabB = await open();
    await tabB.readSavedState();
    // tab A deletes it
    await tabA.writeSavedState(makeState([], null), { deleteIds: ["id-c"] });
    let back = await tabA.readSavedState();
    expect(back!.assessments.map((x) => x.id)).not.toContain("id-c");
    // tab B, unaware of the delete, later flushes its full (stale) array
    await tabB.writeSavedState(makeState([c], "id-c"));
    back = await tabA.readSavedState();
    expect(back!.assessments.map((x) => x.id)).not.toContain("id-c");
    tabA.close();
    tabB.close();
  });

  it("deleting an assessment purges all of its revisions", async () => {
    const adapter = await open();
    const x = makeAssessment("id-x", "X");
    await adapter.writeSavedState(makeState([x], "id-x"));
    await adapter.snapshotRevision(x, "pre-migration");
    await adapter.snapshotRevision({ ...x, name: "X2" }, "timer");
    expect((await adapter.listRevisions("id-x")).length).toBeGreaterThanOrEqual(
      2,
    );
    await adapter.writeSavedState(makeState([], null), { deleteIds: ["id-x"] });
    expect(await adapter.listRevisions("id-x")).toHaveLength(0);
    adapter.close();
  });

  it("a revision snapshot cannot be restored once its parent assessment has been deleted", async () => {
    const adapter = await open();
    const x = makeAssessment("id-x", "X");
    await adapter.writeSavedState(makeState([x], "id-x"));
    await adapter.snapshotRevision(x, "pre-migration");
    const [rev] = await adapter.listRevisions("id-x");
    await adapter.writeSavedState(makeState([], null), { deleteIds: ["id-x"] });
    await expect(adapter.restoreRevision(rev.revId)).rejects.toThrow(
      `Revision ${rev.revId} not found`,
    );
    adapter.close();
  });

  it("a legitimate newer write for a previously deleted id is not blocked by its tombstone", async () => {
    const c = makeAssessment("id-c", "C", "2026-07-05T10:00:00.000Z");
    const adapter = await open();
    await adapter.writeSavedState(makeState([c], "id-c"));
    await adapter.writeSavedState(makeState([], null), { deleteIds: ["id-c"] });
    let back = await adapter.readSavedState();
    expect(back!.assessments.map((x) => x.id)).not.toContain("id-c");
    // re-created later (e.g. user re-imports/re-creates the same id) with a
    // newer updatedAt than the tombstone timestamp
    const recreated = makeAssessment(
      "id-c",
      "C-again",
      new Date(Date.now() + 60_000).toISOString(),
    );
    await adapter.writeSavedState(makeState([recreated], "id-c"));
    back = await adapter.readSavedState();
    const found = back!.assessments.find((a) => a.id === "id-c");
    expect(found).toBeDefined();
    expect(found!.name).toBe("C-again");
    adapter.close();
  });
});

describe("MemoryStorageAdapter delete parity", () => {
  it("deleting an assessment purges all of its revisions", async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.init();
    const x = makeAssessment("id-x", "X");
    await adapter.writeSavedState(makeState([x], "id-x"));
    await adapter.snapshotRevision(x, "pre-migration");
    await adapter.snapshotRevision({ ...x, name: "X2" }, "timer");
    expect(await adapter.listRevisions("id-x")).toHaveLength(2);
    await adapter.writeSavedState(makeState([], null), { deleteIds: ["id-x"] });
    expect(await adapter.listRevisions("id-x")).toHaveLength(0);
  });

  it("a revision snapshot cannot be restored once its parent assessment has been deleted", async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.init();
    const x = makeAssessment("id-x", "X");
    await adapter.writeSavedState(makeState([x], "id-x"));
    await adapter.snapshotRevision(x, "pre-migration");
    const [rev] = await adapter.listRevisions("id-x");
    await adapter.writeSavedState(makeState([], null), { deleteIds: ["id-x"] });
    await expect(adapter.restoreRevision(rev.revId)).rejects.toThrow(
      `Revision ${rev.revId} not found`,
    );
  });

  it("merge-on-write: does not delete an assessment merely because it is absent from a later partial array", async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.init();
    const one = makeAssessment("id-1", "One");
    const two = makeAssessment("id-2", "Two");
    await adapter.writeSavedState(makeState([one, two], "id-1"));
    // a later write omits id-1 without listing it in deleteIds — absence alone
    // must not delete it, matching the IndexedDB adapter's contract
    await adapter.writeSavedState(makeState([two], "id-2"));
    const back = await adapter.readSavedState();
    expect(back!.assessments.map((a) => a.id).sort()).toEqual(["id-1", "id-2"]);
  });
});
