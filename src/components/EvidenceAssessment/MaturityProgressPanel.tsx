import React, { useMemo } from "react";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import {
  buildMaturityGateVisualization,
  type MaturityGateLevel,
} from "../../assessment-engine/visualizations/maturityGates";
import { Button } from "../ui";
import "./MaturityProgressPanel.module.scss";
import { criterionLabel } from "./criterionLabel";

export interface ProgressOption {
  value: string;
  label: string;
}

interface Props {
  levels: { number: number; name: string }[];
  score: GatedMaturityScore;
  /** Criterion text by id, used to name what is still outstanding. */
  criterionText: Map<string, string>;
  statuses: ProgressOption[];
  findings: ProgressOption[];
  scoringRule: string;
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
}

const MAX_OUTSTANDING = 3;

const maturityToken = (slot: number): string =>
  `var(--pkimm-maturity-level-${slot})`;

/**
 * CSS colour for a level's position on the maturity tokens. A position
 * between two tokens (long scales) blends them, so a host theme still drives
 * every colour.
 */
export const levelColor = (colorIndex: number): string => {
  if (colorIndex <= 0) return "var(--pkimm-text-color-muted)";
  const lower = Math.floor(colorIndex);
  const share = Math.round((colorIndex - lower) * 100);
  if (share === 0) return maturityToken(lower);
  return `color-mix(in oklch, ${maturityToken(lower + 1)} ${share}%, ${maturityToken(lower)})`;
};

/**
 * Text colour that keeps contrast on a filled maturity colour: light text on
 * the neutral and darkest colour, dark text on the brighter ones.
 */
export const levelInk = (colorIndex: number): string =>
  Math.round(colorIndex) <= 1
    ? "var(--pkimm-text-color-light)"
    : "var(--pkimm-text-color-dark)";

export const levelStyleVars = (colorIndex: number): React.CSSProperties =>
  ({
    "--evidence-step-color": levelColor(colorIndex),
    "--evidence-step-ink": levelInk(colorIndex),
  }) as React.CSSProperties;

/** Strips the Markdown the model uses so criterion text reads as a label. */
export const plainText = (markdown: string): string =>
  markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const levelStyle = (
  level: MaturityGateLevel,
  index: number,
  count: number,
): React.CSSProperties =>
  ({
    ...levelStyleVars(level.colorIndex),
    "--evidence-step-height": `${36 + (64 * index) / Math.max(1, count - 1)}%`,
    "--evidence-step-fill": `${level.status === "established" ? 100 : level.completionPercentage}%`,
  }) as React.CSSProperties;

const stepDescription = (level: MaturityGateLevel): string =>
  `Level ${level.level} ${level.name}: ${level.statusLabel}, ${level.criteriaMet} of ${level.criteriaTotal} criteria met`;

export const useGateVisualization = (
  score: GatedMaturityScore,
  levels: { number: number; name: string }[],
): MaturityGateLevel[] =>
  useMemo(() => buildMaturityGateVisualization(score, levels), [levels, score]);

export const MaturityProgressPanel: React.FC<Props> = ({
  levels,
  score,
  criterionText,
  statuses,
  findings,
  scoringRule,
  selectedLevel,
  onSelectLevel,
}) => {
  const visualization = useGateVisualization(score, levels);
  const claimed = visualization.find(
    (level) => level.level === score.achievedLevel,
  );
  const next = visualization.find((level) => level.level === score.nextLevel);
  const selected = visualization.find((level) => level.level === selectedLevel);
  const reasonLabel = (reason: string): string => {
    const label =
      statuses.find((status) => status.value === reason)?.label ?? reason;
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const findingTotal = findings.reduce(
    (sum, finding) => sum + (score.questionFindingCounts[finding.value] ?? 0),
    0,
  );

  return (
    <section
      className="evidence-progress"
      aria-labelledby="evidence-progress-heading"
    >
      <div
        className="evidence-progress__claim"
        style={levelStyleVars(claimed?.colorIndex ?? 0)}
        aria-live="polite"
      >
        <span className="evidence-progress__badge" aria-hidden="true">
          {claimed ? claimed.level : "–"}
        </span>
        <div>
          <span className="evidence-progress__eyebrow">Claimed level</span>
          <h3 id="evidence-progress-heading">
            {claimed
              ? `Level ${claimed.level} · ${claimed.name}`
              : "No level established"}
          </h3>
          <p>
            {claimed
              ? "Highest level with every criterion met, including all lower levels."
              : "Complete the baseline criteria to establish a level."}
          </p>
        </div>
      </div>

      <ol className="evidence-progress__stairs" aria-label="Maturity levels">
        {visualization.map((level, index) => (
          <li
            key={level.level}
            className={`evidence-progress__step evidence-progress__step--${level.status}`}
            style={levelStyle(level, index, visualization.length)}
          >
            <button
              type="button"
              aria-pressed={selectedLevel === level.level}
              aria-label={`${stepDescription(level)}. Show this level.`}
              title={`Level ${level.level} · ${level.name}`}
              onClick={() => onSelectLevel(level.level)}
            >
              <span className="evidence-progress__bar" aria-hidden="true">
                <span className="evidence-progress__fill" />
                <span className="evidence-progress__number">{level.level}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {selected ? (
        <p className="evidence-progress__selection" aria-hidden="true">
          <span>Showing </span>
          <strong>
            Level {selected.level} · {selected.name}
          </strong>
          <span> · {selected.statusLabel.toLowerCase()}</span>
        </p>
      ) : null}
      <ul className="evidence-progress__legend" aria-hidden="true">
        <li className="evidence-progress__legend--established">Established</li>
        <li className="evidence-progress__legend--progress">In progress</li>
        <li className="evidence-progress__legend--open">Not started</li>
      </ul>

      {next ? (
        <div
          className="evidence-progress__next"
          style={levelStyleVars(next.colorIndex)}
        >
          <div className="evidence-progress__next-heading">
            <strong>
              Next: Level {next.level} · {next.name}
            </strong>
            <span>
              {next.criteriaMet} of {next.criteriaTotal} criteria met
            </span>
          </div>
          <div
            className="evidence-progress__meter"
            role="progressbar"
            aria-label={`Level ${next.level} ${next.name} criteria completion`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={next.completionPercentage}
            aria-valuetext={`${next.criteriaMet} of ${next.criteriaTotal} criteria met`}
          >
            <span style={{ width: `${next.completionPercentage}%` }} />
          </div>
          {next.outstanding.length > 0 ? (
            <>
              <p className="evidence-progress__subheading">Still needed</p>
              <ul className="evidence-progress__outstanding">
                {next.outstanding.slice(0, MAX_OUTSTANDING).map((item) => (
                  <li key={item.criterionId}>
                    <code
                      title={`Criterion ${item.criterionId}`}
                      aria-label={`Criterion ${item.criterionId}`}
                    >
                      {criterionLabel(item.criterionId)}
                    </code>
                    <span>
                      {plainText(criterionText.get(item.criterionId) ?? "")}
                    </span>
                    {item.reason ? (
                      <small>{reasonLabel(item.reason)}</small>
                    ) : null}
                  </li>
                ))}
              </ul>
              {next.outstanding.length > MAX_OUTSTANDING ? (
                <p className="evidence-progress__more">
                  and {next.outstanding.length - MAX_OUTSTANDING} more
                </p>
              ) : null}
            </>
          ) : null}
          {selectedLevel !== next.level ? (
            <Button size="sm" onClick={() => onSelectLevel(next.level)}>
              Open Level {next.level}
            </Button>
          ) : null}
        </div>
      ) : claimed ? (
        <p className="evidence-progress__complete">
          Every level is established.
        </p>
      ) : null}

      <dl className="evidence-progress__stats">
        <div>
          <dt>Criteria met</dt>
          <dd>
            {score.criteriaMet}/{score.criteriaTotal}
          </dd>
        </div>
        <div>
          <dt>Questions answered</dt>
          <dd>
            {score.questionsAnswered}/{score.questionsTotal}
          </dd>
        </div>
        <div>
          <dt>Evidence files</dt>
          <dd>{score.evidenceFiles}</dd>
        </div>
      </dl>

      {findings.length > 0 ? (
        <details className="evidence-progress__findings">
          <summary>
            Question findings
            <span
              className="evidence-progress__findings-bar"
              aria-hidden="true"
            >
              {findings.map((finding, index) => {
                const count = score.questionFindingCounts[finding.value] ?? 0;
                return count > 0 ? (
                  <span
                    key={finding.value}
                    className={`evidence-progress__finding--${index}`}
                    style={{ flexGrow: count }}
                  />
                ) : null;
              })}
            </span>
            <span>{findingTotal}</span>
          </summary>
          <ul className="evidence-progress__finding-list">
            {findings.map((finding, index) => (
              <li key={finding.value}>
                <span
                  className={`evidence-progress__swatch evidence-progress__finding--${index}`}
                  aria-hidden="true"
                />
                <span>{finding.label}</span>
                <strong>
                  {score.questionFindingCounts[finding.value] ?? 0}
                </strong>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <details className="evidence-progress__rule">
        <summary>How the level is calculated</summary>
        <p>{scoringRule}</p>
      </details>
    </section>
  );
};

interface StripProps {
  levels: { number: number; name: string }[];
  score: GatedMaturityScore;
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
}

/** Compact level switcher that stays in view on narrow screens. */
export const MaturityLevelStrip: React.FC<StripProps> = ({
  levels,
  score,
  selectedLevel,
  onSelectLevel,
}) => {
  const visualization = useGateVisualization(score, levels);
  const selected = visualization.find((level) => level.level === selectedLevel);
  return (
    <nav className="evidence-level-strip" aria-label="Choose a maturity level">
      <span className="evidence-level-strip__label">
        {selected ? `Level ${selected.level} · ${selected.name}` : "Levels"}
      </span>
      <ol>
        {visualization.map((level, index) => (
          <li
            key={level.level}
            className={`evidence-progress__step--${level.status}`}
            style={levelStyle(level, index, visualization.length)}
          >
            <button
              type="button"
              aria-current={selectedLevel === level.level ? "step" : undefined}
              aria-label={stepDescription(level)}
              onClick={() => onSelectLevel(level.level)}
            >
              <span className="evidence-level-strip__fill" aria-hidden="true" />
              <span className="evidence-level-strip__number">
                {level.level}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};
