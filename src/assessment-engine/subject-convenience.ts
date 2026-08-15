import type { AssessmentProfileData, AssessmentSubjectField } from "./types";

const cpeComponent = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");

export const suggestedSubjectValue = (
  field: AssessmentSubjectField,
  subject: Record<string, string>,
): string | null => {
  const suggestion = field.suggestion;
  if (!suggestion || suggestion.strategy !== "cpe-2.3-application") {
    return null;
  }
  const vendor = cpeComponent(subject[suggestion.vendorField] ?? "");
  const product = cpeComponent(subject[suggestion.productField] ?? "");
  const version = cpeComponent(subject[suggestion.versionField] ?? "");
  if (!vendor || !product || !version) return null;
  return `cpe:2.3:a:${vendor}:${product}:${version}:*:*:*:*:*:*:*`;
};

export const updateSubjectWithDefaults = (
  profile: AssessmentProfileData,
  subject: Record<string, string>,
  changedField: string,
  value: string,
): Record<string, string> => {
  const previousSourceValue = subject[changedField] ?? "";
  const next = { ...subject, [changedField]: value };
  for (const field of profile.runtime.subjectFields) {
    if (field.defaultFrom !== changedField) continue;
    const currentTargetValue = subject[field.key] ?? "";
    if (
      !currentTargetValue.trim() ||
      currentTargetValue === previousSourceValue
    ) {
      next[field.key] = value;
    }
  }
  return next;
};
