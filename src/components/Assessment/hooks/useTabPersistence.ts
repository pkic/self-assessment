import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedState } from "../../../types/types";
import { getStorageAdapter } from "../../../utils/storageAdapter";
import type { StorageBackend } from "../../../utils/storageAdapter";
import { normalizeAssessmentActionPlans } from "../../../utils/actionPlans";
import {
  withWriteLock,
  createTabSync,
  type TabSync,
} from "../../../utils/tabSync";

const normalizeSavedState = (state: SavedState): SavedState => ({
  ...state,
  assessments: state.assessments.map(normalizeAssessmentActionPlans),
});

export interface TabPersistence {
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: "quota" | "write-failed" | null;
  flushPendingWrite: () => Promise<void>;
  notify: () => void;
  markDeleted: (id: string) => void;
  unmarkDeleted: (id: string) => void;
}

export const useTabPersistence = (input: {
  savedState: SavedState;
  setSavedState: React.Dispatch<React.SetStateAction<SavedState>>;
  storageBackend: StorageBackend | null;
  forwardCompatFailure: string | null;
}): TabPersistence => {
  const { savedState, setSavedState, storageBackend, forwardCompatFailure } =
    input;

  // saveError/lastSavedAt/isSaving track the outcome of flushPendingWrite
  // (below); deriveSaveStatus consumes them to drive the SaveStatusChip.
  const [saveError, setSaveError] = useState<"quota" | "write-failed" | null>(
    null,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingStateRef = useRef<SavedState | null>(null);
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
  const missedExternalRef = useRef(false);
  const tabSyncRef = useRef<TabSync | null>(null);
  const persistRequestedRef = useRef(false);

  const flushPendingWrite = useCallback(async (): Promise<void> => {
    const state = pendingStateRef.current;
    if (!state) return;
    pendingStateRef.current = null;
    const deleteIds = [...pendingDeleteIdsRef.current];
    pendingDeleteIdsRef.current.clear();
    setIsSaving(true);
    try {
      const adapter = await getStorageAdapter();
      await withWriteLock(() => adapter.writeSavedState(state, { deleteIds }));
      tabSyncRef.current?.notify();
      setSaveError(null);
      setLastSavedAt(new Date().toISOString());
      if (!persistRequestedRef.current) {
        persistRequestedRef.current = true;
        void navigator.storage?.persist?.().catch(() => undefined);
      }
      // If another tab notified while we were dirty, catch up now — the DB
      // holds the merged union after our merge-on-write.
      if (missedExternalRef.current && !pendingStateRef.current) {
        missedExternalRef.current = false;
        const next = await adapter.readSavedState();
        if (next && !pendingStateRef.current)
          setSavedState(normalizeSavedState(next));
      }
    } catch (err) {
      // Keep the local copy authoritative until saved or exported:
      // restore pending state (unless a newer edit already re-armed it).
      pendingStateRef.current ??= state;
      for (const id of deleteIds) pendingDeleteIdsRef.current.add(id);
      const quota = (err as Error).name === "QuotaExceededError";
      setSaveError(quota ? "quota" : "write-failed");
      console.error("Failed to persist assessment state:", err);
    } finally {
      setIsSaving(false);
    }
  }, [setSavedState]);

  // Persist saved state — same skip rules as before (transient-only states
  // never persist), async via the adapter, debounced 300 ms, force-flushed
  // when the page hides. pagehide flush is BEST-EFFORT — a hard tab
  // kill may lose ≤300 ms of edits; the file remains the durability truth.
  useEffect(() => {
    if (forwardCompatFailure) return;
    if (savedState.assessments.length === 0) return;
    const allTransient = savedState.assessments.every((a) =>
      a.id.startsWith("transient-"),
    );
    if (allTransient) return;
    pendingStateRef.current = savedState;
    const handle = setTimeout(() => void flushPendingWrite(), 300);
    return () => clearTimeout(handle);
  }, [savedState, forwardCompatFailure, flushPendingWrite]);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === "hidden") void flushPendingWrite();
    };
    const onPageHide = (): void => void flushPendingWrite();
    document.addEventListener("visibilitychange", onVisibility);
    globalThis.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      globalThis.removeEventListener("pagehide", onPageHide);
    };
  }, [flushPendingWrite]);

  useEffect(() => {
    if (storageBackend !== "indexeddb") return; // memory = single-tab semantics
    const sync = createTabSync(() => {
      if (pendingStateRef.current) {
        missedExternalRef.current = true; // catch up after our flush
        return;
      }
      void (async () => {
        try {
          const adapter = await getStorageAdapter();
          const next = await adapter.readSavedState();
          if (next && !pendingStateRef.current)
            setSavedState(normalizeSavedState(next));
        } catch {
          // ForwardCompat handled by the load path; ignore here.
        }
      })();
    });
    tabSyncRef.current = sync;
    return () => {
      sync.close();
      tabSyncRef.current = null;
    };
  }, [storageBackend, setSavedState]);

  const notify = useCallback((): void => {
    tabSyncRef.current?.notify();
  }, []);

  const markDeleted = useCallback((id: string): void => {
    pendingDeleteIdsRef.current.add(id);
  }, []);

  // Reverses a still-pending (not yet flushed) markDeleted for this id.
  // Needed when an id is reused within the same 300ms debounce window —
  // e.g. deleting an assessment and immediately re-importing an export that
  // preserves that same id (v2 JSON imports do). Without this, the queued
  // deleteIds would still be included in the next flushPendingWrite, and
  // writeSavedState unconditionally skips any incoming assessment whose id
  // is in deleteIds — silently dropping the reimport even though the
  // in-memory savedState (and thus the UI) shows it as present.
  const unmarkDeleted = useCallback((id: string): void => {
    pendingDeleteIdsRef.current.delete(id);
  }, []);

  return {
    isSaving,
    lastSavedAt,
    saveError,
    flushPendingWrite,
    notify,
    markDeleted,
    unmarkDeleted,
  };
};
