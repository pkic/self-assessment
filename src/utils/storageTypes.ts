import type { Assessment, SavedState, ExtensionData } from "../types/types";
import type { ScopeTemplate } from "./scopeTree";

export type StorageBackend = "indexeddb" | "memory";

export type RevisionReason =
  | "pre-migration"
  | "pre-import" // snapshotted before a v2-import Replace overwrites a same-id local copy
  | "pre-restore"
  | "timer"
  | "pre-merge";

export interface RevisionRecord {
  revId: string;
  assessmentId: string;
  reason: RevisionReason;
  createdAt: string;
  /** Monotonic per-assessment counter — the pruning/order key. createdAt is
   *  display-only (ISO millisecond ties are real under fake-indexeddb). */
  seq: number;
  assessment: Assessment;
}

export interface WriteOptions {
  deleteIds?: string[];
}

export interface StorageAdapter {
  readonly backend: StorageBackend;
  init(): Promise<void>;
  readSavedState(): Promise<SavedState | null>;
  /** Merge-on-write: upserts each assessment; never deletes an assessment
   *  merely because it is absent from `state.assessments` — only ids in
   *  `opts.deleteIds` are removed (along with their revisions). A record
   *  whose stored copy has a newer `meta.updatedAt` is not overwritten.
   *  Deleted ids are tombstoned so a later stale write cannot resurrect
   *  them. */
  writeSavedState(state: SavedState, opts?: WriteOptions): Promise<void>;
  recordExport(assessmentId: string, at: string): Promise<void>;
  getLastExportAt(assessmentId: string): Promise<string | null>;
  snapshotRevision(a: Assessment, reason: RevisionReason): Promise<void>;
  listRevisions(assessmentId: string): Promise<RevisionRecord[]>;
  restoreRevision(revId: string): Promise<Assessment>;
  listScopeTemplates(): Promise<ScopeTemplate[]>;
  saveScopeTemplate(t: ScopeTemplate): Promise<void>;
  deleteScopeTemplate(id: string): Promise<void>;
  listExtensions(): Promise<ExtensionData[]>;
  saveExtension(ext: ExtensionData): Promise<void>;
  deleteExtension(id: string): Promise<void>;
  dumpRaw(): Promise<string>;
  close(): void;
}

export const DB_NAME = "pkimm-sa";
/** Pinned FOREVER: schema evolution is record-level via
 *  stateSchemaVersion; bumping the structural version would break older
 *  widgets' refusal-with-download path. */
export const DB_STRUCTURAL_VERSION = 1;
export const IDB_IMPORT_MARKER = "pkimm-sa-idb-imported";
export const MAX_REVISIONS_PER_ASSESSMENT = 20;
export const TIMER_REVISION_INTERVAL_MS = 30 * 60 * 1000;
/** How long a delete tombstone is retained before pruning. Bounds growth of
 *  the deletions map while comfortably outliving realistic cross-tab drift. */
export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
