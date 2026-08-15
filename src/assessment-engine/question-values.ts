import { validCpe23, validPackageUrl } from "./subject-validation";

export type QuestionValue = string | string[];

export interface QuestionFieldPolicy {
  type: string;
  options?: { value: string }[];
}

export const hasQuestionValue = (value: QuestionValue | undefined): boolean =>
  Array.isArray(value)
    ? value.some((item) => item.trim().length > 0)
    : Boolean(value?.trim());

const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
};

const validHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export const validQuestionFieldValue = (
  field: QuestionFieldPolicy,
  value: QuestionValue,
): boolean => {
  if (Array.isArray(value)) {
    return (
      field.type === "multiselect" &&
      value.every((item) =>
        field.options?.some((option) => option.value === item),
      )
    );
  }
  if (field.type === "date") return validDate(value);
  if (field.type === "url") return validHttpUrl(value);
  if (field.type === "cpe-2.3") return validCpe23(value);
  if (field.type === "package-url") return validPackageUrl(value);
  if (field.type === "boolean") return value === "yes" || value === "no";
  if (field.type === "select") {
    return Boolean(field.options?.some((option) => option.value === value));
  }
  return true;
};
