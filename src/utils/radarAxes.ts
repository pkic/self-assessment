import { ModuleData, ProgressData, RequirementProgress } from "../types/types";
import { calculateEffectiveCategoryLevel } from "./effectiveLevel";

/** Filters the radar chart's axis list down to categories that are NOT
 *  explicit/derived Not Applicable (baseline `display === -1`). This must be
 *  the single place the axis list is filtered — every dataset built for the
 *  chart (the achieved-level series, every extension series, and the display
 *  labels) should derive from this same returned array so they can never
 *  drift out of alignment with each other.
 *
 *  A Not-Assessed category (level 0, still applicable) is retained: 0 is a
 *  meaningful "not yet assessed" axis point, distinct from N/A which has no
 *  meaningful position on the chart at all.
 *
 *  Keys that don't resolve to a known module/category are kept as-is —
 *  dropping unrecognized labels is not this helper's job. */
export const buildRadarAxes = (
  modules: ModuleData[],
  chartLabels: string[],
  progress: Record<string, ProgressData>,
  requirementProgress: Record<string, RequirementProgress> | undefined,
): string[] =>
  chartLabels.filter((label) => {
    const [moduleId, categoryId] = label.split(".");
    const category = modules
      .find((m) => m.id === moduleId)
      ?.categories.find((c) => c.id === categoryId);
    if (!category) return true;
    const eff = calculateEffectiveCategoryLevel(
      moduleId,
      category,
      progress,
      requirementProgress,
    );
    return eff.display !== -1;
  });
