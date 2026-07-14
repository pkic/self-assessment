import React from "react";
import "./IconButton.module.scss";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  variant = "ghost",
  size = "md",
  type,
  className,
  children,
  ...rest
}) => (
  <button
    type={type ?? "button"}
    aria-label={label}
    className={[
      "pkimm-icon-btn",
      `pkimm-icon-btn--${variant}`,
      `pkimm-icon-btn--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  >
    {children}
  </button>
);
