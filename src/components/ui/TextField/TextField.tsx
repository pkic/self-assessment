import React from "react";
import "../field.module.scss";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  fieldClassName?: string;
  hint?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  hideLabel = false,
  fieldClassName,
  hint,
  className,
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
  // whenever a hint is present so it stays exactly `label`.
  const effectiveAriaLabel = ariaLabel ?? (hint ? label : undefined);
  return (
    <label
      className={["pkimm-field", fieldClassName].filter(Boolean).join(" ")}
    >
      <span
        className={["pkimm-field__label", hideLabel && "pkimm-visually-hidden"]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </span>
      <input
        className={["pkimm-field__control", className]
          .filter(Boolean)
          .join(" ")}
        {...rest}
        aria-describedby={describedBy}
        aria-label={effectiveAriaLabel}
      />
      {hint ? (
        <span className="pkimm-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </label>
  );
};
