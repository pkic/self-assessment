import React from "react";

export interface ChoiceOption {
  value: string;
  label: string;
}

interface Props {
  legend: string;
  name: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /** Values that count as passing, shown in the success tone. */
  passingValues?: string[];
}

// Short option sets read best side by side; longer labels need a stacked list
// so no label is squeezed into a narrow column.
const SEGMENT_LABEL_LIMIT = 14;
const SEGMENT_COUNT_LIMIT = 5;

export const choiceLayout = (options: ChoiceOption[]): "segments" | "list" =>
  options.length <= SEGMENT_COUNT_LIMIT &&
  options.every((option) => option.label.length <= SEGMENT_LABEL_LIMIT)
    ? "segments"
    : "list";

/**
 * Tone for a chosen value. Passing values come from the profile; the other
 * tones follow the value names profiles use for partial and negative
 * outcomes, and anything else stays neutral.
 */
export const choiceTone = (
  value: string,
  passingValues: string[] = [],
): "ok" | "warn" | "danger" | "neutral" => {
  if (passingValues.includes(value)) return "ok";
  if (value === "not-assessed" || value === "not-applicable") return "neutral";
  if (value.includes("partial")) return "warn";
  if (value.startsWith("not-") || value.startsWith("does-not")) {
    return "danger";
  }
  return "neutral";
};

/** Radio choice shown as segments or, for long labels, a stacked list. */
export const ChoiceGroup: React.FC<Props> = ({
  legend,
  name,
  options,
  value,
  onChange,
  passingValues,
}) => (
  <fieldset
    className={`evidence-choice evidence-choice--${choiceLayout(options)}`}
  >
    <legend>{legend}</legend>
    <div className="evidence-choice__options">
      {options.map((option) => (
        <label
          key={option.value}
          className={`evidence-choice__option evidence-choice__option--${choiceTone(
            option.value,
            passingValues,
          )}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);
