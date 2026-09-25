import React from "react";
import { suggestedSubjectValue } from "../../assessment-engine/subject-convenience";
import type { AssessmentSubjectField } from "../../assessment-engine/types";
import { Button, TextArea, TextField } from "../ui";

interface Props {
  field: AssessmentSubjectField;
  subject: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export const SubjectField: React.FC<Props> = ({ field, subject, onChange }) => {
  const value = subject[field.key] ?? "";
  const suggested = suggestedSubjectValue(field, subject);
  const common = {
    label: field.label,
    required: field.required,
    hint: field.hint,
    value,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(field.key, event.target.value),
  };

  return (
    <div className="evidence-assessment-subject-field">
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
            Suggested CPE: <code>{suggested}</code>. Confirm the vendor's CPE
            naming before using it.
          </span>
          <Button size="sm" onClick={() => onChange(field.key, suggested)}>
            Use suggested CPE
          </Button>
        </div>
      ) : null}
    </div>
  );
};
