import React from "react";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { DURATION_UNITS } from "../../assessment-engine/question-values";
import { Select, TextArea, TextField } from "../ui";
import { responseDefinition } from "./questionResponse";
import type {
  EvidenceQuestion,
  EvidenceQuestionField,
  EvidenceQuestionGroup,
  EvidenceQuestionProgress,
} from "./types";

interface Props {
  question: EvidenceQuestion;
  kind: EvidenceQuestionGroup["kind"];
  profile: AssessmentProfileData;
  progress: EvidenceQuestionProgress;
  onChange: (progress: Partial<EvidenceQuestionProgress>) => void;
}

type FieldValue = string | string[] | undefined;
type UpdateValue = (key: string, value: string | string[]) => void;

type NativeInputType =
  | "date"
  | "url"
  | "tel"
  | "time"
  | "month"
  | "week"
  | "number"
  | "range"
  | "text";

const inputTypeFor = (
  type: string,
  presentation: string | undefined,
): NativeInputType => {
  if (type === "number" && presentation === "range") return "range";
  if (type === "date") return "date";
  if (type === "url") return "url";
  if (type === "tel") return "tel";
  if (type === "time") return "time";
  if (type === "month") return "month";
  if (type === "week") return "week";
  if (type === "number") return "number";
  return "text";
};

// datetime-local reports and accepts local wall-clock time with no
// timezone attached to it. Convert to/from the canonical UTC ISO string
// (exactly what Date.prototype.toISOString() produces) at this boundary, so
// storage and scoring never see anything but UTC, only display does.
const utcToLocalInput = (utcIso: string): string => {
  const date = new Date(utcIso);
  if (Number.isNaN(date.valueOf())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const localInputToUtc = (localValue: string): string => {
  if (!localValue) return "";
  const date = new Date(localValue);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
};

const renderTextarea = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => (
  <TextArea
    key={field.key}
    label={field.label}
    hint={field.hint}
    required={field.required}
    rows={field.rows ?? 4}
    value={typeof value === "string" ? value : ""}
    onChange={(event) => updateValue(field.key, event.target.value)}
  />
);

const renderCheckboxBoolean = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => (
  <label key={field.key} className="evidence-assessment-question__checkbox">
    <input
      type="checkbox"
      checked={value === "yes"}
      required={field.required}
      onChange={(event) =>
        updateValue(field.key, event.target.checked ? "yes" : "no")
      }
    />
    <span>{field.label}</span>
  </label>
);

const renderBooleanSelect = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => (
  <Select
    key={field.key}
    label={field.label}
    required={field.required}
    value={typeof value === "string" ? value : ""}
    onChange={(event) => updateValue(field.key, event.target.value)}
  >
    <option value="">Select…</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </Select>
);

const renderRadioSelect = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
  questionId: string,
): React.ReactElement => (
  <fieldset key={field.key} className="evidence-assessment-question__radio">
    <legend>{field.label}</legend>
    {field.options?.map((option) => (
      <label key={option.value}>
        <input
          type="radio"
          name={`${questionId}-${field.key}`}
          value={option.value}
          checked={value === option.value}
          required={field.required}
          onChange={() => updateValue(field.key, option.value)}
        />
        <span>{option.label}</span>
      </label>
    ))}
  </fieldset>
);

const renderSelect = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => (
  <Select
    key={field.key}
    label={field.label}
    required={field.required}
    value={typeof value === "string" ? value : ""}
    onChange={(event) => updateValue(field.key, event.target.value)}
  >
    <option value="">Select…</option>
    {field.options?.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
);

const renderDateTime = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => (
  <TextField
    key={field.key}
    label={field.label}
    hint={field.hint}
    type="datetime-local"
    required={field.required}
    value={typeof value === "string" ? utcToLocalInput(value) : ""}
    onChange={(event) =>
      updateValue(field.key, localInputToUtc(event.target.value))
    }
  />
);

const renderDateRange = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => {
  const [start = "", end = ""] =
    typeof value === "string" ? value.split("|") : [];
  return (
    <fieldset
      key={field.key}
      className="evidence-assessment-question__date-range"
    >
      <legend>{field.label}</legend>
      <TextField
        label={`${field.label} start`}
        hideLabel
        type="date"
        required={field.required}
        value={start}
        onChange={(event) =>
          updateValue(field.key, `${event.target.value}|${end}`)
        }
      />
      <TextField
        label={`${field.label} end`}
        hideLabel
        type="date"
        required={field.required}
        value={end}
        onChange={(event) =>
          updateValue(field.key, `${start}|${event.target.value}`)
        }
      />
    </fieldset>
  );
};

const renderDuration = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => {
  const [amount = "", unit = ""] =
    typeof value === "string" ? value.split("|") : [];
  const units = field.allowedUnits ?? Array.from(DURATION_UNITS);
  return (
    <fieldset
      key={field.key}
      className="evidence-assessment-question__duration"
    >
      <legend>{field.label}</legend>
      <TextField
        label={`${field.label} amount`}
        hideLabel
        type="number"
        min={0}
        required={field.required}
        value={amount}
        onChange={(event) =>
          updateValue(field.key, `${event.target.value}|${unit}`)
        }
      />
      <Select
        label={`${field.label} unit`}
        hideLabel
        required={field.required}
        value={unit}
        onChange={(event) =>
          updateValue(field.key, `${amount}|${event.target.value}`)
        }
      >
        <option value="">Select…</option>
        {units.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </fieldset>
  );
};

const renderMultiselect = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => {
  const selected = Array.isArray(value) ? value : [];
  return (
    <fieldset
      key={field.key}
      className="evidence-assessment-question__multi-select"
    >
      <legend>{field.label}</legend>
      {field.options?.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={(event) =>
              updateValue(
                field.key,
                event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((item) => item !== option.value),
              )
            }
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
};

const renderGenericField = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
): React.ReactElement => (
  <TextField
    key={field.key}
    label={field.label}
    hint={field.hint}
    type={inputTypeFor(field.type, field.presentation)}
    required={field.required}
    pattern={field.pattern}
    min={field.min}
    max={field.max}
    step={field.step}
    value={typeof value === "string" ? value : ""}
    onChange={(event) => updateValue(field.key, event.target.value)}
  />
);

const renderResponseField = (
  field: EvidenceQuestionField,
  value: FieldValue,
  updateValue: UpdateValue,
  questionId: string,
): React.ReactElement => {
  if (field.type === "textarea")
    return renderTextarea(field, value, updateValue);
  if (field.type === "boolean" && field.presentation === "checkbox") {
    return renderCheckboxBoolean(field, value, updateValue);
  }
  if (field.type === "boolean")
    return renderBooleanSelect(field, value, updateValue);
  if (field.type === "select" && field.presentation === "radio") {
    return renderRadioSelect(field, value, updateValue, questionId);
  }
  if (field.type === "select") return renderSelect(field, value, updateValue);
  if (field.type === "date-time")
    return renderDateTime(field, value, updateValue);
  if (field.type === "date-range")
    return renderDateRange(field, value, updateValue);
  if (field.type === "duration")
    return renderDuration(field, value, updateValue);
  if (field.type === "multiselect")
    return renderMultiselect(field, value, updateValue);
  return renderGenericField(field, value, updateValue);
};

const renderFindingOptions = (
  profile: AssessmentProfileData,
  kind: EvidenceQuestionGroup["kind"],
  questionId: string,
  progress: EvidenceQuestionProgress,
  onChange: (progress: Partial<EvidenceQuestionProgress>) => void,
): React.ReactElement | null => {
  if (!profile.runtime.questions?.requiredForKinds.includes(kind)) return null;
  return (
    <fieldset className="evidence-assessment-status-options">
      <legend>Assessment finding</legend>
      {profile.runtime.questions.findings.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={`finding-${questionId}`}
            value={option.value}
            checked={progress.finding === option.value}
            onChange={() => onChange({ finding: option.value })}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
};

export const QuestionResponseFields: React.FC<Props> = ({
  question,
  kind,
  profile,
  progress,
  onChange,
}) => {
  const definition = responseDefinition(question, kind, profile);
  const updateValue = (key: string, value: string | string[]): void =>
    onChange({ values: { [key]: value } });

  return (
    <div className="evidence-assessment-question__response">
      {renderFindingOptions(profile, kind, question.id, progress, onChange)}
      {definition.fields.map((field) =>
        renderResponseField(
          field,
          progress.values[field.key],
          updateValue,
          question.id,
        ),
      )}
    </div>
  );
};
