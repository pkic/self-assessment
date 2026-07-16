import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { Assessment, SavedState } from "../types/types";
import { IndexedDBAdapter } from "./storageAdapter";
import { MemoryStorageAdapter } from "./memoryStorageAdapter";
import type { StorageAdapter } from "./storageTypes";
import type { ScopeTemplate } from "./scopeTree";

beforeEach(() => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

const tpl = (id: string, name: string): ScopeTemplate => ({
  id,
  name,
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
  outOfScopeCategoryKeys: ["G.c2"],
  outOfScopeRequirementKeys: ["G.c1.r2"],
});

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

const makeSavedStateWithOneAssessment = (id: string): SavedState => ({
  stateSchemaVersion: 1,
  activeId: id,
  assessments: [makeAssessment(id, "Keep Me")],
});

const suites: [string, () => StorageAdapter][] = [
  ["IndexedDBAdapter", () => new IndexedDBAdapter()],
  ["MemoryStorageAdapter", () => new MemoryStorageAdapter()],
];

describe.each(suites)("scope templates — %s", (_name, make) => {
  it("round-trips save/list/delete and upserts by id", async () => {
    const a = make();
    await a.init();
    expect(await a.listScopeTemplates()).toEqual([]);
    await a.saveScopeTemplate(tpl("t1", "One"));
    await a.saveScopeTemplate(tpl("t2", "Two"));
    let list = await a.listScopeTemplates();
    expect(list.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    // upsert by id
    await a.saveScopeTemplate({ ...tpl("t1", "One-renamed") });
    list = await a.listScopeTemplates();
    expect(list.find((t) => t.id === "t1")!.name).toBe("One-renamed");
    expect(list).toHaveLength(2);
    await a.deleteScopeTemplate("t1");
    list = await a.listScopeTemplates();
    expect(list.map((t) => t.id)).toEqual(["t2"]);
    a.close();
  });
});

it("IndexedDB: saving a template leaves stored assessments untouched and doesn't leak into them", async () => {
  const a = new IndexedDBAdapter();
  await a.init();
  // Build the SavedState/assessment the same way storageAdapter.test.ts does
  // (read that file for the exact minimal `SavedAssessment` shape the adapter
  // round-trips — id/dataVersion/progress/requirementProgress/meta.updatedAt/…).
  const saved = makeSavedStateWithOneAssessment("keep-me"); // helper mirrored from storageAdapter.test.ts
  await a.writeSavedState(saved);
  await a.saveScopeTemplate(tpl("t1", "One"));
  const state = await a.readSavedState();
  expect(state?.assessments.map((x) => x.id)).toEqual(["keep-me"]);
  expect(JSON.stringify(state?.assessments)).not.toContain(
    "outOfScopeCategoryKeys",
  );
  expect((await a.listScopeTemplates()).map((t) => t.id)).toEqual(["t1"]);
  a.close();
});
