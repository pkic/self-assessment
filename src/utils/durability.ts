/** Browser storage is not a vault — especially on
 *  WebKit (7-day ITP eviction; persist() is not a guaranteed shield). The
 *  file is the durability source of truth; these helpers drive the nudges. */

export const EXPORT_NUDGE_AFTER_DAYS = 7;

export type ExportNudge = "none" | "gentle" | "strong";

export interface ExportNudgeInput {
  updatedAt: string | null;
  lastExportAt: string | null;
  persisted: boolean | null;
  now: string;
}

export const shouldNudgeExport = ({
  updatedAt,
  lastExportAt,
  persisted,
  now,
}: ExportNudgeInput): ExportNudge => {
  if (!updatedAt) return "none";
  const edited = Date.parse(updatedAt);
  const exported = lastExportAt ? Date.parse(lastExportAt) : null;
  const hasUnexportedChanges = exported === null || edited > exported;
  if (!hasUnexportedChanges) return "none";
  if (persisted === false) return "strong";
  const staleness = Date.parse(now) - (exported ?? edited);
  return staleness / 86_400_000 >= EXPORT_NUDGE_AFTER_DAYS ? "gentle" : "none";
};

export const getPersisted = async (): Promise<boolean | null> => {
  try {
    return (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    return null;
  }
};

export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
} | null> => {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est || est.usage === undefined || est.quota === undefined) return null;
    return { usage: est.usage, quota: est.quota };
  } catch {
    return null;
  }
};

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = n;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(1)} ${units[unit]}`;
};
