// Generic weighted maturity methodology.

import {
  ModuleData,
  ProgressData,
  ExtensionData,
  CategoryData,
} from "../../types/types";
import { calculateEffectiveCategoryLevel } from "../../utils/effectiveLevel";
import type { RequirementProgress } from "../../types/types";
import { registerScoringStrategy, scoreWithStrategy } from "../scoring";
import type { AssessmentProfileData } from "../types";

export type WeightedMaturityParameters = Record<string, unknown>;

export const roundAndBoundWeightedLevel = (
  value: number,
  parameters: WeightedMaturityParameters = {},
): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  let round = Math.floor;
  if (parameters.rounding === "ceil") round = Math.ceil;
  if (parameters.rounding === "round") round = Math.round;
  const minimum =
    typeof parameters.minimumLevel === "number" ? parameters.minimumLevel : 0;
  const maximum =
    typeof parameters.maximumLevel === "number" ? parameters.maximumLevel : 5;
  return Math.min(maximum, Math.max(minimum, round(value)));
};

export const getWeightSum = (
  moduleId: string,
  category: CategoryData,
  extensions: ExtensionData[],
  enabledExtensions: string[],
) => {
  let weightSum = (category.requirements || []).reduce(
    (acc, req) => acc + req.weight,
    0,
  );

  extensions.forEach((ext) => {
    if (enabledExtensions.includes(ext.extension.id) && ext.overlays) {
      const extModule = ext.overlays.modules.find((m) => m.id === moduleId);
      const extCat = extModule?.categories.find((c) => c.id === category.id);

      if (extCat?.requirements && category.requirements) {
        extCat.requirements.forEach((extReq) => {
          const coreReq = category.requirements.find((r) => r.id === extReq.id);
          if (coreReq) {
            let reqWeight = coreReq.weight;
            if (extReq.override !== undefined) {
              reqWeight = extReq.override;
            } else if (extReq.multiplier !== undefined) {
              reqWeight *= extReq.multiplier;
            } else if (extReq.addition !== undefined) {
              reqWeight += extReq.addition;
            }
            // Clamp the effective weight at zero, then add its delta from base.
            weightSum += Math.max(0, reqWeight) - coreReq.weight;
          }
        });
      }
    }
  });

  return weightSum;
};

export const getEffectiveWeight = (
  moduleId: string,
  category: CategoryData,
  extensions: ExtensionData[],
  enabledExtensions: string[],
) => {
  let weight = category.weight;

  extensions.forEach((ext) => {
    if (enabledExtensions.includes(ext.extension.id) && ext.overlays) {
      const extModule = ext.overlays.modules.find((m) => m.id === moduleId);
      const extCat = extModule?.categories.find((c) => c.id === category.id);

      if (extCat) {
        // Apply category-level overlay if it exists
        if (extCat.override !== undefined) {
          weight = extCat.override;
        } else if (extCat.multiplier !== undefined) {
          weight *= extCat.multiplier;
        } else if (extCat.addition !== undefined) {
          weight += extCat.addition;
        }
      }
    }
  });

  return Math.max(0, weight);
};

const calculateWeightedScores = (
  categories: CategoryData[],
  moduleId: string,
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
  requirementProgress?: Record<string, RequirementProgress>,
) => {
  // Per spec, baseline PKI MM maturity is computed from baseline Level_C
  // with the (optionally extension-overlay-adjusted) effective category
  // weight. Blending with extension relevance levels belongs to the
  // dedicated extension calc functions (calculateExtensionMaturityLevels,
  // calculateBlendedLevel), not this baseline rollup.
  //
  // Pass [] / [] for extensions to get a pure baseline view; pass an
  // extension to get the extension-weighted view (Level_C with
  // extension-adjusted weights).
  return categories.reduce(
    (acc, category) => {
      // Baseline context (no extension) — when requirementProgress is
      // undefined this returns exactly the old self-declared integer level.
      const eff = calculateEffectiveCategoryLevel(
        moduleId,
        category,
        progress,
        requirementProgress,
      );
      const categoryLevel = eff.raw;
      // Not Assessed (level 0) and Not Applicable (raw -1) are both excluded
      // from the rollup. Including them as zeros would make a mostly-empty
      // assessment look worse than it is; the visible per-axis value on the
      // chart still reflects level 0 for unrated categories.
      if (categoryLevel > 0) {
        const weight = getEffectiveWeight(
          moduleId,
          category,
          extensions,
          enabledExtensions,
        );
        acc.totalWeight += weight;
        acc.totalWeightedScore += categoryLevel * weight;
      }
      return acc;
    },
    { totalWeight: 0, totalWeightedScore: 0 },
  );
};

// UNFLOORED weighted average across all modules — the same
// totalWeightedScoreSum/totalWeightSum that calculateOverallMaturityLevel
// floors exactly once at the very end. Kept as a standalone function (rather
// than floor-wrapping it below) so a later fractional progress bar can read
// the raw value directly.
export const calculateOverallMaturityRaw = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
  requirementProgress?: Record<string, RequirementProgress>,
): number => {
  let totalWeightSum = 0;
  let totalWeightedScoreSum = 0;

  modules.forEach((module) => {
    const { totalWeight, totalWeightedScore } = calculateWeightedScores(
      module.categories,
      module.id,
      progress,
      extensions,
      enabledExtensions,
      requirementProgress,
    );
    totalWeightSum += totalWeight;
    totalWeightedScoreSum += totalWeightedScore;
  });

  return totalWeightSum ? totalWeightedScoreSum / totalWeightSum : 0;
};

export const calculateOverallMaturityLevel = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
  requirementProgress?: Record<string, RequirementProgress>,
  parameters: WeightedMaturityParameters = {},
): number =>
  roundAndBoundWeightedLevel(
    calculateOverallMaturityRaw(
      modules,
      progress,
      extensions,
      enabledExtensions,
      requirementProgress,
    ),
    parameters,
  );

// UNFLOORED per-module weighted average — same source value that
// calculateModuleMaturityLevels floors exactly once per module.
export const calculateModuleMaturityRaw = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
  requirementProgress?: Record<string, RequirementProgress>,
): { module: string; raw: number }[] => {
  return modules.map((module) => {
    const { totalWeight, totalWeightedScore } = calculateWeightedScores(
      module.categories,
      module.id,
      progress,
      extensions,
      enabledExtensions,
      requirementProgress,
    );
    const raw = totalWeight ? totalWeightedScore / totalWeight : 0;
    return { module: module.name, raw };
  });
};

export const calculateModuleMaturityLevels = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
  requirementProgress?: Record<string, RequirementProgress>,
  parameters: WeightedMaturityParameters = {},
): { module: string; level: number }[] => {
  return calculateModuleMaturityRaw(
    modules,
    progress,
    extensions,
    enabledExtensions,
    requirementProgress,
  ).map(({ module, raw }) => ({
    module,
    level: roundAndBoundWeightedLevel(raw, parameters),
  }));
};

export const calculateBlendedLevel = (
  moduleId: string,
  category: CategoryData,
  extension: ExtensionData,
  progress: Record<string, ProgressData>,
  requirementProgress?: Record<string, RequirementProgress>,
): number => {
  const coreKey = `${moduleId}.${category.id}`;
  const coreProgressData = progress[coreKey];

  // Not Applicable is only reached when the user has explicitly toggled
  // applicability off on the core category. A missing entry defaults to
  // level 0 (Not Assessed) with applicability true, matching the lazy
  // default the Category component uses for the picker.
  if (coreProgressData?.applicability === false) {
    return -1;
  }

  // Extension context — requirement weights are adjusted by this
  // extension's overlays when requirementProgress is present.
  const eff = calculateEffectiveCategoryLevel(
    moduleId,
    category,
    progress,
    requirementProgress,
    { extension },
  );
  // Derived Not Applicable (all in-scope requirements individually scoped
  // out) must behave exactly like an explicitly N/A category — otherwise a
  // rated extension relevance would blend against Level_C = -1 and emit
  // positive garbage that slips past downstream Not-Applicable exclusion
  // checks.
  if (eff.raw === -1) return -1;
  const level_C = eff.raw;

  const weightSum_C =
    eff.source === "requirements"
      ? eff.weightSum // in-scope, assessed, overlay-adjusted — the same denominator that produced level_C
      : getWeightSum(moduleId, category, [extension], [extension.extension.id]);

  const extCat = extension.relevance.modules
    .find((m) => m.id === moduleId)
    ?.categories.find((c) => c.id === category.id);

  if (!extCat) return level_C;

  const extKey = `${extension.extension.id}.${moduleId}.${category.id}`;
  const extProgressData = progress[extKey];
  const relLevel_C =
    extProgressData && extProgressData.applicability !== false
      ? extProgressData.level
      : 0;
  const relWeight_C = extCat.weight;

  // The spec formula assumes Level_C is rated. When the baseline is Not
  // Assessed, the blend has no baseline to attach to — surface Not Assessed
  // instead of letting the extension dimension nudge the axis up alone.
  if (level_C === 0) return 0;
  // When the extension dimension is not rated, the spec's "no relevance"
  // rule applies: ExtensionCategoryLevel_C = Level_C.
  if (relLevel_C === 0) return level_C;

  return (
    (level_C * weightSum_C + relLevel_C * relWeight_C) /
    (weightSum_C + relWeight_C)
  );
};

export const calculateExtensionMaturityLevels = (
  modules: ModuleData[],
  extensions: ExtensionData[],
  enabledExtensions: string[],
  progress: Record<string, ProgressData>,
  requirementProgress?: Record<string, RequirementProgress>,
  parameters: WeightedMaturityParameters = {},
): { id: string; name: string; level: number }[] => {
  return extensions
    .filter((ext) => enabledExtensions.includes(ext.extension.id))
    .map((ext) => {
      let totalWeight = 0;
      let totalWeightedScore = 0;

      for (const module of modules) {
        for (const category of module.categories) {
          const coreKey = `${module.id}.${category.id}`;
          const coreProgressData = progress[coreKey];

          // Skip if core category is not applicable
          if (!coreProgressData || coreProgressData.applicability === false) {
            continue;
          }

          const blendedLevel = calculateBlendedLevel(
            module.id,
            category,
            ext,
            progress,
            requirementProgress,
          );

          // Skip Not Applicable (-1) and Not Assessed (0) — same exclusion
          // semantics as the core rollup.
          if (blendedLevel <= 0) {
            continue;
          }

          // Per the framework spec:
          //   ExtensionScore = Σ(ExtensionCategoryLevel_C × effective_category_weight)
          //                    / Σ(effective_category_weight)
          // i.e., the per-category weight in the rollup is the category's
          // effective weight after category-level overlays, NOT the sum of
          // requirement weights + relevance weight.
          const effectiveWeight = getEffectiveWeight(
            module.id,
            category,
            [ext],
            [ext.extension.id],
          );
          totalWeight += effectiveWeight;
          totalWeightedScore += blendedLevel * effectiveWeight;
        }
      }

      const level = totalWeight
        ? roundAndBoundWeightedLevel(
            totalWeightedScore / totalWeight,
            parameters,
          )
        : 0;
      return { id: ext.extension.id, name: ext.extension.name, level };
    });
};

export const calculateExtensionFloorScore = (
  modules: ModuleData[],
  extension: ExtensionData,
  progress: Record<string, ProgressData>,
  requirementProgress?: Record<string, RequirementProgress>,
  parameters: WeightedMaturityParameters = {},
): number | null => {
  if (extension.extension.floorScore !== true) return null;

  let minLevel = 5;
  let hasApplicableCategory = false;

  modules.forEach((module) => {
    module.categories.forEach((category) => {
      const coreKey = `${module.id}.${category.id}`;
      const coreProgressData = progress[coreKey];

      // Skip if core category is not applicable
      if (!coreProgressData || coreProgressData.applicability === false) {
        return;
      }

      const extensionCategoryLevel_C = calculateBlendedLevel(
        module.id,
        category,
        extension,
        progress,
        requirementProgress,
      );

      // Skip Not Applicable (-1) and Not Assessed (0) — the floor score is
      // the minimum *assessed* blended level, so unrated categories
      // shouldn't pull the floor down to zero.
      if (extensionCategoryLevel_C <= 0) {
        return;
      }

      hasApplicableCategory = true;
      if (extensionCategoryLevel_C < minLevel) {
        minLevel = extensionCategoryLevel_C;
      }
    });
  });

  return hasApplicableCategory
    ? roundAndBoundWeightedLevel(minLevel, parameters)
    : 0;
};

// Per spec — Extension-weighted PKI MM score:
//   ExtensionWeighted = Σ(Level_C × effective_category_weight)
//                            / Σ(effective_category_weight)
// "Recalculates baseline PKI MM maturity using extension emphasis while
//  preserving baseline maturity values." Uses the baseline category level
// (NOT the blended ExtensionCategoryLevel) so the relevance signal does not
// affect this view — only the category weights are adjusted by the
// extension's category-level overlays.
export const calculateExtensionWeightedScore = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extension: ExtensionData,
  requirementProgress?: Record<string, RequirementProgress>,
  parameters: WeightedMaturityParameters = {},
): number => {
  let totalWeight = 0;
  let totalWeightedScore = 0;

  for (const module of modules) {
    for (const category of module.categories) {
      const coreKey = `${module.id}.${category.id}`;
      const coreProgressData = progress[coreKey];
      if (!coreProgressData || coreProgressData.applicability === false) {
        continue;
      }
      // Baseline context (no extension) — only the weight is
      // extension-adjusted below via getEffectiveWeight.
      const eff = calculateEffectiveCategoryLevel(
        module.id,
        category,
        progress,
        requirementProgress,
      );
      const level_C = eff.raw;
      if (level_C <= 0) continue; // Not Assessed — excluded, same as rollup rule
      const effectiveWeight = getEffectiveWeight(
        module.id,
        category,
        [extension],
        [extension.extension.id],
      );
      totalWeight += effectiveWeight;
      totalWeightedScore += level_C * effectiveWeight;
    }
  }

  // Terminal display score — callers index LevelResult / getColorForLevel with
  // it, so it floors here (the single display-flooring point for this score).
  return totalWeight
    ? roundAndBoundWeightedLevel(totalWeightedScore / totalWeight, parameters)
    : 0;
};

export type OverlayOperation = "multiplier" | "addition" | "override";

export interface OverlayEntry {
  operation: OverlayOperation;
  value: number;
  base: number;
  effective: number;
}

export interface RequirementOverlayEntry extends OverlayEntry {
  id: string;
  description: string;
}

export interface CategoryOverlayDetails {
  /** Defined when the extension applies a category-level weight overlay. */
  category?: OverlayEntry;
  /** Requirement-level weight overlays defined for this category. */
  requirements: RequirementOverlayEntry[];
}

const applyOperation = (
  base: number,
  operation: OverlayOperation,
  value: number,
): number => {
  if (operation === "override") return value;
  if (operation === "multiplier") return base * value;
  return base + value; // addition
};

const readOperation = (overlay: {
  override?: number;
  multiplier?: number;
  addition?: number;
}): { operation: OverlayOperation; value: number } | null => {
  if (overlay.override !== undefined) {
    return { operation: "override", value: overlay.override };
  }
  if (overlay.multiplier !== undefined) {
    return { operation: "multiplier", value: overlay.multiplier };
  }
  if (overlay.addition !== undefined) {
    return { operation: "addition", value: overlay.addition };
  }
  return null;
};

/** Returns a structured description of every overlay an extension applies
 *  to a given category. Renderers can present this however they want —
 *  the page and PDF share the same input shape. */
export const getCategoryOverlayInfo = (
  moduleId: string,
  category: CategoryData,
  extension: ExtensionData,
): CategoryOverlayDetails => {
  const details: CategoryOverlayDetails = { requirements: [] };
  if (!extension.overlays) return details;

  const extModule = extension.overlays.modules.find((m) => m.id === moduleId);
  const extCat = extModule?.categories.find((c) => c.id === category.id);
  if (!extCat) return details;

  const catOp = readOperation(extCat);
  if (catOp) {
    details.category = {
      operation: catOp.operation,
      value: catOp.value,
      base: category.weight,
      effective: applyOperation(category.weight, catOp.operation, catOp.value),
    };
  }

  if (extCat.requirements && category.requirements) {
    for (const extReq of extCat.requirements) {
      const coreReq = category.requirements.find((r) => r.id === extReq.id);
      if (!coreReq) continue;
      const op = readOperation(extReq);
      if (!op) continue;
      details.requirements.push({
        id: coreReq.id,
        description: coreReq.description,
        operation: op.operation,
        value: op.value,
        base: coreReq.weight,
        effective: applyOperation(coreReq.weight, op.operation, op.value),
      });
    }
  }

  return details;
};

/** Convenience for code that just needs to know "are there any overlays?" */
export const hasOverlays = (details: CategoryOverlayDetails): boolean =>
  details.category !== undefined || details.requirements.length > 0;

export interface WeightedMaturityRecord {
  progress: Record<string, ProgressData>;
  extensions?: ExtensionData[];
  enabledExtensions?: string[];
  requirementProgress?: Record<string, RequirementProgress>;
}

export interface WeightedMaturityScore {
  achievedLevel: number;
  rawLevel: number;
  moduleLevels: { module: string; level: number }[];
  moduleRawLevels: { module: string; raw: number }[];
}

registerScoringStrategy(
  "weighted-average",
  (
    model: { modules: ModuleData[] },
    record: WeightedMaturityRecord,
    parameters: Record<string, unknown>,
  ) => {
    const rawLevel = calculateOverallMaturityRaw(
      model.modules,
      record.progress,
      record.extensions,
      record.enabledExtensions,
      record.requirementProgress,
    );
    const moduleRawLevels = calculateModuleMaturityRaw(
      model.modules,
      record.progress,
      record.extensions,
      record.enabledExtensions,
      record.requirementProgress,
    );
    return {
      achievedLevel: roundAndBoundWeightedLevel(rawLevel, parameters),
      rawLevel,
      moduleLevels: moduleRawLevels.map(({ module, raw }) => ({
        module,
        level: roundAndBoundWeightedLevel(raw, parameters),
      })),
      moduleRawLevels,
    };
  },
);

export const calculateWeightedMaturityScore = (
  model: { modules: ModuleData[] },
  record: WeightedMaturityRecord,
  methodology: AssessmentProfileData["runtime"]["methodology"],
): WeightedMaturityScore =>
  scoreWithStrategy(
    methodology.strategy,
    model,
    record,
    methodology.parameters,
  );
