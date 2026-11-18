import React from "react";
import "../field.module.scss";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
  fieldClassName?: string;
  /** Short muted marker after the label, e.g. "optional". */
  labelNote?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hideLabel = false,
  fieldClassName,
  labelNote,
  className,
  children,
  ...rest
}) => (
  <label className={["pkimm-field", fieldClassName].filter(Boolean).join(" ")}>
    <span
      className={["pkimm-field__label", hideLabel && "pkimm-visually-hidden"]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
      {labelNote ? (
        <span className="pkimm-field__label-note" aria-hidden="true">
          {" "}
          ({labelNote})
        </span>
      ) : null}
    </span>
    <select
      className={["pkimm-field__control", className].filter(Boolean).join(" ")}
      {...rest}
      aria-label={rest["aria-label"] ?? (labelNote ? label : undefined)}
    >
      {children}
    </select>
  </label>
);
