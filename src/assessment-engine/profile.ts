import yaml from "js-yaml";
import type { ErrorObject } from "ajv";
import { validateAssessmentProfile100 } from "../generated/validators-2020";
import type { AssessmentProfileData } from "./types";
import { validateAssessmentProfileSemantics } from "./profile-semantics";

const errorsText = (errors: ErrorObject[] | null | undefined): string =>
  (errors ?? [])
    .map((error) => `data${error.instancePath} ${error.message ?? ""}`)
    .join(", ") || "validation failed";

export const parseAssessmentProfile = (
  yamlText: string,
): AssessmentProfileData => {
  const parsed = yaml.load(yamlText);
  if (!validateAssessmentProfile100(parsed)) {
    throw new Error(
      `Assessment profile schema validation failed: ${errorsText(validateAssessmentProfile100.errors)}`,
    );
  }
  const profile = parsed as AssessmentProfileData;
  validateAssessmentProfileSemantics(profile);
  return profile;
};

export const browserAssuranceProfiles = (profile: AssessmentProfileData) =>
  profile.assurance.profiles.filter(
    (assurance) => assurance.availability === "browser",
  );

export const evidenceCriterionPolicy = (profile: AssessmentProfileData) => {
  if (!profile.runtime.criterion) {
    throw new Error(
      `Assessment experience ${profile.runtime.experience} requires a criterion policy.`,
    );
  }
  return profile.runtime.criterion;
};
