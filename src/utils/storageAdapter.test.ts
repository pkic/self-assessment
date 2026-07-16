import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { Assessment, SavedState } from "../types/types";
import { IndexedDBAdapter } from "./storageAdapter";

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

describe("IndexedDBAdapter core", () => {
  it("returns null before anything is written", async () => {
    const a = await open();
    expect(await a.readSavedState()).toBeNull();
    a.close();
  });

  it("round-trips a SavedState preserving assessment order", async () => {
    const adapter = await open();
    await adapter.writeSavedState(
      makeState(
        [makeAssessment("id-b", "B"), makeAssessment("id-a", "A")],
        "id-b",
      ),
    );
    const back = await adapter.readSavedState();
    expect(back!.activeId).toBe("id-b");
    expect(back!.assessments.map((x) => x.id)).toEqual(["id-b", "id-a"]);
    expect(back!.stateSchemaVersion).toBe(1);
    adapter.close();
  });

  it("does NOT delete by absence; deletes only explicit deleteIds", async () => {
    const adapter = await open();
    await adapter.writeSavedState(
      makeState(
        [makeAssessment("id-1", "One"), makeAssessment("id-2", "Two")],
        "id-1",
      ),
    );
    // absence: id-1 missing from the state but not in deleteIds → survives
    await adapter.writeSavedState(
      makeState([makeAssessment("id-2", "Two")], "id-2"),
    );
    let back = await adapter.readSavedState();
    expect(back!.assessments.map((x) => x.id).sort()).toEqual(["id-1", "id-2"]);
    // explicit: deleteIds removes
    await adapter.writeSavedState(
      makeState([makeAssessment("id-2", "Two")], "id-2"),
      {
        deleteIds: ["id-1"],
      },
    );
    back = await adapter.readSavedState();
    expect(back!.assessments.map((x) => x.id)).toEqual(["id-2"]);
    adapter.close();
  });

  it("merge-on-write: a stale flush neither reverts newer edits nor deletes another client's new assessment", async () => {
    const a1 = makeAssessment("id-1", "One", "2026-07-05T10:00:00.000Z");
    const clientA = await open();
    await clientA.writeSavedState(makeState([a1], "id-1"));
    // client B (same origin/db): edits id-1 with NEWER updatedAt and creates id-2
    const clientB = await open();
    const a1Newer = makeAssessment(
      "id-1",
      "One-edited",
      "2026-07-05T11:00:00.000Z",
    );
    await clientB.writeSavedState(
      makeState([a1Newer, makeAssessment("id-2", "Two")], "id-2"),
    );
    // client A flushes its STALE whole state (old id-1 copy, no id-2)
    await clientA.writeSavedState(makeState([a1], "id-1"));
    const back = await clientA.readSavedState();
    const one = back!.assessments.find((x) => x.id === "id-1")!;
    expect(one.name).toBe("One-edited"); // newer copy not reverted
    expect(back!.assessments.some((x) => x.id === "id-2")).toBe(true); // not deleted
    clientA.close();
    clientB.close();
  });

  it("refuses newer stateSchemaVersion on read with a stateSchemaVersion error", async () => {
    const adapter = await open();
    await adapter.writeSavedState({
      ...makeState([makeAssessment("id-1", "One")], "id-1"),
      stateSchemaVersion: 99 as 1,
    });
    await expect(adapter.readSavedState()).rejects.toThrow(
      /stateSchemaVersion 99/,
    );
    adapter.close();
  });

  it("records and returns lastExportAt per assessment", async () => {
    const adapter = await open();
    expect(await adapter.getLastExportAt("id-1")).toBeNull();
    await adapter.recordExport("id-1", "2026-07-05T12:00:00.000Z");
    expect(await adapter.getLastExportAt("id-1")).toBe(
      "2026-07-05T12:00:00.000Z",
    );
    adapter.close();
  });

  it("stamps stateSchemaVersion 2 for a metadata-only assessment (no requirementProgress)", async () => {
    const adapter = await open();
    const metadataOnly: Assessment = {
      ...makeAssessment("id-1", "One"),
      organizationName: "Acme Corp",
    };
    await adapter.writeSavedState(makeState([metadataOnly], "id-1"));
    const back = await adapter.readSavedState();
    expect(back!.stateSchemaVersion).toBe(2);
    adapter.close();
  });

  it("dumpRaw returns JSON of all records even with unsupported schema", async () => {
    const adapter = await open();
    await adapter.writeSavedState({
      ...makeState([makeAssessment("id-1", "One")], "id-1"),
      stateSchemaVersion: 99 as 1,
    });
    const raw = JSON.parse(await adapter.dumpRaw());
    expect(raw.state.stateSchemaVersion).toBe(99);
    expect(raw.assessments).toHaveLength(1);
    adapter.close();
  });
});
