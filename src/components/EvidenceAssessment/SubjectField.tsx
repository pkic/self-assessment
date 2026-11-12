import React from "react";
import { suggestedSubjectValue } from "../../assessment-engine/subject-convenience";
import type {
  AssessmentSubjectField,
  AssessmentSubjectRule,
} from "../../assessment-engine/types";
import { Button, TextArea, TextField } from "../ui";
import { fieldRequirementNote, RuleNote } from "./fieldRequirement";

interface Props {
  field: AssessmentSubjectField;
  subject: Record<string, string>;
  rules?: readonly AssessmentSubjectRule[];
  onChange: (field: string, value: string) => void;
}

export const SubjectField: React.FC<Props> = ({
  field,
  subject,
  rules,
  onChange,
}) => {
  const value = subject[field.key] ?? "";
  const suggested = suggestedSubjectValue(field, subject);
  const common = {
    label: field.label,
    required: field.required,
    labelNote: fieldRequirementNote(field, rules),
    hint: field.hint,
    value,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(field.key, event.target.value),
  };

  return (
    <div className="evidence-assessment-subject-field">
      <RuleNote field={field.key} rules={rules} />
      {field.component === "textarea" ? (
        <TextArea {...common} rows={field.rows ?? 3} />
      ) : (
        <TextField
          {...common}
          type={field.component === "date" ? "date" : "text"}
        />
      )}
      {suggested && suggested !== value ? (
        <div className="evidence-assessment-subject-suggestion">
          <span>
            Suggested {field.label}: <code>{suggested}</code>. Generated from
            the fields above, so confirm it against the official naming before
            using it.
          </span>
          <Button size="sm" onClick={() => onChange(field.key, suggested)}>
            Use suggestion
          </Button>
        </div>
      ) : null}
    </div>
  );
};
