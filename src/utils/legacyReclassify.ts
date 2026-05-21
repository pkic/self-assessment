import type { AssessmentData, ProgressData } from "../types/types";
import LevelResult from "../enums/LevelResult";

const normalize = (s: string): string => s.trim().replace(/\s+/g, " ");

const buildLevelOneDescriptions = (source: AssessmentData): Set<string> => {
  const set = new Set<string>();
  for (const m of source.modules) {
    for (const c of m.categories) {
      const lvl1 = c.levels?.find((l) => l.number === 1);
      if (lvl1?.description) set.add(normalize(lvl1.description));
    }
  }
  return set;
};

export const reclassifyUntouchedLevelOne = (
  progress: Record<string, ProgressData>,
  source: AssessmentData,
): { progress: Record<string, ProgressData>; reclassified: number } => {
  const defaults = buildLevelOneDescriptions(source);
  const out: Record<string, ProgressData> = {};
  let reclassified = 0;
  for (const [k, v] of Object.entries(progress)) {
    if (v.level === 1 && defaults.has(normalize(v.description ?? ""))) {
      out[k] = {
        level: 0,
        result: LevelResult[0],
        description: "",
        applicability: v.applicability,
      };
      reclassified += 1;
      continue;
    }
    out[k] = v;
  }
  return { progress: out, reclassified };
};
