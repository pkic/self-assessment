import type { AssessmentProfileData } from "./types";

const validFormat = (format: string | undefined, value: string): boolean => {
  if (!format || !value) return true;
  if (format === "cpe-2.3") {
    let separatorCount = 0;
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== ":") continue;
      let escapes = 0;
      for (
        let cursor = index - 1;
        cursor >= 0 && value[cursor] === "\\";
        cursor -= 1
      ) {
        escapes += 1;
      }
      if (escapes % 2 === 0) separatorCount += 1;
    }
    return value.toLowerCase().startsWith("cpe:2.3:") && separatorCount === 12;
  }
  if (format === "package-url") return /^pkg:[^\s/]+\/.+/.test(value);
  if (format === "uri") {
    try {
      return Boolean(new URL(value));
    } catch {
      return false;
    }
  }
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
