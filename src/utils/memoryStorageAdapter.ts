import type { Assessment, SavedState, ExtensionData } from "../types/types";
import {
  ForwardCompatError,
  assertSupportedStateSchemaVersion,
  hasV2Content,
  WIDGET_MAX_STATE_SCHEMA_VERSION,
} from "./stateSchema";
import { newId } from "./storage";
import type {
  RevisionReason,
  RevisionRecord,
  StorageAdapter,
  StorageBackend,
  WriteOptions,
} from "./storageTypes";
import { MAX_REVISIONS_PER_ASSESSMENT } from "./storageTypes";
import type { ScopeTemplate } from "./scopeTree";

/** In-memory fallback: used when indexedDB.open fails. Single-tab
 *  semantics — callers must skip Web Locks/BroadcastChannel wiring when
 *  backend === "memory"; the save-status chip surfaces the limitation. */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly backend: StorageBackend = "memory";
  private state: SavedState | null = null;
  private revisions: RevisionRecord[] = [];
  private lastExport = new Map<string, string>();
  private seq = 0;
  private scopeTemplates: ScopeTemplate[] = [];
  private extensions: ExtensionData[] = [];

  async init(): Promise<void> {
    // Best effort: show existing localStorage data, but never set the import
    // marker — memory is ephemeral and must not strand the durable copy.
    try {
      const raw = localStorage.getItem("pkimm-sa");
      if (raw) {
        const parsed = JSON.parse(raw) as SavedState;
        assertSupportedStateSchemaVersion(
          parsed.stateSchemaVersion,
          "Saved state",
        );
        this.state = parsed;
      }
    } catch (err) {
      if (err instanceof ForwardCompatError) throw err;
      // unreadable localStorage: start empty
    }
  }

  async readSavedState(): Promise<SavedState | null> {
    return this.state ? structuredClone(this.state) : null;
  }

  /** Merge-on-write, matching the IndexedDB adapter: upserts incoming
   *  assessments, keeps stored ones absent from `state.assessments`, and
   *  deletes only `opts.deleteIds` (purging their revisions). Memory is
   *  single-tab — no other writer can ever observe a stale copy — so unlike
   *  the IndexedDB adapter this needs no delete tombstones or write lock. */
  async writeSavedState(
    state: SavedState,
    opts: WriteOptions = {},
  ): Promise<void> {
    // Read the STORED (authoritative) version once, before it's overwritten
    // below — mirrors the IndexedDB adapter's migrate-on-write guard.
    const migratingFromV1 = this.state?.stateSchemaVersion === 1;
    // A write that carries v2-only content (requirementProgress, v2
    // metadata, pkiEnvironment, workspace, or actionPlans) is v2 content
    // regardless of the incoming stamp — mirrors the IndexedDB adapter's
    // content-aware stamp so a debounced create+edit write can never
    // persist v2 content under a v1 stamp.
    const writeHasV2Content = state.assessments.some(hasV2Content);
    const deleted = new Set(opts.deleteIds ?? []);
    if (deleted.size > 0) {
      this.revisions = this.revisions.filter(
        (r) => !deleted.has(r.assessmentId),
      );
    }
    const incoming = state.assessments.filter((a) => !deleted.has(a.id));
    const incomingIds = new Set(incoming.map((a) => a.id));
    const storedOnly = (this.state?.assessments ?? []).filter(
      (a) => !deleted.has(a.id) && !incomingIds.has(a.id),
    );
    const merged = incoming.map((a) => {
      const stored = this.state?.assessments.find((s) => s.id === a.id);
      return stored && stored.meta.updatedAt > a.meta.updatedAt ? stored : a;
    });
    if (migratingFromV1) {
      for (const a of incoming) {
        const stored = this.state?.assessments.find((s) => s.id === a.id);
        await this.snapshotRevision(stored ?? a, "pre-migration");
      }
    }
    // Force the stamp up to WIDGET_MAX_STATE_SCHEMA_VERSION when migrating a
    // genuinely-stored v1 record OR when the write carries v2 content
    // (requirementProgress, v2 metadata, pkiEnvironment, workspace, or
    // actionPlans); otherwise echo the incoming version verbatim (including
    // unsupported/newer versions, so ForwardCompatRefusal's raw-download
    // path stays honest — a 99-stamped state can never carry v2 content, so
    // writeHasV2Content is unreachable for it).
    const stateSchemaVersion =
      migratingFromV1 || writeHasV2Content
        ? WIDGET_MAX_STATE_SCHEMA_VERSION
        : state.stateSchemaVersion;
    this.state = structuredClone({
      stateSchemaVersion,
      activeId: state.activeId,
      assessments: [...merged, ...storedOnly],
    });
  }

  async recordExport(assessmentId: string, at: string): Promise<void> {
    this.lastExport.set(assessmentId, at);
  }

  async getLastExportAt(assessmentId: string): Promise<string | null> {
    return this.lastExport.get(assessmentId) ?? null;
  }

  async snapshotRevision(a: Assessment, reason: RevisionReason): Promise<void> {
    this.seq += 1;
    this.revisions.push({
      revId: newId(),
      assessmentId: a.id,
      reason,
      createdAt: new Date().toISOString(),
      seq: this.seq,
      assessment: structuredClone(a),
    });
    const mine = this.revisions
      .filter((r) => r.assessmentId === a.id)
      .sort((x, y) => x.seq - y.seq);
    while (mine.length > MAX_REVISIONS_PER_ASSESSMENT) {
      const oldest = mine.shift()!;
      this.revisions = this.revisions.filter((r) => r.revId !== oldest.revId);
    }
  }

  async listRevisions(assessmentId: string): Promise<RevisionRecord[]> {
    return this.revisions
      .filter((r) => r.assessmentId === assessmentId)
      .sort((x, y) => y.seq - x.seq)
      .map((r) => structuredClone(r));
  }

  async restoreRevision(revId: string): Promise<Assessment> {
    const rev = this.revisions.find((r) => r.revId === revId);
    if (!rev) throw new Error(`Revision ${revId} not found`);
    const current = this.state?.assessments.find(
      (a) => a.id === rev.assessmentId,
    );
    if (current) await this.snapshotRevision(current, "pre-restore");
    const restored: Assessment = {
      ...structuredClone(rev.assessment),
      meta: { ...rev.assessment.meta, updatedAt: new Date().toISOString() },
    };
    // Upsert — must match the IndexedDB adapter's unconditional put: a restore
    // must never silently drop the assessment when state is empty or the id
    // is no longer listed.
    if (!this.state) {
      this.state = {
        stateSchemaVersion: 1,
        activeId: restored.id,
        assessments: [restored],
      };
    } else {
      const exists = this.state.assessments.some((a) => a.id === restored.id);
      this.state = {
        ...this.state,
        assessments: exists
          ? this.state.assessments.map((a) =>
              a.id === restored.id ? restored : a,
            )
          : [...this.state.assessments, restored],
      };
    }
    return restored;
  }

  async listScopeTemplates(): Promise<ScopeTemplate[]> {
    return this.scopeTemplates.map((t) => ({ ...t }));
  }

  async saveScopeTemplate(t: ScopeTemplate): Promise<void> {
    this.scopeTemplates = [
      ...this.scopeTemplates.filter((x) => x.id !== t.id),
      { ...t },
    ];
  }

  async deleteScopeTemplate(id: string): Promise<void> {
    this.scopeTemplates = this.scopeTemplates.filter((x) => x.id !== id);
  }

  async listExtensions(): Promise<ExtensionData[]> {
    return this.extensions.map((e) => ({ ...e }));
  }

  async saveExtension(ext: ExtensionData): Promise<void> {
    this.extensions = [
      ...this.extensions.filter((x) => x.extension.id !== ext.extension.id),
      { ...ext },
    ];
  }

  async deleteExtension(id: string): Promise<void> {
    this.extensions = this.extensions.filter((x) => x.extension.id !== id);
  }

  async dumpRaw(): Promise<string> {
    return JSON.stringify(
      { state: this.state, revisions: this.revisions },
      null,
      2,
    );
  }

  close(): void {
    // nothing to release
  }
}
