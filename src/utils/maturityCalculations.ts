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
  let weightSum = category.requirements.reduce((acc, req) => acc + req.weight, 0);

  extensions.forEach((ext) => {
    if (enabledExtensions.includes(ext.extension.id) && ext.overlays) {
      const extModule = ext.overlays.modules.find((m) => m.id === moduleId);
      const extCat = extModule?.categories.find((c) => c.id === category.id);

      if (extCat && extCat.requirements && category.requirements) {
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
            weightSum += (reqWeight - coreReq.weight);
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
  return categories.reduce(
    (acc, category) => {
      const key = `${moduleId}.${category.id}`;
      const progressData = progress[key];
      if (progressData && progressData.applicability) {
        let level = progressData.level;
        let weight = getEffectiveWeight(
          moduleId,
          category,
          extensions,
          enabledExtensions,
        );

        // If there is exactly one enabled extension, use blended level and correct weight
        const activeExtensions = extensions.filter(ext => enabledExtensions.includes(ext.extension.id));
        if (activeExtensions.length === 1) {
          const ext = activeExtensions[0];
          const blendedLevel = calculateBlendedLevel(moduleId, category, ext, progress);
          if (blendedLevel !== -1) {
            level = blendedLevel;
            const weightSum_C = getWeightSum(moduleId, category, [ext], [ext.extension.id]);
            const extCat = ext.relevance.modules
              .find((m) => m.id === moduleId)
              ?.categories.find((c) => c.id === category.id);
            const relWeight_C = extCat ? extCat.weight : 0;
            weight = weightSum_C + relWeight_C;
          }
        }

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

  return totalWeightSum ? Math.floor(totalWeightedScoreSum / totalWeightSum) : 0;
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
  progress: Record<string, ProgressData>
): number => {
  const coreKey = `${moduleId}.${category.id}`;
  const coreProgressData = progress[coreKey];

  if (!coreProgressData || coreProgressData.applicability === false) {
    return -1; // Not Applicable
  }

  const weightSum_C = getWeightSum(moduleId, category, [extension], [extension.extension.id]);
  const level_C = coreProgressData.level;

  const extCat = extension.relevance.modules
    .find((m) => m.id === moduleId)
    ?.categories.find((c) => c.id === category.id);

  if (extCat) {
    const extKey = `${extension.extension.id}.${moduleId}.${category.id}`;
    const extProgressData = progress[extKey];
    const relLevel_C = (extProgressData && extProgressData.applicability !== false) 
      ? extProgressData.level 
      : 1;
    const relWeight_C = extCat.weight;

    return (level_C * weightSum_C + relLevel_C * relWeight_C) / (weightSum_C + relWeight_C);
  } else {
    return level_C;
  }
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

      modules.forEach((module) => {
        module.categories.forEach((category) => {
          const coreKey = `${module.id}.${category.id}`;
          const coreProgressData = progress[coreKey];

          // Skip if core category is not applicable
          if (!coreProgressData || coreProgressData.applicability === false) {
            return;
          }

          const blendedLevel = calculateBlendedLevel(module.id, category, ext, progress);
          
          if (blendedLevel === -1) {
            return;
          }

          const weightSum_C = getWeightSum(module.id, category, [ext], [ext.extension.id]);
          const extCat = ext.relevance.modules
            .find((m) => m.id === module.id)
            ?.categories.find((c) => c.id === category.id);

          if (extCat) {
            const relWeight_C = extCat.weight;
            // For extension overall maturity, we use the sum of weights (WeightSum_C + RelWeight_C)
            const totalCatWeight = weightSum_C + relWeight_C;
            totalWeight += totalCatWeight;
            totalWeightedScore += blendedLevel * totalCatWeight;
          } else {
            // If relevance is not defined: ExtensionCategoryLevel_C = Level_C
            totalWeight += weightSum_C;
            totalWeightedScore += blendedLevel * weightSum_C;
          }
        });
      });

      const level = totalWeight ? Math.floor(totalWeightedScore / totalWeight) : 0;
      return { id: ext.extension.id, name: ext.extension.name, level };
    });
};

export const calculateExtensionFloorScore = (
  modules: ModuleData[],
  extension: ExtensionData,
  progress: Record<string, ProgressData>,
): number | null => {
  if (extension.extension.floorScore === undefined) return null;

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

      const extensionCategoryLevel_C = calculateBlendedLevel(module.id, category, extension, progress);

      if (extensionCategoryLevel_C === -1) {
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

export const calculateExtensionWeightedPKIMMScore = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  extension: ExtensionData,
): number => {
  let totalWeight = 0;
  let totalWeightedScore = 0;

  modules.forEach((module) => {
    const {
      totalWeight: moduleTotalWeight,
      totalWeightedScore: moduleTotalWeightedScore,
    } = calculateWeightedScores(
      module.categories,
      module.id,
      progress,
      [extension],
      [extension.extension.id],
    );
    totalWeight += moduleTotalWeight;
    totalWeightedScore += moduleTotalWeightedScore;
  });

  return totalWeight ? Math.floor(totalWeightedScore / totalWeight) : 0;
};

export const getCategoryOverlayInfo = (
  moduleId: string,
  category: CategoryData,
  extension: ExtensionData,
): string[] => {
  const info: string[] = [];
  if (!extension.overlays) return info;

  const extModule = extension.overlays.modules.find((m) => m.id === moduleId);
  const extCat = extModule?.categories.find((c) => c.id === category.id);

  if (extCat) {
    if (extCat.override !== undefined) {
      info.push(`Category weight overridden to ${extCat.override}`);
    } else if (extCat.multiplier !== undefined) {
      info.push(`Category weight multiplied by ${extCat.multiplier} (Base: ${category.weight})`);
    } else if (extCat.addition !== undefined) {
      info.push(`Category weight increased by ${extCat.addition} (Base: ${category.weight})`);
    }

    if (extCat.requirements && category.requirements) {
      extCat.requirements.forEach((extReq) => {
        const coreReq = category.requirements.find((r) => r.id === extReq.id);
        if (coreReq) {
          if (extReq.override !== undefined) {
            info.push(`Requirement ${coreReq.id} weight overridden to ${extReq.override} (Base: ${coreReq.weight})`);
          } else if (extReq.multiplier !== undefined) {
            info.push(`Requirement ${coreReq.id} weight multiplied by ${extReq.multiplier} (Base: ${coreReq.weight})`);
          } else if (extReq.addition !== undefined) {
            info.push(`Requirement ${coreReq.id} weight increased by ${extReq.addition} (Base: ${coreReq.weight})`);
          }
        }
      });
    }
  }

  return info;
};
