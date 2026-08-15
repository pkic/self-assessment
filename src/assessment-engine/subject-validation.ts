import type { AssessmentProfileData } from "./types";

const hasUnescapedSeparatorCount = (
  value: string,
  expected: number,
): boolean => {
  let separatorCount = 0;
  let precedingEscapes = 0;
  for (const character of value) {
    if (character === "\\") {
      precedingEscapes += 1;
      continue;
    }
    if (character === ":" && precedingEscapes % 2 === 0) separatorCount += 1;
    precedingEscapes = 0;
  }
  return separatorCount === expected;
};

const validCpe23 = (value: string): boolean =>
  value.toLowerCase().startsWith("cpe:2.3:") &&
  hasUnescapedSeparatorCount(value, 12);

const validPackageUrl = (value: string): boolean => {
  if (!value.startsWith("pkg:")) return false;
  const slash = value.indexOf("/", 4);
  return slash > 4 && slash < value.length - 1 && !/\s/.test(value);
};

const validUri = (value: string): boolean => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

const validFormat = (format: string | undefined, value: string): boolean => {
  if (!format || !value) return true;
  if (format === "cpe-2.3") return validCpe23(value);
  if (format === "package-url") return validPackageUrl(value);
  if (format === "uri") return validUri(value);
  return false;
};

export const assessmentSubjectIssues = (
  profile: AssessmentProfileData,
  subject: Record<string, string>,
): string[] => {
  const issues = profile.runtime.subjectFields.flatMap((field) => {
    const value = subject[field.key]?.trim() ?? "";
    if (field.required && !value) return [`${field.label} is required.`];
    if (!validFormat(field.format, value)) {
      return [`${field.label} is not a valid ${field.format}.`];
    }
    return [];
  });
  for (const rule of profile.runtime.subjectRules ?? []) {
    if (!rule.fields.some((field) => subject[field]?.trim())) {
      issues.push(rule.message);
    }
  }
  return issues;
};

export const assertValidAssessmentSubject = (
  profile: AssessmentProfileData,
  subject: Record<string, string>,
): void => {
  const issues = assessmentSubjectIssues(profile, subject);
  if (issues.length > 0) throw new Error(issues.join(" "));
};
