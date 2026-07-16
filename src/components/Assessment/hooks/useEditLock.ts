import { useCallback, useEffect, useRef, useState } from "react";
import { acquireEditLock, type EditLockHandle } from "../../../utils/tabSync";
import type { StorageBackend } from "../../../utils/storageAdapter";

export interface EditLock {
  activeLockedByOtherTab: boolean;
  withRowLock: (id: string, fn: () => void | Promise<void>) => Promise<void>;
}

export const useEditLock = (input: {
  activeId: string | undefined;
  storageBackend: StorageBackend | null;
}): EditLock => {
  const { activeId, storageBackend } = input;

  const [activeLockedByOtherTab, setActiveLockedByOtherTab] = useState(false);
  const editLockRef = useRef<EditLockHandle | null>(null);

  useEffect(() => {
    setActiveLockedByOtherTab(false);
    if (storageBackend !== "indexeddb") return;
    const id = activeId;
    if (!id || id.startsWith("transient-")) return;
    let cancelled = false;
    void acquireEditLock(id).then((handle) => {
      if (cancelled) {
        handle?.release();
        return;
      }
      if (handle) editLockRef.current = handle;
      else setActiveLockedByOtherTab(true);
    });
    return () => {
      cancelled = true;
      editLockRef.current?.release();
      editLockRef.current = null;
    };
  }, [activeId, storageBackend]);

  const withRowLock = useCallback(
    async (id: string, fn: () => void | Promise<void>): Promise<void> => {
      if (id === activeId) {
        if (activeLockedByOtherTab) return;
        await fn();
        return;
      }
      if (storageBackend !== "indexeddb") {
        await fn();
        return;
      }
      const handle = await acquireEditLock(id);
      if (!handle) {
        globalThis.alert(
          "This assessment is being edited in another tab. Close it there first.",
        );
        return;
      }
      try {
        await fn();
      } finally {
        handle.release();
      }
    },
    [activeId, activeLockedByOtherTab, storageBackend],
  );

  return { activeLockedByOtherTab, withRowLock };
};
