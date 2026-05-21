// utils/maturityCalculations.ts

import {
  ModuleData,
  ProgressData,
  ExtensionData,
  CategoryData,
} from "../types/types";

const getWeightSum = (
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
            // Add the difference to the weight sum
            weightSum += reqWeight - coreReq.weight;
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

  return weight;
};

const calculateWeightedScores = (
  categories: CategoryData[],
  moduleId: string,
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
) => {
  // Per spec, baseline PKI MM maturity is computed from baseline Level_C
  // with the (optionally extension-overlay-adjusted) effective category
  // weight. Blending with extension relevance levels belongs to the
  // dedicated extension calc functions (calculateExtensionMaturityLevels,
  // calculateBlendedLevel), not this baseline rollup.
  //
  // Pass [] / [] for extensions to get a pure baseline view; pass an
  // extension to get the ExtensionWeightedPKIMM view (Level_C with
  // extension-adjusted weights).
  return categories.reduce(
    (acc, category) => {
      const key = `${moduleId}.${category.id}`;
      const progressData = progress[key];
      // Not Assessed (level 0) and Not Applicable (applicability false) are
      // both excluded from the rollup. Including them as zeros would make a
      // mostly-empty assessment look worse than it is; the visible per-axis
      // value on the chart still reflects level 0 for unrated categories.
      if (
        progressData &&
        progressData.applicability &&
        progressData.level > 0
      ) {
        const level = progressData.level;
        const weight = getEffectiveWeight(
          moduleId,
          category,
          extensions,
          enabledExtensions,
        );
        acc.totalWeight += weight;
        acc.totalWeightedScore += level * weight;
      }
      return acc;
    },
    { totalWeight: 0, totalWeightedScore: 0 },
  );
};

export const calculateOverallMaturityLevel = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
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
    );
    totalWeightSum += totalWeight;
    totalWeightedScoreSum += totalWeightedScore;
  });

  return totalWeightSum
    ? Math.floor(totalWeightedScoreSum / totalWeightSum)
    : 0;
};

export const calculateModuleMaturityLevels = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extensions: ExtensionData[] = [],
  enabledExtensions: string[] = [],
): { module: string; level: number }[] => {
  return modules.map((module) => {
    const { totalWeight, totalWeightedScore } = calculateWeightedScores(
      module.categories,
      module.id,
      progress,
      extensions,
      enabledExtensions,
    );
    const moduleMaturityLevel = totalWeight
      ? Math.floor(totalWeightedScore / totalWeight)
      : 0;
    return { module: module.name, level: moduleMaturityLevel };
  });
};

export const calculateBlendedLevel = (
  moduleId: string,
  category: CategoryData,
  extension: ExtensionData,
  progress: Record<string, ProgressData>,
): number => {
  const coreKey = `${moduleId}.${category.id}`;
  const coreProgressData = progress[coreKey];

  // Not Applicable is only reached when the user has explicitly toggled
  // applicability off on the core category. A missing entry defaults to
  // level 0 (Not Assessed) with applicability true, matching the lazy
  // default the Category component uses for the picker.
  if (coreProgressData && coreProgressData.applicability === false) {
    return -1;
  }

  const weightSum_C = getWeightSum(
    moduleId,
    category,
    [extension],
    [extension.extension.id],
  );
  const level_C = coreProgressData?.level ?? 0;

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
        ? Math.floor(totalWeightedScore / totalWeight)
        : 0;
      return { id: ext.extension.id, name: ext.extension.name, level };
    });
};

export const calculateExtensionFloorScore = (
  modules: ModuleData[],
  extension: ExtensionData,
  progress: Record<string, ProgressData>,
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

  return hasApplicableCategory ? Math.floor(minLevel) : 0;
};

// Per spec — Extension-weighted PKI MM score:
//   ExtensionWeightedPKIMM = Σ(Level_C × effective_category_weight)
//                            / Σ(effective_category_weight)
// "Recalculates baseline PKI MM maturity using extension emphasis while
//  preserving baseline maturity values." Uses the baseline category level
// (NOT the blended ExtensionCategoryLevel) so the relevance signal does not
// affect this view — only the category weights are adjusted by the
// extension's category-level overlays.
export const calculateExtensionWeightedPKIMMScore = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extension: ExtensionData,
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
      const level_C = coreProgressData.level;
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

  return totalWeight ? Math.floor(totalWeightedScore / totalWeight) : 0;
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
