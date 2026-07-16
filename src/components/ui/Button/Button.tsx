import React from "react";
import "./Button.module.scss";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  leftIcon,
  type,
  className,
  children,
  ...rest
}) => (
  <button
    type={type ?? "button"}
    className={[
      "pkimm-btn",
      `pkimm-btn--${variant}`,
      `pkimm-btn--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  >
    {leftIcon != null && <span className="pkimm-btn__icon">{leftIcon}</span>}
    {children}
  </button>
);
