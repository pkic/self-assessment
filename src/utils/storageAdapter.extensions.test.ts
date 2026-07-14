import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { IndexedDBAdapter } from "./storageAdapter";
import { MemoryStorageAdapter } from "./memoryStorageAdapter";
import type { StorageAdapter } from "./storageTypes";
import type { ExtensionData } from "../types/types";

beforeEach(() => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

const mkExt = (id: string, version = "1.0.0"): ExtensionData => ({
  schemaVersion: "1.0.0",
  extension: {
    id,
    name: `Ext ${id}`,
    version,
    description: "d",
    compatibility: ["2.0.0"],
  },
  relevance: { modules: [] },
  overlays: { modules: [] },
});

const suites: [string, () => StorageAdapter][] = [
  ["IndexedDBAdapter", () => new IndexedDBAdapter()],
  ["MemoryStorageAdapter", () => new MemoryStorageAdapter()],
];

describe.each(suites)("extension store — %s", (_name, make) => {
  it("round-trips list/save/delete and upserts by id", async () => {
    const a = make();
    await a.init();
    expect(await a.listExtensions()).toEqual([]);
    await a.saveExtension(mkExt("pqc", "1.0.0"));
    await a.saveExtension(mkExt("dnssec"));
    expect(
      (await a.listExtensions()).map((e) => e.extension.id).sort(),
    ).toEqual(["dnssec", "pqc"]);
    // upsert by id (replace, no duplicate)
    await a.saveExtension(mkExt("pqc", "2.0.0"));
    let list = await a.listExtensions();
    expect(list).toHaveLength(2);
    expect(list.find((e) => e.extension.id === "pqc")!.extension.version).toBe(
      "2.0.0",
    );
    await a.deleteExtension("pqc");
    list = await a.listExtensions();
    expect(list.map((e) => e.extension.id)).toEqual(["dnssec"]);
    a.close();
  });
});
