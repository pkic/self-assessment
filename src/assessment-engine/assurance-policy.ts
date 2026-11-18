import type { AssessmentProfileData } from "./types";

export type AssuranceProfile =
  AssessmentProfileData["assurance"]["profiles"][number];

export const findAssuranceProfile = (
  profile: AssessmentProfileData,
  id: string,
): AssuranceProfile | undefined =>
  profile.assurance.profiles.find((candidate) => candidate.id === id);

export const requireAssuranceProfile = (
  profile: AssessmentProfileData,
  id: string,
): AssuranceProfile => {
  const assurance = findAssuranceProfile(profile, id);
  if (!assurance) throw new Error(`Unknown assurance profile: ${id}`);
  return assurance;
};

export const currentAssuranceProfile = (
  profile: AssessmentProfileData,
  selectedId: string,
): AssuranceProfile => {
  const assurance = requireAssuranceProfile(
    profile,
    selectedId || profile.assurance.defaultProfile,
  );
  if (
    assurance.availability !== "browser" ||
    assurance.independentVerification ||
    assurance.certification
  ) {
    throw new Error(
      `Assurance profile is not available to the browser workflow: ${assurance.id}`,
    );
  }
  return assurance;
};
