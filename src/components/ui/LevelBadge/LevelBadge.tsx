import React from "react";
import LevelResult from "../../../enums/LevelResult";
import "./LevelBadge.module.scss";

export interface LevelBadgeProps {
  level: number;
  variant?: "solid" | "soft" | "text";
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  variant = "soft",
}) => {
  const label = LevelResult[level] ?? LevelResult[0];
  return (
    <span
      className={[
        "pkimm-level-badge",
        `pkimm-level-badge--${level}`,
        `pkimm-level-badge--${variant}`,
      ].join(" ")}
    >
      {label}
    </span>
  );
};
