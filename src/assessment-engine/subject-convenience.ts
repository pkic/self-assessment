import type { AssessmentProfileData, AssessmentSubjectField } from "./types";

const cpePunctuation = new Set([".", "_", "-"]);

const trimCpePunctuation = (value: string): string => {
  let start = 0;
  let end = value.length;
  while (start < end && cpePunctuation.has(value[start])) start += 1;
  while (end > start && cpePunctuation.has(value[end - 1])) end -= 1;
  return value.slice(start, end);
};

const cpeComponent = (value: string): string =>
  trimCpePunctuation(
    value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]+/g, "_"),
  );

const MAX_NAME_WORDS = 4;
const MAX_NAME_LENGTH = 64;
const versionToken = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/;

const looksLikeName = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.length <= MAX_NAME_LENGTH &&
    trimmed.split(/\s+/).length <= MAX_NAME_WORDS &&
    !/[()[\]{},;:]/.test(trimmed)
  );
};

export const suggestedSubjectValue = (
  field: AssessmentSubjectField,
  subject: Record<string, string>,
): string | null => {
  const suggestion = field.suggestion;
  if (suggestion?.strategy !== "cpe-2.3-application") {
    return null;
  }
  const rawVendor = subject[suggestion.vendorField] ?? "";
  const rawProduct = subject[suggestion.productField] ?? "";
  const rawVersion = subject[suggestion.versionField] ?? "";
  // A suggestion is only useful when the fields hold plain names; descriptive
  // text ("4.2 (linux build)") would produce a CPE nobody publishes.
  if (
    !looksLikeName(rawVendor) ||
    !looksLikeName(rawProduct) ||
    !versionToken.test(rawVersion.trim())
  ) {
    return null;
  }
  const vendor = cpeComponent(rawVendor);
  const product = cpeComponent(rawProduct);
  const version = cpeComponent(rawVersion);
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
