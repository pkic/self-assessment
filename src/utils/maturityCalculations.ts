// utils/maturityCalculations.ts

import { ModuleData, ProgressData } from "../types/types";

const calculateWeightedScores = (
  categories: { id: string; weight: number }[],
  moduleId: string,
  progress: Record<string, ProgressData>,
) => {
  return categories.reduce(
    (acc, category) => {
      const key = `${moduleId}.${category.id}`;
      const progressData = progress[key];
      if (progressData && progressData.applicability) {
        const level = progressData.level;
        const weight = category.weight;
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
): number => {
  let totalWeight = 0;
  let totalWeightedScore = 0;

  modules.forEach((module) => {
    const {
      totalWeight: moduleTotalWeight,
      totalWeightedScore: moduleTotalWeightedScore,
    } = calculateWeightedScores(module.categories, module.id, progress);
    totalWeight += moduleTotalWeight;
    totalWeightedScore += moduleTotalWeightedScore;
  });

  return totalWeight ? Math.floor(totalWeightedScore / totalWeight) : 0;
};

export const calculateModuleMaturityLevels = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
): { module: string; level: number }[] => {
  return modules.map((module) => {
    const { totalWeight, totalWeightedScore } = calculateWeightedScores(
      module.categories,
      module.id,
      progress,
    );
    const moduleMaturityLevel = totalWeight
      ? Math.floor(totalWeightedScore / totalWeight)
      : 0;
    return { module: module.name, level: moduleMaturityLevel };
  });
};
