import React from "react";
import "./Toggle.module.scss";

export interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: "sm" | "md";
  accent?: "primary" | "secondary";
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  size = "md",
  accent = "primary",
  disabled,
}) => (
  <label
    className={[
      "pkimm-toggle-switch",
      size === "sm" && "pkimm-toggle-switch--small",
      accent === "secondary" && "pkimm-toggle-switch--secondary",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      disabled={disabled}
      onChange={onChange}
    />
    <span className="pkimm-slider"></span>
  </label>
);
