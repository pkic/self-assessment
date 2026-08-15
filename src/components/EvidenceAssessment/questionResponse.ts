import type { AssessmentProfileData } from "../../assessment-engine/types";
import {
  hasQuestionValue,
  validQuestionFieldValue,
} from "../../assessment-engine/question-values";
import type {
  AssessmentEvidenceFile,
  EvidenceQuestion,
  EvidenceQuestionGroup,
  EvidenceQuestionProgress,
  EvidenceQuestionResponse,
} from "./types";

export const emptyQuestionProgress = (): EvidenceQuestionProgress => ({
  finding: "not-assessed",
  values: {},
  evidenceIds: [],
});

export const responseDefinition = (
  question: EvidenceQuestion,
  kind: EvidenceQuestionGroup["kind"],
  profile: AssessmentProfileData,
): EvidenceQuestionResponse => {
  if (question.response) return question.response;
  const defaults = profile.runtime.questions?.defaults[kind];
  return {
    fields: [
      {
        key: defaults?.fieldKey ?? "response",
        label: defaults?.fieldLabel ?? "Response",
        type: defaults?.fieldType ?? "textarea",
        required: defaults?.required ?? true,
      },
    ],
  };
};

export const questionResponseIssues = (
  question: EvidenceQuestion,
  kind: EvidenceQuestionGroup["kind"],
  profile: AssessmentProfileData,
  progress: EvidenceQuestionProgress,
  evidenceFiles: AssessmentEvidenceFile[],
): string[] => {
  const definition = responseDefinition(question, kind, profile);
  const issues: string[] = [];
  if (
    profile.runtime.questions?.requiredForKinds.includes(kind) &&
    progress.finding === "not-assessed"
  ) {
    issues.push("Select an assessment finding.");
  }
  for (const field of definition.fields) {
    const value = progress.values[field.key];
    if (field.required && !hasQuestionValue(value)) {
      issues.push(`${field.label} is required.`);
      continue;
    }
    if (!hasQuestionValue(value)) continue;
    if (field.type === "date" && !validQuestionFieldValue(field, value!)) {
      issues.push(`${field.label} must be a valid date.`);
    } else if (
      field.type === "url" &&
      !validQuestionFieldValue(field, value!)
    ) {
      issues.push(`${field.label} must be an HTTP or HTTPS URL.`);
    } else if (
      field.type === "cpe-2.3" &&
      !validQuestionFieldValue(field, value!)
    ) {
      issues.push(`${field.label} must be a valid CPE 2.3 name.`);
    } else if (
      field.type === "package-url" &&
      !validQuestionFieldValue(field, value!)
    ) {
      issues.push(`${field.label} must be a valid package URL.`);
    } else if (
      field.type === "boolean" &&
      !validQuestionFieldValue(field, value!)
    ) {
      issues.push(`${field.label} must be Yes or No.`);
    } else if (
      ["select", "multiselect"].includes(field.type) &&
      !validQuestionFieldValue(field, value!)
    ) {
      issues.push(`${field.label} contains an unknown option.`);
    }
  }
  for (const rule of definition.rules ?? []) {
    if (
      rule.kind === "at-least-one" &&
      !rule.fields.some((field) => hasQuestionValue(progress.values[field]))
    ) {
      issues.push(rule.message);
    }
  }
  const attached = progress.evidenceIds
    .map((id) => evidenceFiles.find((file) => file.id === id))
    .filter((file): file is AssessmentEvidenceFile => Boolean(file));
  if (definition.evidence?.required && attached.length === 0) {
    issues.push(`${definition.evidence.label} is required.`);
  }
  if (definition.evidence && attached.length > definition.evidence.maxFiles) {
    issues.push(
      `${definition.evidence.label} accepts at most ${definition.evidence.maxFiles} file${definition.evidence.maxFiles === 1 ? "" : "s"}.`,
    );
  }
  if (
    definition.evidence &&
    !definition.evidence.acceptedMediaTypes.includes("*/*") &&
    attached.some(
      (file) =>
        !definition.evidence?.acceptedMediaTypes.includes(file.mediaType),
    )
  ) {
    issues.push(
      `${definition.evidence.label} contains an unsupported file type.`,
    );
  }
  return issues;
};

export const questionIsAnswered = (
  question: EvidenceQuestion,
  kind: EvidenceQuestionGroup["kind"],
  profile: AssessmentProfileData,
  progress: EvidenceQuestionProgress | undefined,
  evidenceFiles: AssessmentEvidenceFile[],
): boolean =>
  Boolean(
    progress &&
    questionResponseIssues(question, kind, profile, progress, evidenceFiles)
      .length === 0,
  );

export const questionResponseSummary = (
  definition: EvidenceQuestionResponse,
  progress: EvidenceQuestionProgress,
): string =>
  definition.fields
    .flatMap((field) => {
      const value = progress.values[field.key];
      if (!hasQuestionValue(value)) return [];
      const rendered = Array.isArray(value) ? value.join(", ") : value;
      return `${field.label}: ${rendered}`;
    })
    .join("\n");
