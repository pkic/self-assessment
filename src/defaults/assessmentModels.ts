import pkimmModel from "../public/pkimm-model-2.0.0.yaml";
import pqcmmModel from "../public/pqcmm-model-1.0.1.yaml";

const bundledModels: Record<string, string> = {
  pkimm: pkimmModel,
  pqcmm: pqcmmModel,
};

export const getBundledAssessmentModelYaml = (
  modelId: string,
): string | undefined => bundledModels[modelId];
