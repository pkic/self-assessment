import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import {
  getStorageAdapter,
  resetStorageAdapterForTests,
} from "./storageAdapter";
import { ForwardCompatError } from "./stateSchema";

let store: Record<string, string>;

beforeEach(() => {
  resetStorageAdapterForTests();
  (globalThis as { indexedDB?: IDBFactory }).indexedDB = new IDBFactory();
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

describe("getStorageAdapter", () => {
  it("returns an indexeddb-backed adapter when IDB works, as a singleton", async () => {
    const a = await getStorageAdapter();
    expect(a.backend).toBe("indexeddb");
    expect(await getStorageAdapter()).toBe(a);
  });

  it("falls back to memory when indexedDB is unavailable", async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    const a = await getStorageAdapter();
    expect(a.backend).toBe("memory");
    await a.writeSavedState({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
    expect(await a.readSavedState()).toEqual({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
  });

  it("memory fallback still reads localStorage but does NOT set the import marker", async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    store["pkimm-sa"] = JSON.stringify({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
    const a = await getStorageAdapter();
    expect(await a.readSavedState()).not.toBeNull();
    expect(store["pkimm-sa-idb-imported"]).toBeUndefined();
  });

  it("does NOT mask ForwardCompatError as a memory fallback", async () => {
    store["pkimm-sa"] = JSON.stringify({
      stateSchemaVersion: 99,
      activeId: null,
      assessments: [],
    });
    await expect(getStorageAdapter()).rejects.toThrow(ForwardCompatError);
  });

  it("memory restoreRevision upserts even when the assessment is absent from state", async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    const a = await getStorageAdapter();
    const assessment = {
      id: "id-r",
      name: "restore-me",
      dataVersion: "2.0.0",
      progress: {},
      enabledExtensions: [],
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      sourceStructure: { byKey: {} },
      meta: {
        createdAt: "2026-07-05T10:00:00.000Z",
        updatedAt: "2026-07-05T10:00:00.000Z",
      },
    };
    await a.snapshotRevision(assessment, "pre-migration");
    // state was never written — restore must still persist the assessment
    const revs = await a.listRevisions("id-r");
    const restored = await a.restoreRevision(revs[0].revId);
    expect(restored.name).toBe("restore-me");
    const state = await a.readSavedState();
    expect(state).not.toBeNull();
    expect(state!.assessments.some((x) => x.id === "id-r")).toBe(true);
  });
});
