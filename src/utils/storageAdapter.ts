import { openDB, type IDBPDatabase, type IDBPTransaction } from "idb";
import type { Assessment, SavedState, ExtensionData } from "../types/types";
import {
  assertSupportedStateSchemaVersion,
  hasV2Content,
  WIDGET_MAX_STATE_SCHEMA_VERSION,
} from "./stateSchema";
import { newId } from "./storage";
import type { ScopeTemplate } from "./scopeTree";
import type {
  RevisionReason,
  RevisionRecord,
  StorageAdapter,
  StorageBackend,
  WriteOptions,
} from "./storageTypes";
import {
  DB_NAME,
  DB_STRUCTURAL_VERSION,
  IDB_IMPORT_MARKER,
  MAX_REVISIONS_PER_ASSESSMENT,
  TIMER_REVISION_INTERVAL_MS,
  TOMBSTONE_TTL_MS,
} from "./storageTypes";

// Single import surface for all callers/tests:
export * from "./storageTypes";

interface MetaStateRecord {
  stateSchemaVersion: number;
  activeId: string | null;
  order: string[];
}

// With an untyped DB, db.transaction() yields
// IDBPTransaction<unknown, string[], Mode> — tuple generics do not compile.
type RWTx = IDBPTransaction<unknown, string[], "readwrite">;

export class IndexedDBAdapter implements StorageAdapter {
  readonly backend: StorageBackend = "indexeddb";
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_STRUCTURAL_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("assessments")) {
          db.createObjectStore("assessments", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
        if (!db.objectStoreNames.contains("revisions")) {
          const rev = db.createObjectStore("revisions", { keyPath: "revId" });
          rev.createIndex("byAssessment", "assessmentId");
        }
      },
      blocked() {
        console.warn("pkimm-sa IndexedDB open blocked by another connection");
      },
    });
    this.db.onversionchange = () => this.close();
    await this.importFromLocalStorageOnce();
  }

  private requireDb(): IDBPDatabase {
    if (!this.db) throw new Error("StorageAdapter used before init()");
    return this.db;
  }

  /** One-time, NON-DESTRUCTIVE import: localStorage["pkimm-sa"] is
   *  copied into IndexedDB exactly once; the original is never touched. */
  private async importFromLocalStorageOnce(): Promise<void> {
    const db = this.requireDb();
    const existing = (await db.get("meta", "state")) as
      MetaStateRecord | undefined;
    if (existing) return;
    let raw: string | null = null;
    let marker: string | null = null;
    try {
      raw = localStorage.getItem("pkimm-sa");
      marker = localStorage.getItem(IDB_IMPORT_MARKER);
    } catch {
      return; // localStorage unavailable — nothing to import
    }
    if (!raw || marker) return;
    const parsed = JSON.parse(raw) as SavedState;
    // Newer data than this widget: throw so the caller shows
    // ForwardCompatRefusal — the factory must NOT fall back to memory.
    assertSupportedStateSchemaVersion(parsed.stateSchemaVersion, "Saved state");
    await this.writeSavedState(parsed);
    try {
      localStorage.setItem(IDB_IMPORT_MARKER, new Date().toISOString());
    } catch {
      // marker is best-effort; worst case we re-import identical data
    }
  }

  async readSavedState(): Promise<SavedState | null> {
    const db = this.requireDb();
    const meta = (await db.get("meta", "state")) as MetaStateRecord | undefined;
    if (!meta) return null;
    assertSupportedStateSchemaVersion(meta.stateSchemaVersion, "Saved state");
    const all = (await db.getAll("assessments")) as Assessment[];
    const byId = new Map(all.map((a) => [a.id, a]));
    const ordered: Assessment[] = [];
    for (const id of meta.order) {
      const a = byId.get(id);
      if (a) {
        ordered.push(a);
        byId.delete(id);
      }
    }
    ordered.push(...byId.values());
    return {
      stateSchemaVersion:
        meta.stateSchemaVersion as SavedState["stateSchemaVersion"],
      activeId: meta.activeId,
      assessments: ordered,
    };
  }

  /** Merge-on-write: upsert-only unless explicitly deleted; a stored
   *  copy with a newer meta.updatedAt always wins over the incoming one.
   *  Deleted ids are tombstoned (see `deletions` in the meta store) so a
   *  stale full-array flush from another tab cannot resurrect them. */
  async writeSavedState(
    state: SavedState,
    opts: WriteOptions = {},
  ): Promise<void> {
    const db = this.requireDb();
    const tx = db.transaction(
      ["assessments", "meta", "revisions"],
      "readwrite",
    );
    const store = tx.objectStore("assessments");
    // Read the STORED (authoritative) version once, before meta is
    // overwritten below — this is the migrate-on-write guard. Keying off the
    // incoming state's own stateSchemaVersion would let a legacy caller that
    // never bumped its in-memory copy re-trigger the snapshot on every write.
    const storedMeta = (await tx.objectStore("meta").get("state")) as
      MetaStateRecord | undefined;
    const migratingFromV1 = storedMeta?.stateSchemaVersion === 1;
    // A write that carries v2-only content (requirementProgress, v2
    // metadata, pkiEnvironment, workspace, or actionPlans) is v2 content
    // regardless of the incoming stamp — a debounced write that batches
    // assessment creation with such an edit must never persist it under a
    // v1 stamp (a rolled-back widget would silently ignore it).
    const writeHasV2Content = state.assessments.some(hasV2Content);
    const deleted = new Set(opts.deleteIds ?? []);
    const deletions =
      ((await tx.objectStore("meta").get("deletions")) as
        Record<string, string> | undefined) ?? {};
    for (const id of deleted) {
      await store.delete(id);
      await this.purgeRevisions(tx, id);
      deletions[id] = new Date().toISOString();
    }
    const skippedByTombstone = new Set<string>();
    for (const a of state.assessments) {
      if (deleted.has(a.id)) continue;
      const tomb = deletions[a.id];
      if (tomb && tomb > a.meta.updatedAt) {
        skippedByTombstone.add(a.id);
        continue; // a delete strictly newer than this copy wins
      }
      // A same-millisecond tie (tomb === updatedAt) favors the incoming
      // write: `Date.toISOString()` only has millisecond resolution, so a
      // delete followed immediately by a legitimate reimport (updatedAt
      // bumped to "now" per the stored-newer-wins convention below) can
      // land in the same tick as the tombstone. Rejecting the tie would
      // silently drop that reimport. A genuinely stale flush is still
      // caught because its stored updatedAt predates the delete, i.e.
      // tomb > updatedAt strictly.
      const stored = (await store.get(a.id)) as Assessment | undefined;
      if (stored && stored.meta.updatedAt > a.meta.updatedAt) continue; // theirs is newer
      const changed = !stored || stored.meta.updatedAt !== a.meta.updatedAt;
      // Snapshot the pre-v2 content (the currently-stored v1 copy if one
      // exists, else the incoming assessment itself) so a rollback to an
      // older widget can still recover the pre-migration data.
      if (migratingFromV1) {
        await this.putRevision(tx, stored ?? a, "pre-migration");
      }
      await store.put(a);
      if (changed) await this.maybeTimerSnapshot(tx, a);
      if (tomb) delete deletions[a.id]; // legitimately newer write supersedes the tombstone
    }
    for (const [id, at] of Object.entries(deletions)) {
      if (Date.now() - Date.parse(at) > TOMBSTONE_TTL_MS) delete deletions[id];
    }
    await tx.objectStore("meta").put(deletions, "deletions");
    const localOrder = state.assessments
      .map((a) => a.id)
      .filter((id) => !deleted.has(id) && !skippedByTombstone.has(id));
    const known = new Set(localOrder);
    const storedIds = new Set((await store.getAllKeys()).map(String));
    const order = [
      ...localOrder.filter((id) => storedIds.has(id)),
      ...[...storedIds].filter((id) => !known.has(id)),
    ];
    // Force the stamp up to WIDGET_MAX_STATE_SCHEMA_VERSION when migrating a
    // genuinely-stored v1 record OR when the write itself carries v2
    // content (requirementProgress, v2 metadata, pkiEnvironment, workspace,
    // or actionPlans). Otherwise echo the incoming state.stateSchemaVersion
    // unchanged — including versions newer than this widget understands,
    // which must round-trip verbatim so ForwardCompatRefusal's raw-download
    // path stays honest. A stateSchemaVersion: 99 state can never carry v2
    // content (it's refused on read and thus never editable by this
    // widget), so writeHasV2Content is unreachable for it and 99 still
    // echoes verbatim.
    const stateSchemaVersion =
      migratingFromV1 || writeHasV2Content
        ? WIDGET_MAX_STATE_SCHEMA_VERSION
        : state.stateSchemaVersion;
    const meta: MetaStateRecord = {
      stateSchemaVersion,
      activeId: state.activeId,
      order,
    };
    await tx.objectStore("meta").put(meta, "state");
    await tx.done;
  }

  async recordExport(assessmentId: string, at: string): Promise<void> {
    await this.requireDb().put("meta", at, `lastExport:${assessmentId}`);
  }

  async getLastExportAt(assessmentId: string): Promise<string | null> {
    const v = (await this.requireDb().get(
      "meta",
      `lastExport:${assessmentId}`,
    )) as string | undefined;
    return v ?? null;
  }

  /** Timer snapshots fire only for CHANGED assessments (caller filters) and
   *  skip when the newest revision already captures this exact updatedAt —
   *  idle assessments never churn their ring and can't evict safety-net
   *  snapshots (pre-migration/pre-restore). */
  private async maybeTimerSnapshot(tx: RWTx, a: Assessment): Promise<void> {
    if (a.id.startsWith("transient-")) return;
    const revs = (await tx
      .objectStore("revisions")
      .index("byAssessment")
      .getAll(a.id)) as RevisionRecord[];
    const newest = revs.reduce<RevisionRecord | null>(
      (m, r) => (!m || r.seq > m.seq ? r : m),
      null,
    );
    if (newest && newest.assessment.meta.updatedAt === a.meta.updatedAt) return;
    const due =
      !newest ||
      Date.now() - Date.parse(newest.createdAt) >= TIMER_REVISION_INTERVAL_MS;
    if (due) await this.putRevision(tx, a, "timer", revs);
  }

  /** Deletes every revision belonging to an assessment, within the caller's
   *  transaction — called when the assessment itself is deleted so no
   *  snapshot of it can outlive it or be used to restore it. */
  private async purgeRevisions(tx: RWTx, assessmentId: string): Promise<void> {
    const idx = tx.objectStore("revisions").index("byAssessment");
    const revIds = await idx.getAllKeys(assessmentId);
    for (const revId of revIds) {
      await tx.objectStore("revisions").delete(revId);
    }
  }

  private async putRevision(
    tx: RWTx,
    a: Assessment,
    reason: RevisionReason,
    existing?: RevisionRecord[],
  ): Promise<void> {
    const store = tx.objectStore("revisions");
    const revs =
      existing ??
      ((await store.index("byAssessment").getAll(a.id)) as RevisionRecord[]);
    const maxSeq = revs.reduce((m, r) => Math.max(m, r.seq), 0);
    const rec: RevisionRecord = {
      revId: newId(),
      assessmentId: a.id,
      reason,
      createdAt: new Date().toISOString(),
      seq: maxSeq + 1,
      assessment: structuredClone(a),
    };
    await store.put(rec);
    const bySeq = [...revs, rec].sort((x, y) => x.seq - y.seq);
    while (bySeq.length > MAX_REVISIONS_PER_ASSESSMENT) {
      const oldest = bySeq.shift()!;
      await store.delete(oldest.revId);
    }
  }

  async snapshotRevision(a: Assessment, reason: RevisionReason): Promise<void> {
    const tx = this.requireDb().transaction(
      ["assessments", "meta", "revisions"],
      "readwrite",
    );
    await this.putRevision(tx, a, reason);
    await tx.done;
  }

  async listRevisions(assessmentId: string): Promise<RevisionRecord[]> {
    const revs = (await this.requireDb().getAllFromIndex(
      "revisions",
      "byAssessment",
      assessmentId,
    )) as RevisionRecord[];
    return revs.sort((x, y) => y.seq - x.seq); // newest first, deterministic
  }

  async restoreRevision(revId: string): Promise<Assessment> {
    const db = this.requireDb();
    const rev = (await db.get("revisions", revId)) as
      RevisionRecord | undefined;
    if (!rev) throw new Error(`Revision ${revId} not found`);
    const tx = db.transaction(
      ["assessments", "meta", "revisions"],
      "readwrite",
    );
    const current = (await tx
      .objectStore("assessments")
      .get(rev.assessmentId)) as Assessment | undefined;
    if (current) await this.putRevision(tx, current, "pre-restore");
    const restored: Assessment = {
      ...structuredClone(rev.assessment),
      meta: { ...rev.assessment.meta, updatedAt: new Date().toISOString() },
    };
    await tx.objectStore("assessments").put(restored);
    await tx.done;
    return restored;
  }

  async listScopeTemplates(): Promise<ScopeTemplate[]> {
    const v = (await this.requireDb().get("meta", "scopeTemplates")) as
      ScopeTemplate[] | undefined;
    return v ?? [];
  }

  async saveScopeTemplate(t: ScopeTemplate): Promise<void> {
    const list = await this.listScopeTemplates();
    const next = [...list.filter((x) => x.id !== t.id), t];
    await this.requireDb().put("meta", next, "scopeTemplates");
  }

  async deleteScopeTemplate(id: string): Promise<void> {
    const list = await this.listScopeTemplates();
    await this.requireDb().put(
      "meta",
      list.filter((x) => x.id !== id),
      "scopeTemplates",
    );
  }

  async listExtensions(): Promise<ExtensionData[]> {
    const v = (await this.requireDb().get("meta", "extensions")) as
      ExtensionData[] | undefined;
    return v ?? [];
  }

  async saveExtension(ext: ExtensionData): Promise<void> {
    const list = await this.listExtensions();
    const next = [
      ...list.filter((x) => x.extension.id !== ext.extension.id),
      ext,
    ];
    await this.requireDb().put("meta", next, "extensions");
  }

  async deleteExtension(id: string): Promise<void> {
    const list = await this.listExtensions();
    await this.requireDb().put(
      "meta",
      list.filter((x) => x.extension.id !== id),
      "extensions",
    );
  }

  async dumpRaw(): Promise<string> {
    const db = this.requireDb();
    const [state, assessments, revisions, metaKeys] = await Promise.all([
      db.get("meta", "state"),
      db.getAll("assessments"),
      db.getAll("revisions"),
      db.getAllKeys("meta"),
    ]);
    const meta: Record<string, unknown> = {};
    for (const k of metaKeys) meta[String(k)] = await db.get("meta", k);
    return JSON.stringify({ state, meta, assessments, revisions }, null, 2);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

import { MemoryStorageAdapter } from "./memoryStorageAdapter";
import { ForwardCompatError } from "./stateSchema";

let singleton: Promise<StorageAdapter> | null = null;

const createAdapter = async (): Promise<StorageAdapter> => {
  if (typeof indexedDB !== "undefined") {
    const idbAdapter = new IndexedDBAdapter();
    try {
      await idbAdapter.init();
      return idbAdapter;
    } catch (err) {
      idbAdapter.close();
      // Newer saved data must surface ForwardCompatRefusal — falling back to
      // memory would show an empty widget over the user's real data.
      if (err instanceof ForwardCompatError) throw err;
      console.warn("IndexedDB unavailable, using in-memory storage:", err);
    }
  }
  const memory = new MemoryStorageAdapter();
  await memory.init();
  return memory;
};

export const getStorageAdapter = (): Promise<StorageAdapter> => {
  singleton ??= createAdapter();
  return singleton;
};

export const resetStorageAdapterForTests = (): void => {
  singleton = null;
};
