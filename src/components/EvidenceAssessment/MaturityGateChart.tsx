import React, { useMemo } from "react";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import { buildMaturityGateVisualization } from "../../assessment-engine/visualizations/maturityGates";

interface Props {
  levels: { number: number; name: string }[];
  score: GatedMaturityScore;
}

export const MaturityGateChart: React.FC<Props> = ({ levels, score }) => {
  const visualization = useMemo(
    () => buildMaturityGateVisualization(score, levels),
    [levels, score],
  );

  return (
    <section
      className="evidence-assessment-maturity-path"
      aria-labelledby="evidence-assessment-maturity-path-heading"
    >
      <div className="evidence-assessment-section-heading">
        <h3 id="evidence-assessment-maturity-path-heading">Maturity path</h3>
        <p>
          Each level is cumulative. A later gate can have all of its own
          criteria complete without being established when an earlier gate is
          incomplete.
        </p>
      </div>
      <ol>
        {visualization.map((level) => (
          <li
            key={level.level}
            className={`evidence-assessment-maturity-gate evidence-assessment-maturity-gate--${level.status}`}
          >
            <div className="evidence-assessment-maturity-gate__heading">
              <span>Level {level.level}</span>
              <strong>{level.name}</strong>
            </div>
            <progress
              className="evidence-assessment-maturity-gate__progress"
              aria-label={`Level ${level.level} ${level.name} criteria completion`}
              aria-valuetext={`${level.criteriaMet} of ${level.criteriaTotal} criteria met`}
              max={100}
              value={level.completionPercentage}
            />
            <div className="evidence-assessment-maturity-gate__result">
              <span>{level.statusLabel}</span>
              <small>
                {level.criteriaMet}/{level.criteriaTotal} criteria
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
