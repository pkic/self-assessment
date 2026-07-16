import { useCallback, useEffect, useRef, useState } from "react";
import type { Assessment as SavedAssessment } from "../../../types/types";

export interface ResumePosition {
  view: string;
  tab: string;
  categoryKey?: string;
  requirementKey?: string;
}

export interface ResumeState {
  // Non-null right after an assessment with lastPosition becomes active on
  // load; Assessment consumes it once (sets tab/view, scrolls, shows the
  // toast) then calls consumeRestore to clear it.
  pendingRestore: ResumePosition | null;
  consumeRestore: () => void;
  // Call whenever the user's position changes (tab click, card focus). The
  // write is locally debounced ~600ms so rapid keyboard nav (n/p, focus
  // churn) does not fire onSettle per event — only the settled position is
  // reported once the user stops moving.
  reportPosition: (pos: ResumePosition) => void;
  // Toast copy derived from the restored position; null when no toast is
  // pending. Cleared by dismissToast (auto-dismiss lives in ResumeToast).
  toastMessage: string | null;
  dismissToast: () => void;
}

const SETTLE_MS = 600;

// Derives "Resumed at: {name}" when the requirement/category key resolves
// to a human-readable name the caller can supply (via resolveName), else a
// generic message. Never an ordinal — names stay valid as the model
// changes; positional numbers do not.
const buildToastMessage = (
  pos: ResumePosition,
  name: string | undefined,
): string => (name ? `Resumed at: ${name}` : "Resumed where you left off");

/**
 * Owns the write-on-navigate + restore-on-load state machine for
 * Assessment.lastPosition. Never touches `progress` — callers flush the
 * settled position through their own updateActive/merge-on-write path via
 * onSettle. Transient assessments are guarded by the caller (onSettle is
 * simply not wired to persist for a transient-id active assessment).
 */
export const useResumePosition = (input: {
  activeAssessment: SavedAssessment | null;
  onSettle: (pos: ResumePosition) => void;
  resolveName?: (pos: ResumePosition) => string | undefined;
}): ResumeState => {
  const { activeAssessment, onSettle, resolveName } = input;

  const pendingRef = useRef<ResumePosition | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingRestore, setPendingRestore] = useState<ResumePosition | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const restoredForIdRef = useRef<string | null>(null);

  // Kept current every render so reportPosition (stable identity, see
  // below) always flushes through the latest updateActive-backed callback
  // without needing onSettle in its own deps.
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  const reportPosition = useCallback((pos: ResumePosition): void => {
    pendingRef.current = pos;
    if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      const settled = pendingRef.current;
      pendingRef.current = null;
      if (settled) onSettleRef.current(settled);
    }, SETTLE_MS);
  }, []);

  // Clear any pending settle timer on unmount to avoid firing onSettle
  // after teardown.
  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
    };
  }, []);

  // Restore-on-load: fires once per assessment id when it has a
  // lastPosition and hasn't already been restored this session. Guards
  // against re-firing on every unrelated savedState update (e.g. autosave
  // ticks) by tracking the id it last restored for.
  useEffect(() => {
    const id = activeAssessment?.id ?? null;
    if (!id) return;
    if (restoredForIdRef.current === id) return;
    restoredForIdRef.current = id;
    const pos = activeAssessment?.lastPosition;
    if (!pos) return;
    setPendingRestore(pos);
    const name = resolveName?.(pos);
    setToastMessage(buildToastMessage(pos, name));
  }, [activeAssessment?.id, activeAssessment?.lastPosition, resolveName]);

  const consumeRestore = useCallback((): void => {
    setPendingRestore(null);
  }, []);

  const dismissToast = useCallback((): void => {
    setToastMessage(null);
  }, []);

  return {
    pendingRestore,
    consumeRestore,
    reportPosition,
    toastMessage,
    dismissToast,
  };
};
