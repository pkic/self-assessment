import React from "react";
import { IconButton } from "../IconButton/IconButton";
import "./Banner.module.scss";

export interface BannerProps {
  tone: "info" | "success" | "danger";
  title?: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  tone,
  title,
  children,
  onDismiss,
  className,
}) => (
  <div
    className={["pkimm-banner", `pkimm-banner--${tone}`, className]
      .filter(Boolean)
      .join(" ")}
    role={tone === "danger" ? "alert" : "status"}
  >
    <div className="pkimm-banner__body">
      {title != null && <p className="pkimm-banner__title">{title}</p>}
      {children != null && (
        <div className="pkimm-banner__content">{children}</div>
      )}
    </div>
    {onDismiss != null && (
      <IconButton
        label="Dismiss"
        variant="ghost"
        size="sm"
        className="pkimm-banner__dismiss"
        onClick={onDismiss}
      >
        ×
      </IconButton>
    )}
  </div>
);
