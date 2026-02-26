// utils/maturityCalculations.ts

import {
  ModuleData,
  ProgressData,
  ExtensionData,
} from "../types/types";

const getEffectiveWeight = (
  moduleId: string,
  categoryId: string,
  baseWeight: number,
  extensions: ExtensionData[],
  enabledExtensions: string[],
) => {
  let weight = baseWeight;

  extensions.forEach((ext) => {
    if (enabledExtensions.includes(ext.extension.id) && ext.overlays) {
      const extModule = ext.overlays.modules.find((m) => m.id === moduleId);
      const extCat = extModule?.categories.find((c) => c.id === categoryId);

      if (extCat) {
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
  categories: { id: string; weight: number }[],
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
        const level = progressData.level;
        const weight = getEffectiveWeight(
          moduleId,
          category.id,
          category.weight,
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
      extensions,
      enabledExtensions,
    );
    totalWeight += moduleTotalWeight;
    totalWeightedScore += moduleTotalWeightedScore;
  });

  return totalWeight ? Math.floor(totalWeightedScore / totalWeight) : 0;
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

export const calculateExtensionMaturityLevels = (
  extensions: ExtensionData[],
  enabledExtensions: string[],
  progress: Record<string, ProgressData>,
): { id: string; name: string; level: number }[] => {
  return extensions
    .filter((ext) => enabledExtensions.includes(ext.extension.id))
    .map((ext) => {
      let totalWeight = 0;
      let totalWeightedScore = 0;

      ext.relevance.modules.forEach((module) => {
        module.categories.forEach((category) => {
          const key = `${ext.extension.id}.${module.id}.${category.id}`;
          const coreKey = `${module.id}.${category.id}`;
          const progressData = progress[key];
          const coreProgressData = progress[coreKey];

          if (
            progressData &&
            progressData.applicability &&
            coreProgressData?.applicability !== false
          ) {
            const level = progressData.level;
            const weight = category.weight;
            totalWeight += weight;
            totalWeightedScore += level * weight;
          }
        });
      });

      const level = totalWeight ? Math.floor(totalWeightedScore / totalWeight) : 0;
      return { id: ext.extension.id, name: ext.extension.name, level };
    });
};
