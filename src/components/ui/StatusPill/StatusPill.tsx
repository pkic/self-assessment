import React from "react";
import "./StatusPill.module.scss";

export type StatusPillTone = "success" | "warning" | "neutral";

export interface StatusPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone: StatusPillTone;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  tone,
  type,
  className,
  children,
  ...rest
}) => (
  <button
    type={type ?? "button"}
    className={["pkimm-status-pill", `pkimm-status-pill--${tone}`, className]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  >
    {children}
  </button>
);
