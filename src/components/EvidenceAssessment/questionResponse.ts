import type { AssessmentProfileData } from "../../assessment-engine/types";
import {
  hasQuestionValue,
  validQuestionFieldValue,
} from "../../assessment-engine/question-values";
import type {
  AssessmentEvidenceFile,
  EvidenceQuestion,
  EvidenceQuestionField,
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

const fieldIssue = (
  field: EvidenceQuestionField,
  value: string | string[] | undefined,
): string | undefined => {
  if (field.required && !hasQuestionValue(value)) {
    return `${field.label} is required.`;
  }
  if (!hasQuestionValue(value)) return undefined;
  if (validQuestionFieldValue(field, value!)) return undefined;
  if (field.type === "date") return `${field.label} must be a valid date.`;
  if (field.type === "url") {
    return `${field.label} must be an HTTP or HTTPS URL.`;
  }
  if (field.type === "cpe-2.3") {
    return `${field.label} must be a valid CPE 2.3 name.`;
  }
  if (field.type === "package-url") {
    return `${field.label} must be a valid package URL.`;
  }
  if (field.type === "boolean") return `${field.label} must be Yes or No.`;
  return `${field.label} contains an unknown option.`;
};

const responseValueIssues = (
  definition: EvidenceQuestionResponse,
  progress: EvidenceQuestionProgress,
): string[] =>
  definition.fields.flatMap((field) => {
    const issue = fieldIssue(field, progress.values[field.key]);
    return issue ? [issue] : [];
  });

const responseRuleIssues = (
  definition: EvidenceQuestionResponse,
  progress: EvidenceQuestionProgress,
): string[] =>
  (definition.rules ?? []).flatMap((rule) =>
    rule.fields.some((field) => hasQuestionValue(progress.values[field]))
      ? []
      : [rule.message],
  );

const attachedEvidence = (
  progress: EvidenceQuestionProgress,
  evidenceFiles: AssessmentEvidenceFile[],
): AssessmentEvidenceFile[] =>
  progress.evidenceIds
    .map((id) => evidenceFiles.find((file) => file.id === id))
    .filter((file): file is AssessmentEvidenceFile => Boolean(file));

const evidenceIssues = (
  definition: EvidenceQuestionResponse,
  progress: EvidenceQuestionProgress,
  evidenceFiles: AssessmentEvidenceFile[],
): string[] => {
  const request = definition.evidence;
  if (!request) return [];
  const attached = attachedEvidence(progress, evidenceFiles);
  const issues: string[] = [];
  if (request.required && attached.length === 0) {
    issues.push(`${request.label} is required.`);
  }
  if (attached.length > request.maxFiles) {
    issues.push(
      `${request.label} accepts at most ${request.maxFiles} file${request.maxFiles === 1 ? "" : "s"}.`,
    );
  }
  const acceptsAll = request.acceptedMediaTypes.includes("*/*");
  const unsupported = attached.some(
    (file) => !request.acceptedMediaTypes.includes(file.mediaType),
  );
  if (!acceptsAll && unsupported) {
    issues.push(`${request.label} contains an unsupported file type.`);
  }
  return issues;
};

export const questionResponseIssues = (
  question: EvidenceQuestion,
  kind: EvidenceQuestionGroup["kind"],
  profile: AssessmentProfileData,
  progress: EvidenceQuestionProgress,
  evidenceFiles: AssessmentEvidenceFile[],
): string[] => {
  const definition = responseDefinition(question, kind, profile);
  const issues = [
    ...responseValueIssues(definition, progress),
    ...responseRuleIssues(definition, progress),
    ...evidenceIssues(definition, progress, evidenceFiles),
  ];
  if (
    profile.runtime.questions?.requiredForKinds.includes(kind) &&
    progress.finding === "not-assessed"
  ) {
    issues.unshift("Select an assessment finding.");
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
