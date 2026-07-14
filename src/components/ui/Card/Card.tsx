import React from "react";
import "./Card.module.scss";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  padding?: "none" | "sm" | "md" | "lg";
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  as: Tag = "div",
  padding = "md",
  elevated = false,
  className,
  children,
  ...rest
}) => (
  <Tag
    className={[
      "pkimm-card",
      padding !== "none" && `pkimm-card--pad-${padding}`,
      elevated && "pkimm-card--elevated",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  >
    {children}
  </Tag>
);
