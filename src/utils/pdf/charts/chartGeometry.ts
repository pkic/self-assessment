import type { LevelDistributionRow } from "../../reportData";

export type DistSegmentKey =
  "na" | "not-assessed" | "l1" | "l2" | "l3" | "l4" | "l5";

export interface StackSegment {
  key: DistSegmentKey;
  pct: number;
  count: number;
  color: string;
}

// Neutral fills for N/A + Not-Assessed; L1–L5 come from getColorForLevel at
// render time. Text over these must be dark (see distSegmentColor caller).
export const distSegmentColor = (
  key: DistSegmentKey,
  levelColor: (n: number) => string,
): string => {
  if (key === "na") return "rgba(0,0,0,0.18)";
  if (key === "not-assessed") return "rgba(0,0,0,0.32)";
  return levelColor(Number(key.slice(1)));
};

export const stackSegments = (
  row: Pick<
    LevelDistributionRow,
    "notApplicable" | "notAssessed" | "levels" | "totalApplicable"
  >,
  levelColor: (n: number) => string = () => "",
): StackSegment[] => {
  const total =
    row.notApplicable + row.notAssessed + row.levels.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const out: StackSegment[] = [];
  const push = (key: DistSegmentKey, count: number) => {
    if (count > 0)
      out.push({
        key,
        pct: (count / total) * 100,
        count,
        color: distSegmentColor(key, levelColor),
      });
  };
  push("na", row.notApplicable);
  push("not-assessed", row.notAssessed);
  ([1, 2, 3, 4, 5] as const).forEach((n) =>
    push(`l${n}` as DistSegmentKey, row.levels[n - 1]),
  );
  return out;
};

export const ringArc = (
  fraction: number,
  radius: number,
): { arcLen: number; circumference: number } => {
  const circumference = 2 * Math.PI * radius;
  const f = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
  return { arcLen: circumference * f, circumference };
};
