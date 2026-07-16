import type { StorageBackend } from "./storageTypes";
import type { ExportNudge } from "./durability";

export interface SaveStatusInput {
  backend: StorageBackend | null;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: "quota" | "write-failed" | null;
  exportNudge: ExportNudge;
}

export interface SaveStatusView {
  kind: "idle" | "saving" | "saved" | "warning" | "error";
  /** Full sentence — shown as the chip's tooltip/aria description. */
  message: string;
  /** Compact label rendered in the header chip so the row stays small. */
  short: string;
}

const timeLabel = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const deriveSaveStatus = (i: SaveStatusInput): SaveStatusView => {
  if (i.saveError === "quota") {
    return {
      kind: "error",
      short: "Storage full",
      message:
        "Browser storage is full — export your assessment now to keep your work.",
    };
  }
  if (i.saveError === "write-failed") {
    return {
      kind: "error",
      short: "Save failed",
      message: "Saving failed — export your assessment to keep your work.",
    };
  }
  if (i.exportNudge === "strong") {
    return {
      kind: "error",
      short: "Back up now",
      message:
        "This browser may evict stored data — export your assessment to a file.",
    };
  }
  if (i.backend === "memory") {
    return {
      kind: "warning",
      short: "Memory only",
      message:
        "Browser storage is unavailable — work is kept in memory only. Export to keep it.",
    };
  }
  if (i.exportNudge === "gentle") {
    return {
      kind: "warning",
      short: "Unsaved backup",
      message: "You have unexported changes — consider downloading a backup.",
    };
  }
  if (i.isSaving)
    return { kind: "saving", short: "Saving…", message: "Saving…" };
  if (i.lastSavedAt) {
    const label = `Saved · ${timeLabel(i.lastSavedAt)}`;
    return { kind: "saved", short: label, message: label };
  }
  return { kind: "idle", short: "", message: "" };
};
