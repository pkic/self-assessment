import type { EvidenceFile } from "../types";
import { hasQuestionValue, validQuestionFieldValue } from "../question-values";

export interface GatedQuestion {
  id: string;
  response?: {
    fields: {
      key: string;
      type: string;
      required: boolean;
      options?: { value: string }[];
    }[];
    rules?: { kind: "at-least-one"; fields: string[] }[];
    evidence?: { required: boolean };
  };
}

export interface GatedQuestionProgress {
  finding: string;
  values: Record<string, string | string[]>;
  evidenceIds: string[];
}

export const questionResponseComplete = (
  question: GatedQuestion | undefined,
  progress: GatedQuestionProgress | undefined,
  evidenceFiles: Pick<EvidenceFile, "id">[],
): boolean => {
  if (!question || !progress) return false;
  const requiredFields = question.response?.fields.filter(
    (field) => field.required,
  );
  const fieldsComplete = requiredFields
    ? requiredFields.every((field) =>
        hasQuestionValue(progress.values[field.key]),
      )
    : Object.values(progress.values).some(hasQuestionValue);
  const fieldsValid = (question.response?.fields ?? []).every((field) => {
    const value = progress.values[field.key];
    return !hasQuestionValue(value) || validQuestionFieldValue(field, value!);
  });
  const rulesComplete = (question.response?.rules ?? []).every((rule) =>
    rule.fields.some((field) => hasQuestionValue(progress.values[field])),
  );
  const evidenceComplete =
    !question.response?.evidence?.required ||
    progress.evidenceIds.some((id) =>
      evidenceFiles.some((file) => file.id === id),
    );
  return fieldsComplete && fieldsValid && rulesComplete && evidenceComplete;
};

export const countQuestionFindings = (
  questions: GatedQuestion[],
  progress: Record<string, GatedQuestionProgress>,
): Record<string, number> =>
  questions.reduce<Record<string, number>>((counts, question) => {
    const finding = progress[question.id]?.finding ?? "not-assessed";
    counts[finding] = (counts[finding] ?? 0) + 1;
    return counts;
  }, {});
