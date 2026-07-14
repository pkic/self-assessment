import React from "react";
import { MATURITY_LEVELS } from "./overviewContent";
import "./MaturityLadder.module.scss";

export const MaturityLadder: React.FC = () => (
  <ol
    className="pkimm-maturity-ladder"
    aria-label="The five PKI maturity levels, from Initial to Optimized"
  >
    {MATURITY_LEVELS.map((lvl) => (
      <li key={lvl.num} className="pkimm-maturity-ladder__rung">
        <div
          className={`pkimm-maturity-ladder__bar pkimm-maturity-ladder__bar--lvl-${lvl.num}`}
          aria-hidden="true"
        >
          <span className="pkimm-maturity-ladder__badge">{lvl.num}</span>
        </div>
        <div className="pkimm-maturity-ladder__label">
          <span className="pkimm-maturity-ladder__name">{lvl.name}</span>
          <span className="pkimm-maturity-ladder__desc">{lvl.description}</span>
        </div>
      </li>
    ))}
  </ol>
);
