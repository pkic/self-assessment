import type {
  DurationUnit,
  EvidenceQuestionField,
  EvidenceQuestionFieldType,
  EvidenceQuestionResponse,
  FieldPresentation,
} from "./types";

const CPE_PATTERN = String.raw`^cpe:2\.3:(?:(?:\\.|[^:])*:){10}(?:\\.|[^:])*$`;
const PURL_PATTERN = String.raw`^pkg:[a-z][a-z0-9.+-]*/[^\s/]+(?:/[^\s/]+)*(?:@[^\s?#]+)?(?:\?[^\s#]+)?(?:#[^\s]+)?$`;
const FIELD_TYPES = new Set<EvidenceQuestionFieldType>([
  "text",
  "textarea",
  "date",
  "date-time",
  "date-range",
  "time",
  "month",
  "week",
  "url",
  "tel",
  "boolean",
  "select",
  "multiselect",
  "cpe-2.3",
  "package-url",
  "number",
  "duration",
]);
export const DURATION_UNITS = new Set<DurationUnit>([
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
  "decade",
]);
const PRESENTATION_TYPES: Record<FieldPresentation, EvidenceQuestionFieldType> =
  {
    checkbox: "boolean",
    radio: "select",
    range: "number",
  };

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

const optionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const validAllowedUnits = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length > 0 &&
  new Set(value).size === value.length &&
  value.every((unit) => DURATION_UNITS.has(unit as DurationUnit));

const validRows = (value: unknown): boolean =>
  value === undefined ||
  (typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12);

const validStep = (value: unknown): boolean =>
  value === undefined || (typeof value === "number" && value > 0);

// key, label, type, required, and the scalar constraint properties that
// apply regardless of type (hint, pattern, min, max, step, rows). Type-
// specific pairing (which properties a given type actually allows) is
// checked separately, this only validates each property's own shape.
const hasValidBasicShape = (
  value: Record<string, unknown>,
  type: EvidenceQuestionFieldType,
): boolean =>
  typeof value.key === "string" &&
  /^[a-z][a-zA-Z0-9]*$/.test(value.key) &&
  typeof value.label === "string" &&
  value.label.length > 0 &&
  FIELD_TYPES.has(type) &&
  typeof value.required === "boolean" &&
  optionalString(value.hint) &&
  optionalString(value.pattern) &&
  optionalNumber(value.min) &&
  optionalNumber(value.max) &&
  validStep(value.step) &&
  validRows(value.rows);

const hasValidOptions = (
  value: Record<string, unknown>,
  type: EvidenceQuestionFieldType,
): boolean => {
  const needsOptions = type === "select" || type === "multiselect";
  if (needsOptions !== (value.options !== undefined)) return false;
  return !needsOptions || validOptions(value.options);
};

const hasValidIdentifierPattern = (
  value: Record<string, unknown>,
  type: EvidenceQuestionFieldType,
): boolean => {
  if (type === "cpe-2.3") return value.pattern === CPE_PATTERN;
  if (type === "package-url") return value.pattern === PURL_PATTERN;
  return true;
};

// min/max/step only mean anything on "number"; reject them everywhere else
// rather than silently ignoring a constraint the type can't act on.
const hasValidNumericScope = (
  value: Record<string, unknown>,
  type: EvidenceQuestionFieldType,
): boolean =>
  type === "number" ||
  (value.min === undefined &&
    value.max === undefined &&
    value.step === undefined);

const hasValidDurationScope = (
  value: Record<string, unknown>,
  type: EvidenceQuestionFieldType,
): boolean => {
  if (type !== "duration") return value.allowedUnits === undefined;
  return (
    value.allowedUnits === undefined || validAllowedUnits(value.allowedUnits)
  );
};

// A presentation hint must pair with exactly the type it's a widget for
// (checkbox implies boolean, radio implies select, range implies number).
const hasValidPresentation = (
  value: Record<string, unknown>,
  type: EvidenceQuestionFieldType,
): boolean =>
  value.presentation === undefined ||
  PRESENTATION_TYPES[value.presentation as FieldPresentation] === type;

const validField = (value: unknown): value is EvidenceQuestionField => {
  if (!isRecord(value)) return false;
  const type = value.type as EvidenceQuestionFieldType;
  if (!hasValidBasicShape(value, type)) return false;
  if (!hasValidOptions(value, type)) return false;
  if (!hasValidIdentifierPattern(value, type)) return false;
  if (!hasValidNumericScope(value, type)) return false;
  if (!hasValidDurationScope(value, type)) return false;
  return hasValidPresentation(value, type);
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
