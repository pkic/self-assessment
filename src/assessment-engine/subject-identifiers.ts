import type { AssessmentProfileData } from "./types";

export interface AssessmentSubjectIdentifiers {
  cpe?: string;
  purl?: string;
}

export const collectSubjectIdentifiers = (
  profile: AssessmentProfileData,
  subject: Record<string, string>,
): AssessmentSubjectIdentifiers =>
  profile.runtime.subjectFields.reduce<AssessmentSubjectIdentifiers>(
    (identifiers, field) => {
      const value = subject[field.key]?.trim();
      if (field.format === "cpe-2.3" && value) identifiers.cpe = value;
      if (field.format === "package-url" && value) identifiers.purl = value;
      return identifiers;
    },
    {},
  );
