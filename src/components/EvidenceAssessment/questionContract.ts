import type {
  EvidenceQuestionField,
  EvidenceQuestionFieldType,
  EvidenceQuestionResponse,
} from "./types";

const CPE_PATTERN = "^cpe:2\\.3:(?:(?:\\\\.|[^:])*:){10}(?:\\\\.|[^:])*$";
const PURL_PATTERN =
  "^pkg:[a-z][a-z0-9.+-]*/[^\\s/]+(?:/[^\\s/]+)*(?:@[^\\s?#]+)?(?:\\?[^\\s#]+)?(?:#[^\\s]+)?$";
const FIELD_TYPES = new Set<EvidenceQuestionFieldType>([
  "text",
  "textarea",
  "date",
  "url",
  "boolean",
  "select",
  "multiselect",
  "cpe-2.3",
  "package-url",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const validOptions = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length >= 2 &&
  value.every(
    (option) =>
      isRecord(option) &&
      typeof option.value === "string" &&
      option.value.length > 0 &&
      typeof option.label === "string" &&
      option.label.length > 0,
  );

const validField = (value: unknown): value is EvidenceQuestionField => {
  if (!isRecord(value)) return false;
  const type = value.type as EvidenceQuestionFieldType;
  if (
    typeof value.key !== "string" ||
    !/^[a-z][a-zA-Z0-9]*$/.test(value.key) ||
    typeof value.label !== "string" ||
    value.label.length === 0 ||
    !FIELD_TYPES.has(type) ||
    typeof value.required !== "boolean" ||
    !optionalString(value.hint) ||
    !optionalString(value.pattern) ||
    (value.rows !== undefined &&
      (typeof value.rows !== "number" ||
        !Number.isInteger(value.rows) ||
        value.rows < 1 ||
        value.rows > 12))
  ) {
    return false;
  }
  const needsOptions = type === "select" || type === "multiselect";
  if (needsOptions !== (value.options !== undefined)) return false;
  if (needsOptions && !validOptions(value.options)) return false;
  if (type === "cpe-2.3" && value.pattern !== CPE_PATTERN) return false;
  if (type === "package-url" && value.pattern !== PURL_PATTERN) return false;
  return true;
};

const validEvidenceRequest = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.label === "string" &&
  value.label.length > 0 &&
  typeof value.description === "string" &&
  value.description.length > 0 &&
  typeof value.required === "boolean" &&
  Array.isArray(value.acceptedMediaTypes) &&
  value.acceptedMediaTypes.length > 0 &&
  value.acceptedMediaTypes.every(
    (mediaType) => typeof mediaType === "string" && mediaType.length > 0,
  ) &&
  typeof value.maxFiles === "number" &&
  Number.isInteger(value.maxFiles) &&
  value.maxFiles >= 1 &&
  value.maxFiles <= 20;

export const isQuestionResponse = (
  value: unknown,
): value is EvidenceQuestionResponse => {
  if (!isRecord(value) || !Array.isArray(value.fields)) return false;
  if (
    value.fields.length === 0 ||
    value.fields.length > 16 ||
    !value.fields.every(validField)
  ) {
    return false;
  }
  const keys = value.fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) return false;
  const knownKeys = new Set(keys);
  if (
    value.rules !== undefined &&
    (!Array.isArray(value.rules) ||
      value.rules.length > 16 ||
      !value.rules.every(
        (rule) =>
          isRecord(rule) &&
          rule.kind === "at-least-one" &&
          Array.isArray(rule.fields) &&
          rule.fields.length >= 2 &&
          new Set(rule.fields).size === rule.fields.length &&
          rule.fields.every(
            (field) => typeof field === "string" && knownKeys.has(field),
          ) &&
          typeof rule.message === "string" &&
          rule.message.length > 0,
      ))
  ) {
    return false;
  }
  return value.evidence === undefined || validEvidenceRequest(value.evidence);
};

export const questionPatternFor = (
  type: EvidenceQuestionFieldType,
): string | undefined => {
  if (type === "cpe-2.3") return CPE_PATTERN;
  if (type === "package-url") return PURL_PATTERN;
  return undefined;
};
