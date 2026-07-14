import type { Assessment, ExtensionData, ModuleData } from "../types/types";
import { calculateOverallMaturityLevel } from "./maturityCalculations";
import { computeCategoryGrainCounts } from "./reportData";
import { hasV2Content } from "./stateSchema";
import { mapAssessmentType } from "./pdf/assessmentType";

export interface AssessmentCardModel {
  isCompatible: boolean;
  isScorable: boolean;
  isFull: boolean;
  overallLevel: number | null;
  assessedCount: number;
  totalCount: number;
  typeLabel: string | null;
}

export const buildAssessmentCardModel = (
  assessment: Assessment,
  loadedModules: ModuleData[] | null,
  loadedDataVersion: string,
  loadedExtensions: ExtensionData[],
): AssessmentCardModel => {
  const isCompatible = assessment.dataVersion === loadedDataVersion;
  const isScorable = isCompatible && loadedModules !== null;

  let overallLevel: number | null = null;
  let assessedCount = 0;
  let totalCount = 0;

  if (isScorable && loadedModules) {
    overallLevel = calculateOverallMaturityLevel(
      loadedModules,
      assessment.progress,
      loadedExtensions,
      assessment.enabledExtensions.map((e) => e.id),
      assessment.requirementProgress,
    );
    const counts = computeCategoryGrainCounts(
      loadedModules,
      assessment.progress,
      assessment.requirementProgress,
    );
    assessedCount = counts.assessed;
    totalCount = counts.total;
  }

  return {
    isCompatible,
    isScorable,
    isFull: hasV2Content(assessment),
    overallLevel,
    assessedCount,
    totalCount,
    typeLabel: assessment.assessmentType
      ? mapAssessmentType(assessment.assessmentType).label
      : null,
  };
};
