import React from "react";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import type {
  ComparisonResult,
  Delta,
  ReconciliationRow,
} from "../../utils/comparison";
import LevelResult from "../../enums/LevelResult";
import { Button, Card, LevelBadge, Select } from "../ui";
import "./Comparison.module.scss";

export interface ComparisonPanelProps {
  baselineOptions: { id: string; name: string }[];
  activeBaselineLabel: string | null;
  comparison: ComparisonResult | null;
  reconciliation: ReconciliationRow[];
  unmappedNames: string[];
  aligned: boolean;
  onSelectStored: (id: string) => void;
  onSelectFile: (text: string) => void;
  onClear: () => void;
}

const DIR_GLYPH: Record<Delta["direction"], string> = {
  up: "▲",
  down: "▼",
  same: "–",
};

// A delta is comparable only when both sides have a real level (−1 is the
// Not-Applicable sentinel from calculateEffectiveCategoryLevel).
const isNa = (d: Delta): boolean => d.current === -1 || d.baseline === -1;

// Signed magnitude for the compact per-row chip: "+2" / "-2" / "0".
const deltaLabel = (d: Delta): string =>
  d.direction === "up"
    ? `+${d.delta}`
    : d.direction === "down"
      ? `${d.delta}`
      : "0";

// Full change phrase for the hero: word + signed magnitude.
const heroChange = (d: Delta): string =>
  d.direction === "up"
    ? `Improved +${d.delta}`
    : d.direction === "down"
      ? `Declined ${d.delta}`
      : "No change";

const dirClass = (dir: Delta["direction"]): string =>
  `pkimm-comparison__dir--${dir}`;

// Position (0–5 level) along the 0–100% track.
const pct = (level: number): string => `${(level / 5) * 100}%`;

const rowSummary = (name: string, d: Delta): string => {
  if (isNa(d)) return `${name}: not comparable`;
  const movement =
    d.direction === "up"
      ? `improved by ${d.delta}`
      : d.direction === "down"
        ? `declined by ${Math.abs(d.delta)}`
        : "no change";
  return `${name}: baseline ${LevelResult[d.baseline]}, current ${LevelResult[d.current]}, ${movement}`;
};

const DumbbellRow: React.FC<{ name: string; d: Delta }> = ({ name, d }) => {
  const na = isNa(d);
  return (
    <div className="pkimm-comparison__row">
      <span className="pkimm-comparison__name">{name}</span>
      {na ? (
        <span
          className="pkimm-comparison__na pkimm-comparison__na--track"
          aria-hidden="true"
        >
          Not comparable
        </span>
      ) : (
        <span className="pkimm-comparison__track" aria-hidden="true">
          <span className="pkimm-comparison__rail" />
          <span
            className={`pkimm-comparison__conn pkimm-comparison__conn--${d.direction}`}
            style={{
              left: pct(Math.min(d.baseline, d.current)),
              width: `${(Math.abs(d.delta) / 5) * 100}%`,
            }}
          />
          <span
            className="pkimm-comparison__dot pkimm-comparison__dot--base"
            style={{ left: pct(d.baseline) }}
          />
          <span
            className={`pkimm-comparison__dot pkimm-comparison__dot--cur pkimm-comparison__dot--lvl-${d.current}`}
            style={{ left: pct(d.current) }}
          />
        </span>
      )}
      <span
        className={`pkimm-comparison__delta ${dirClass(na ? "same" : d.direction)}`}
        aria-hidden="true"
      >
        {na ? (
          "–"
        ) : (
          <>
            <span>{DIR_GLYPH[d.direction]}</span> {deltaLabel(d)}
          </>
        )}
      </span>
      <span className="pkimm-visually-hidden">{rowSummary(name, d)}</span>
    </div>
  );
};

const PILL: Record<
  ReconciliationRow["status"],
  { label: string; glyph: string; cls: string }
> = {
  met: { label: "Met", glyph: "✓", cls: "pkimm-comparison__pill--met" },
  exceeded: {
    label: "Exceeded",
    glyph: "▲",
    cls: "pkimm-comparison__pill--exceeded",
  },
  "not-met": {
    label: "Not met",
    glyph: "✗",
    cls: "pkimm-comparison__pill--not-met",
  },
};

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  baselineOptions,
  activeBaselineLabel,
  comparison,
  reconciliation,
  unmappedNames,
  aligned,
  onSelectStored,
  onSelectFile,
  onClear,
}) => {
  const { target } = useAssessmentTarget();
  if (target.kind !== "original") return null;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => onSelectFile(text));
    e.target.value = "";
  };

  const modulesByOrder: string[] = [];
  const categoriesByModule = new Map<string, ComparisonResult["categories"]>();
  if (comparison) {
    for (const c of comparison.categories) {
      if (!categoriesByModule.has(c.module)) {
        categoriesByModule.set(c.module, []);
        modulesByOrder.push(c.module);
      }
      categoriesByModule.get(c.module)!.push(c);
    }
  }

  // Movement tally over comparable categories only (N/A on either side is
  // excluded — it describes categories that can actually be compared).
  let improved = 0;
  let declined = 0;
  let unchanged = 0;
  if (comparison) {
    for (const c of comparison.categories) {
      if (isNa(c.d)) continue;
      if (c.d.direction === "up") improved++;
      else if (c.d.direction === "down") declined++;
      else unchanged++;
    }
  }

  const metCount = reconciliation.filter((r) => r.status !== "not-met").length;

  return (
    <Card
      as="section"
      aria-labelledby="cmp-heading"
      padding="md"
      className="pkimm-comparison"
    >
      <h2 id="cmp-heading">Baseline comparison</h2>
      <div className="pkimm-comparison__controls">
        <Select
          label="Compare to"
          fieldClassName="pkimm-comparison__picker"
          value=""
          onChange={(e) => {
            if (e.target.value) onSelectStored(e.target.value);
          }}
        >
          <option value="">Select an assessment…</option>
          {baselineOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <label className="pkimm-field pkimm-comparison__file-field">
          <span className="pkimm-field__label">Compare to a file</span>
          <input
            id="cmp-file"
            type="file"
            className="pkimm-field__control"
            accept=".yaml,.yml"
            onChange={onFile}
          />
        </label>
      </div>

      {activeBaselineLabel && (
        <div className="pkimm-comparison__active">
          <span>Comparing to: {activeBaselineLabel}</span>
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear comparison
          </Button>
        </div>
      )}

      {aligned && (
        <p className="pkimm-comparison__note">
          Baseline aligned from a different model version by name matching
          {unmappedNames.length
            ? `; ${unmappedNames.length} item(s) couldn't be matched`
            : ""}
          .
        </p>
      )}

      {!comparison && (
        <p>
          Select a saved assessment or a file to compare this assessment against
          a baseline.
        </p>
      )}

      {comparison && (
        <div className="pkimm-comparison__viz">
          <div className="pkimm-comparison__hero">
            <span className="pkimm-comparison__hero-cap">Overall</span>
            {isNa(comparison.overall) ? (
              <span className="pkimm-comparison__na">Not comparable</span>
            ) : (
              <div className="pkimm-comparison__hero-body">
                <LevelBadge
                  level={comparison.overall.baseline}
                  variant="soft"
                />
                <span aria-hidden="true" className="pkimm-comparison__arrow">
                  →
                </span>
                <LevelBadge level={comparison.overall.current} />
                <span
                  className={`pkimm-comparison__change ${dirClass(comparison.overall.direction)}`}
                >
                  <span aria-hidden="true">
                    {DIR_GLYPH[comparison.overall.direction]}
                  </span>
                  <span className="pkimm-comparison__change-word">
                    {heroChange(comparison.overall)}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="pkimm-comparison__tally">
            <span className="pkimm-comparison__chip pkimm-comparison__dir--up">
              <span aria-hidden="true">▲</span>
              <span className="pkimm-comparison__chip-label">
                {improved} improved
              </span>
            </span>
            <span className="pkimm-comparison__chip pkimm-comparison__dir--down">
              <span aria-hidden="true">▼</span>
              <span className="pkimm-comparison__chip-label">
                {declined} declined
              </span>
            </span>
            <span className="pkimm-comparison__chip pkimm-comparison__dir--same">
              <span aria-hidden="true">–</span>
              <span className="pkimm-comparison__chip-label">
                {unchanged} unchanged
              </span>
            </span>
          </div>

          <div
            className="pkimm-comparison__rows"
            role="group"
            aria-label="Maturity change by module and category"
          >
            <p className="pkimm-comparison__section-label">Modules</p>
            {comparison.modules.map((m) => (
              <DumbbellRow key={m.moduleId} name={m.module} d={m.d} />
            ))}
            <p className="pkimm-comparison__section-label">Categories</p>
            {modulesByOrder.map((moduleName) => (
              <React.Fragment key={moduleName}>
                <p className="pkimm-comparison__group-head">{moduleName}</p>
                {categoriesByModule.get(moduleName)!.map((c) => (
                  <DumbbellRow key={c.key} name={c.categoryName} d={c.d} />
                ))}
              </React.Fragment>
            ))}
          </div>

          <div className="pkimm-comparison__legend" aria-hidden="true">
            <span className="pkimm-comparison__legend-item">
              <span className="pkimm-comparison__legend-dot pkimm-comparison__legend-dot--base" />
              Baseline
            </span>
            <span className="pkimm-comparison__legend-item">
              <span className="pkimm-comparison__legend-dot" />
              Current
            </span>
          </div>
        </div>
      )}

      {reconciliation.length > 0 && (
        <div className="pkimm-comparison__recon">
          <h3 className="pkimm-comparison__recon-head">
            Action plan reconciliation
          </h3>
          <p className="pkimm-comparison__recon-summary">
            {metCount} of {reconciliation.length} targets met
          </p>
          <div className="pkimm-comparison__recon-list">
            {reconciliation.map((r) => {
              const pill = PILL[r.status];
              return (
                <div className="pkimm-comparison__recon-row" key={r.key}>
                  <span className="pkimm-comparison__recon-name">
                    {r.categoryName}
                  </span>
                  <span className="pkimm-comparison__recon-levels">
                    Target {LevelResult[r.targetLevel]} · Now{" "}
                    {LevelResult[r.achieved]}
                  </span>
                  <span className={`pkimm-comparison__pill ${pill.cls}`}>
                    <span aria-hidden="true">{pill.glyph}</span>
                    <span className="pkimm-comparison__pill-label">
                      {pill.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
