import React from "react";
import "../field.module.scss";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
  fieldClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hideLabel = false,
  fieldClassName,
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
    </span>
    <select
      className={["pkimm-field__control", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </select>
  </label>
);
