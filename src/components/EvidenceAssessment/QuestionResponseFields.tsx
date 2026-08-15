import React from "react";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { Select, TextArea, TextField } from "../ui";
import { responseDefinition } from "./questionResponse";
import type {
  EvidenceQuestion,
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

const inputTypeFor = (type: string): "date" | "url" | "text" => {
  if (type === "date") return "date";
  if (type === "url") return "url";
  return "text";
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
      {profile.runtime.questions?.requiredForKinds.includes(kind) ? (
        <fieldset className="evidence-assessment-status-options">
          <legend>Assessment finding</legend>
          {profile.runtime.questions.findings.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name={`finding-${question.id}`}
                value={option.value}
                checked={progress.finding === option.value}
                onChange={() => onChange({ finding: option.value })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {definition.fields.map((field) => {
        const value = progress.values[field.key];
        if (field.type === "textarea") {
          return (
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
        }
        if (field.type === "boolean") {
          return (
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
        }
        if (field.type === "select") {
          return (
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
        }
        if (field.type === "multiselect") {
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
        }
        return (
          <TextField
            key={field.key}
            label={field.label}
            hint={field.hint}
            type={inputTypeFor(field.type)}
            required={field.required}
            pattern={field.pattern}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => updateValue(field.key, event.target.value)}
          />
        );
      })}
    </div>
  );
};
