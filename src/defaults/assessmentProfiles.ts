import pkimmProfile from "../public/pkimm-self-assessment-profile-1.0.0.yaml";
import pqcmmProfile from "../public/pqcmm-self-assessment-profile-1.1.0.yaml";

export const DEFAULT_ASSESSMENT_PROFILE = "pkimm-self-assessment";

const BUNDLED_ASSESSMENT_PROFILES: Record<string, string> = {
  "pkimm-self-assessment": pkimmProfile,
  "pqcmm-self-assessment": pqcmmProfile,
};

export const getBundledAssessmentProfileYaml = (id: string): string | null =>
  BUNDLED_ASSESSMENT_PROFILES[id] ?? null;
