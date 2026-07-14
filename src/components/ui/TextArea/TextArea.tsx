import React from "react";
import "../field.module.scss";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  autoGrow?: boolean;
  hint?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  autoGrow,
  hint,
  className,
  onInput,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  ...rest
}) => {
  const reactId = React.useId();
  const hintId = hint ? `${reactId}-hint` : undefined;
  const describedBy =
    [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;
  // A hint sibling inside the wrapping <label> is picked up by the browser's
  // (and Testing Library's) implicit label-text computation, which would
  // otherwise fold the hint into the accessible name and have it announced
  // twice (once as name, once via aria-describedby). Pin the name explicitly
  // whenever a hint is present alongside a label so it stays exactly `label`.
  const effectiveAriaLabel = ariaLabel ?? (hint && label ? label : undefined);

  const handleInput = (e: React.InputEvent<HTMLTextAreaElement>) => {
    if (autoGrow) {
      const el = e.currentTarget;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    onInput?.(e);
  };

  const ta = (
    <textarea
      className={["pkimm-field__control", className].filter(Boolean).join(" ")}
      onInput={handleInput}
      {...rest}
      aria-describedby={describedBy}
      aria-label={effectiveAriaLabel}
    />
  );

  if (label || hint) {
    return (
      <label className="pkimm-field">
        {label ? <span className="pkimm-field__label">{label}</span> : null}
        {ta}
        {hint ? (
          <span className="pkimm-field__hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </label>
    );
  }
  return ta;
};
