import React from "react";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import {
  buildLevelDistribution,
  buildScopeCoverage,
  buildReportScores,
  buildReportCompleteness,
  buildGapToNextLevel,
} from "../../utils/reportData";
import LevelResult from "../../enums/LevelResult";
import { Card } from "../ui";
import "./Evaluation.module.scss";

// A maturity-level colour token for levels 1–5; undefined for Not Assessed (0)
// and Not Applicable (-1), which fall back to the muted neutral treatment.
const levelColor = (level: number): string | undefined =>
  level >= 1 && level <= 5 ? `var(--pkimm-maturity-level-${level})` : undefined;

// A decorative SVG progress ring for a stat tile. The ratio is conveyed in
// text beside it, so the ring itself is aria-hidden.
const Ring: React.FC<{ pct: number }> = ({ pct }) => {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const offset = circ * (1 - clamped / 100);
  return (
    <svg
      className="pkimm-evaluation-ring"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="pkimm-evaluation-ring__bg"
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        strokeWidth="5"
      />
      <circle
        className="pkimm-evaluation-ring__fg"
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
};

const StatTile: React.FC<{ label: string; value: number; total: number }> = ({
  label,
  value,
  total,
}) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="pkimm-evaluation-tile">
      <div className="pkimm-evaluation-tile__body">
        <span className="pkimm-evaluation-tile__label">{label}</span>
        <span className="pkimm-evaluation-tile__num">
          {value} <small>/ {total}</small>
        </span>
        <span className="pkimm-evaluation-tile__pct">{pct}%</span>
      </div>
      <Ring pct={pct} />
    </div>
  );
};

// Read-only maturity dashboard for the full-mode Evaluation tab. Sources the
// same target-agnostic core data UnifiedReport does (via
// AssessmentTargetContext), so it reflects whichever target (core or an
// active extension's underlying core modules) is currently selected.
export const EvaluationView: React.FC = () => {
  const { getModules, getProgress, getRequirementProgress } =
    useAssessmentTarget();
  const modules = getModules();
  const progress = getProgress();
  const requirementProgress = getRequirementProgress();

  const scores = buildReportScores(
    modules,
    progress,
    null,
    requirementProgress,
  );
  const completeness = buildReportCompleteness(
    modules,
    progress,
    requirementProgress,
  );
  const distribution = buildLevelDistribution({
    modules,
    progress,
    requirementProgress,
  });
  const coverage = buildScopeCoverage({
    modules,
    progress,
    requirementProgress,
  });
  const gap = buildGapToNextLevel({ modules, progress, requirementProgress });

  return (
    <div className="pkimm-evaluation">
      <p className="pkimm-evaluation__intro">
        A read-only summary of your results — nothing here is editable.
      </p>
      <Card
        as="section"
        aria-labelledby="eval-summary"
        padding="md"
        className="pkimm-evaluation__section"
      >
        <h2 id="eval-summary">Maturity summary</h2>
        <div className="pkimm-evaluation-hero">
          <span
            className="pkimm-evaluation-hero__num"
            style={{ color: levelColor(scores.overall) }}
            aria-hidden="true"
          >
            {scores.overall >= 1 ? scores.overall : "–"}
          </span>
          <span className="pkimm-evaluation-hero__meta">
            <span className="pkimm-evaluation-hero__cap">Overall maturity</span>
            <span className="pkimm-evaluation-hero__name">
              {LevelResult[scores.overall]}
            </span>
          </span>
        </div>
        <div className="pkimm-evaluation-bars">
          {scores.modules.map((m) => (
            <div className="pkimm-evaluation-bar" key={m.moduleId}>
              <span className="pkimm-evaluation-bar__name">{m.module}</span>
              <span className="pkimm-evaluation-bar__track">
                <span
                  className="pkimm-evaluation-bar__fill"
                  style={{
                    width: `${(Math.max(m.level, 0) / 5) * 100}%`,
                    background: levelColor(m.level),
                  }}
                />
              </span>
              <span
                className="pkimm-evaluation-bar__lvl"
                style={{ color: levelColor(m.level) }}
              >
                {LevelResult[m.level]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="eval-completeness"
        padding="md"
        className="pkimm-evaluation__section"
      >
        <h2 id="eval-completeness">Completeness and coverage</h2>
        <div className="pkimm-evaluation-tiles">
          <StatTile
            label="Categories assessed"
            value={completeness.assessed}
            total={completeness.total}
          />
          <StatTile
            label="In-scope requirements assessed"
            value={completeness.requirements.assessed}
            total={completeness.requirements.totalInScope}
          />
          <StatTile
            label="Categories in scope"
            value={coverage.categoriesInScope}
            total={coverage.categoriesTotal}
          />
          <StatTile
            label="Requirements in scope"
            value={coverage.requirementsInScope}
            total={coverage.requirementsTotal}
          />
        </div>
        <div className="pkimm-evaluation-bars pkimm-evaluation-bars--mini">
          {completeness.perModule.map((m) => (
            <div className="pkimm-evaluation-bar" key={m.moduleId}>
              <span className="pkimm-evaluation-bar__name">{m.module}</span>
              <span className="pkimm-evaluation-bar__track">
                <span
                  className="pkimm-evaluation-bar__fill pkimm-evaluation-bar__fill--accent"
                  style={{ width: `${m.pct}%` }}
                />
              </span>
              <span className="pkimm-evaluation-bar__lvl pkimm-evaluation-bar__lvl--muted">
                {m.assessed} / {m.total} ({m.pct}%)
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="eval-distribution"
        padding="md"
        className="pkimm-evaluation__section"
      >
        <h2 id="eval-distribution">Level distribution</h2>
        <div className="pkimm-evaluation-stack">
          {distribution.groups.map((group) => {
            const s = group.subtotal;
            const groupTotal =
              s.notApplicable +
              s.notAssessed +
              s.levels.reduce((a, b) => a + b, 0);
            const segments = [
              {
                key: "na",
                label: "N/A",
                count: s.notApplicable,
                color: undefined,
              },
              {
                key: "not-assessed",
                label: "Not assessed",
                count: s.notAssessed,
                color: undefined,
              },
              ...s.levels.map((count, i) => ({
                key: `l${i + 1}`,
                label: `Level ${i + 1}`,
                count,
                color: levelColor(i + 1),
              })),
            ];
            const summary = segments
              .filter((seg) => seg.count > 0)
              .map((seg) => `${seg.count} ${seg.label}`)
              .join(", ");
            return (
              <div className="pkimm-evaluation-stack__row" key={group.moduleId}>
                <span className="pkimm-evaluation-stack__name">
                  {group.module}
                </span>
                <span className="pkimm-evaluation-stack__bar">
                  <span className="pkimm-visually-hidden">
                    {group.module}: {summary || "no categories"}
                  </span>
                  {groupTotal > 0 &&
                    segments.map((seg) =>
                      seg.count > 0 ? (
                        <span
                          key={seg.key}
                          className={`pkimm-evaluation-stack__seg pkimm-evaluation-stack__seg--${seg.key}`}
                          style={{
                            width: `${(seg.count / groupTotal) * 100}%`,
                            background: seg.color,
                          }}
                          title={`${seg.label}: ${seg.count}`}
                          aria-hidden="true"
                        />
                      ) : null,
                    )}
                </span>
              </div>
            );
          })}
          <div className="pkimm-evaluation-stack__legend" aria-hidden="true">
            <span>
              <span className="pkimm-evaluation-stack__dot pkimm-evaluation-stack__seg--na" />
              N/A
            </span>
            <span>
              <span className="pkimm-evaluation-stack__dot pkimm-evaluation-stack__seg--not-assessed" />
              Not assessed
            </span>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n}>
                <span
                  className="pkimm-evaluation-stack__dot"
                  style={{ background: levelColor(n) }}
                />
                L{n}
              </span>
            ))}
          </div>
        </div>

        <div className="pkimm-level-distribution">
          {distribution.grain === "category" && (
            <p className="pkimm-level-distribution__note">
              Counts are category-level (no requirement ratings yet).
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">N/A</th>
                <th scope="col">Not Assessed</th>
                {[1, 2, 3, 4, 5].map((level) => (
                  <th
                    key={level}
                    scope="col"
                    className={`pkimm-level-distribution__level-header pkimm-level-distribution__level-header--${level}`}
                  >
                    {level}
                  </th>
                ))}
                <th scope="col">Total applicable</th>
              </tr>
            </thead>
            <tbody>
              {distribution.groups.map((group) => (
                <React.Fragment key={group.moduleId}>
                  <tr className="pkimm-level-distribution__module-row">
                    <th scope="rowgroup" colSpan={9}>
                      {group.moduleId} — {group.module}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.categoryName}</th>
                      <td>{row.notApplicable}</td>
                      <td>{row.notAssessed}</td>
                      {row.levels.map((count, idx) => (
                        <td key={idx}>{count}</td>
                      ))}
                      <td>{row.totalApplicable}</td>
                    </tr>
                  ))}
                  <tr className="pkimm-level-distribution__subtotal-row">
                    <th scope="row">Subtotal</th>
                    <td>{group.subtotal.notApplicable}</td>
                    <td>{group.subtotal.notAssessed}</td>
                    {group.subtotal.levels.map((count, idx) => (
                      <td key={idx}>{count}</td>
                    ))}
                    <td>{group.subtotal.totalApplicable}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="pkimm-level-distribution__total-row">
                <th scope="row">Total</th>
                <td>{distribution.total.notApplicable}</td>
                <td>{distribution.total.notAssessed}</td>
                {distribution.total.levels.map((count, idx) => (
                  <td key={idx}>{count}</td>
                ))}
                <td>{distribution.total.totalApplicable}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {gap.length > 0 && (
        <Card
          as="section"
          aria-labelledby="eval-gap"
          padding="md"
          className="pkimm-evaluation__section pkimm-evaluation__gap"
        >
          <h2 id="eval-gap">Gap to next level</h2>
          <p className="pkimm-evaluation__gap-intro">
            For each requirement-assessed category below its top level, what it
            takes to reach the next level: the next level's criteria, the
            requirements currently capping the level, and the in-scope
            requirements still to assess.
          </p>
          <ul className="pkimm-evaluation__gap-list">
            {gap.map((row) => (
              <li className="pkimm-evaluation__gap-item" key={row.categoryKey}>
                <p className="pkimm-evaluation__gap-category">
                  {row.module} · {row.categoryName} — to reach{" "}
                  {row.nextLevelName || LevelResult[row.nextLevel]}
                </p>
                {row.nextLevelCriteria && (
                  <p className="pkimm-evaluation__gap-criteria">
                    {row.nextLevelCriteria}
                  </p>
                )}
                {row.limitingRequirements.length > 0 && (
                  <div className="pkimm-evaluation__gap-group">
                    <p className="pkimm-evaluation__gap-group-label">
                      <span className="pkimm-evaluation__gap-chip pkimm-evaluation__gap-chip--raise">
                        Raise
                      </span>
                      Requirements currently capping this level
                    </p>
                    <ul className="pkimm-evaluation__gap-group-list">
                      {row.limitingRequirements.map((req) => (
                        <li key={req.requirementKey}>
                          {req.description} — at {LevelResult[req.level]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.unassessedRequirements.length > 0 && (
                  <div className="pkimm-evaluation__gap-group">
                    <p className="pkimm-evaluation__gap-group-label">
                      <span className="pkimm-evaluation__gap-chip pkimm-evaluation__gap-chip--assess">
                        Assess
                      </span>
                      In-scope requirements not yet rated
                    </p>
                    <ul className="pkimm-evaluation__gap-group-list">
                      {row.unassessedRequirements.map((req) => (
                        <li key={req.requirementKey}>{req.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
