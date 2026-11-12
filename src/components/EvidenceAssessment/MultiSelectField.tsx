import React, { useId, useState } from "react";
import {
  MAX_CUSTOM_ENTRY_LENGTH,
  validCustomEntry,
} from "../../assessment-engine/question-values";
import { Button, TextField } from "../ui";
import type { EvidenceQuestionField } from "./types";

interface Props {
  field: EvidenceQuestionField;
  value: string[];
  note?: string;
  onChange: (value: string[]) => void;
}

/**
 * A checkbox list for a multiselect answer. When the field allows it, the
 * person can also add entries the list doesn't have; those show as removable
 * items after the options.
 */
export const MultiSelectField: React.FC<Props> = ({
  field,
  value,
  note,
  onChange,
}) => {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const options = field.options ?? [];
  const listed = new Set(options.map((option) => option.value));
  const custom = value.filter((item) => !listed.has(item));
  const entry = draft.trim();
  const canAdd = validCustomEntry(entry) && !value.includes(entry);

  const add = () => {
    if (!canAdd) return;
    onChange([...value, entry]);
    setDraft("");
  };

  return (
    <fieldset className="evidence-multi">
      <legend>
        {field.label}
        {note ? (
          <span className="pkimm-field__label-note" aria-hidden="true">
            {" "}
            ({note})
          </span>
        ) : null}
      </legend>
      {field.hint ? <p className="evidence-multi__hint">{field.hint}</p> : null}
      <div className="evidence-multi__options">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, option.value]
                    : value.filter((item) => item !== option.value),
                )
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {field.allowCustom ? (
        <div className="evidence-multi__custom">
          {custom.length > 0 ? (
            <ul aria-label={`Other ${field.label.toLowerCase()}`}>
              {custom.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${item}`}
                    onClick={() =>
                      onChange(value.filter((entry_) => entry_ !== item))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="evidence-multi__add">
            <TextField
              id={inputId}
              label="Not listed? Add it"
              value={draft}
              maxLength={MAX_CUSTOM_ENTRY_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <Button disabled={!canAdd} onClick={add}>
              Add
            </Button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
};
