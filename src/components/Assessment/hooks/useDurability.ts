import { useEffect, useState } from "react";
import { getPersisted, getStorageEstimate } from "../../../utils/durability";
import { getStorageAdapter } from "../../../utils/storageAdapter";

export interface Durability {
  persisted: boolean | null;
  storageEstimate: { usage: number; quota: number } | null;
  activeLastExportAt: string | null;
  setActiveLastExportAt: (v: string | null) => void;
}

export const useDurability = (input: {
  activeId: string | undefined;
  lastSavedAt: string | null;
}): Durability => {
  const { activeId, lastSavedAt } = input;

  const [activeLastExportAt, setActiveLastExportAt] = useState<string | null>(
    null,
  );
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  useEffect(() => {
    void getPersisted().then(setPersisted);
    void getStorageEstimate().then(setStorageEstimate);
    const id = activeId;
    if (!id) {
      setActiveLastExportAt(null);
      return;
    }
    void getStorageAdapter()
      .then((a) => a.getLastExportAt(id))
      .then(setActiveLastExportAt)
      .catch(() => setActiveLastExportAt(null));
  }, [activeId, lastSavedAt]);

  return {
    persisted,
    storageEstimate,
    activeLastExportAt,
    setActiveLastExportAt,
  };
};
