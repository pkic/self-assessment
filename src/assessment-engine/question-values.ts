import { validCpe23, validPackageUrl } from "./subject-validation";

export type QuestionValue = string | string[];

// Duration answers are stored as a single "<amount>|<unit>" string, the same
// approach already used for "boolean" ("yes"/"no"): one more encoding kept
// inside the existing string | string[] value model rather than widening it.
export const DURATION_UNITS = new Set([
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
  "decade",
]);

// Fixed multipliers, not calendar-variable arithmetic: a Julian year of
// 365.25 days, a month as year / 12. Must match $defs/durationUnit in
// pqcmm-model.schema-1.1.0.json so both sides agree on what a stored
// duration value means.
export const DURATION_UNIT_SECONDS: Record<string, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2629800,
  year: 31557600,
  decade: 315576000,
};

export const durationToSeconds = (value: string): number | undefined => {
  const [amount, unit] = value.split("|");
  const numeric = Number(amount);
  const perUnit = unit ? DURATION_UNIT_SECONDS[unit] : undefined;
  if (Number.isNaN(numeric) || perUnit === undefined) return undefined;
  return numeric * perUnit;
};

export interface QuestionFieldPolicy {
  type: string;
  options?: { value: string }[];
  min?: number;
  max?: number;
  allowedUnits?: string[];
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

// Canonical stored form: exactly what Date.prototype.toISOString() produces,
// always UTC, always millisecond precision. The UI is responsible for
// converting a viewer's local-time input to this form before it ever reaches
// storage or scoring, never the other way around.
const validDateTime = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
};

const validNumber = (value: string, policy: QuestionFieldPolicy): boolean => {
  if (value.trim().length === 0 || Number.isNaN(Number(value))) return false;
  const numeric = Number(value);
  if (policy.min !== undefined && numeric < policy.min) return false;
  if (policy.max !== undefined && numeric > policy.max) return false;
  return true;
};

const validDuration = (value: string, policy: QuestionFieldPolicy): boolean => {
  const parts = value.split("|");
  if (parts.length !== 2) return false;
  const [amount, unit] = parts;
  if (
    amount.trim().length === 0 ||
    Number.isNaN(Number(amount)) ||
    Number(amount) < 0
  ) {
    return false;
  }
  const allowed = policy.allowedUnits ?? Array.from(DURATION_UNITS);
  return allowed.includes(unit);
};

// Stored as "<start date>|<end date>", the same compound-string approach as
// duration, both ends are plain calendar dates (see validDate for the UTC
// anchoring), start must not be after end.
const validDateRange = (value: string): boolean => {
  const parts = value.split("|");
  if (parts.length !== 2) return false;
  const [start, end] = parts;
  if (!validDate(start) || !validDate(end)) return false;
  return start <= end;
};

// A repeating daily clock reading, no date or timezone attached to it, so
// there is nothing here to convert to UTC; that only applies once a time is
// combined with a date (date-time) or given meaning by a deployment context.
const validTime = (value: string): boolean => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d{1,3})?)?$/.exec(
    value,
  );
  return match !== null;
};

const validMonth = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
};

const validWeek = (value: string): boolean => {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return false;
  const week = Number(match[2]);
  return week >= 1 && week <= 53;
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
  if (field.type === "date-time") return validDateTime(value);
  if (field.type === "date-range") return validDateRange(value);
  if (field.type === "time") return validTime(value);
  if (field.type === "month") return validMonth(value);
  if (field.type === "week") return validWeek(value);
  if (field.type === "url") return validHttpUrl(value);
  if (field.type === "cpe-2.3") return validCpe23(value);
  if (field.type === "package-url") return validPackageUrl(value);
  if (field.type === "number") return validNumber(value, field);
  if (field.type === "duration") return validDuration(value, field);
  if (field.type === "boolean") return value === "yes" || value === "no";
  if (field.type === "select") {
    return Boolean(field.options?.some((option) => option.value === value));
  }
  return true;
};
