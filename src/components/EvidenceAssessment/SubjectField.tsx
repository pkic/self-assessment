import React from "react";
import { suggestedSubjectValue } from "../../assessment-engine/subject-convenience";
import type { AssessmentSubjectField } from "../../assessment-engine/types";
import { Button, TextArea, TextField } from "../ui";

interface Props {
  field: AssessmentSubjectField;
  subject: Record<string, string>;
  /** Muted marker after the label, such as "optional". */
  labelNote?: string;
  /** A problem with the current value, shown under the field. */
  error?: string;
  onChange: (field: string, value: string) => void;
}

export const SubjectField: React.FC<Props> = ({
  field,
  subject,
  labelNote,
  error,
  onChange,
}) => {
  const value = subject[field.key] ?? "";
  const suggested = suggestedSubjectValue(field, subject);
  const errorId = `subject-${field.key}-error`;
  const common = {
    label: field.label,
    required: field.required,
    labelNote,
    "aria-invalid": error ? true : undefined,
    "aria-errormessage": error ? errorId : undefined,
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
      {error ? (
        <p id={errorId} className="evidence-scope__error">
          {error}
        </p>
      ) : null}
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
