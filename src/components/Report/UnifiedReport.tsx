import React, { useState } from "react";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import MaturityWidget from "../MaturityWidget/MaturityWidget";
import ShareModal from "../ShareModal/ShareModal";
import { generateURL } from "../../utils/urlGenerator";
import { OverlayOperation } from "../../utils/maturityCalculations";
import { buildReportData } from "../../utils/reportData";
import type { RequirementFilterState } from "../../utils/requirementFilter";
import {
  SECTION_ORDER,
  resolveSections,
  type SectionKey,
} from "../../utils/pdf/sections/registry";
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Select,
  TextField,
  TextArea,
  LevelBadge,
} from "../ui";

const operationBadgeLabel = (op: OverlayOperation, value: number): string => {
  if (op === "override") return `= ${value}`;
  if (op === "multiplier") return `× ${value}`;
  return value >= 0 ? `+ ${value}` : `${value}`;
};

const formatWeight = (n: number): string =>
  Number.isInteger(n) ? n.toString() : n.toFixed(2);

const SECTION_LABELS: Record<SectionKey, string> = {
  cover: "Cover page",
  attestationStatement: "Attestation statement",
  moduleMaturityBars: "Module maturity",
  timeline: "Timeline",
  scopeOverview: "Scope overview",
  maturityCharts: "Maturity distribution",
  completeness: "Completeness",
  pkiEnvironment: "PKI environment",
  references: "References",
  requirementDetails: "Requirement details",
  gapToNext: "Gap to next level",
  actionPlans: "Action plans",
  comparison: "Comparison to baseline",
  about: "About",
};
import { PkiEnvironment } from "../../types/types";
import "./Report.module.scss";

interface UnifiedReportProps {
  onDownload: () => void;
  /** The loaded model's version (e.g. "2.0.0"), used to stamp share/export
   *  URLs so a decoded link rehydrates against the correct category ids. */
  dataVersion: string;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  enabledExtensions: string[];
  onExportPDF: (
    reportTier: "self" | "assessment" | "detailed" | "attestation" | "custom",
    extensionId?: string,
    filter?: RequirementFilterState,
    sections?: SectionKey[],
  ) => void;
  /** Maps a SectionKey to a short "why it's empty" reason string, only for
   *  sections that currently have no data. A key absent from the map is
   *  available. Drives the Custom report's disabled-checkbox + reason UI;
   *  a disabled section is also force-excluded from the exported set even
   *  if it was seeded checked by a base preset. */
  sectionAvailability: Partial<Record<SectionKey, string>>;
  onReset: (extensionId?: string) => void;
  onAssessmentName: (name: string) => void;
  onAssessorName: (name: string) => void;
  onUseCaseDescription: (description: string) => void;
  organizationName: string;
  assessorCompany: string;
  assessorPosition: "" | "internal" | "external";
  assessmentType: "" | "self" | "formal" | "third-party";
  startDate: string;
  targetDate: string;
  finishDate: string;
  pkiEnvironment: PkiEnvironment;
  onOrganizationName: (v: string) => void;
  onAssessorCompany: (v: string) => void;
  onAssessorPosition: (v: "" | "internal" | "external") => void;
  onAssessmentType: (v: "" | "self" | "formal" | "third-party") => void;
  onStartDate: (v: string) => void;
  onTargetDate: (v: string) => void;
  onFinishDate: (v: string) => void;
  onPkiEnvironment: (field: keyof PkiEnvironment, v: string) => void;
  /** True for a transient (URL-hash, unsaved) assessment — shared links omit
   *  notes/evidence, so the Attestation report tier is disabled for these. */
  isTransient: boolean;
  /** True when the active category view is "full" (per-requirement
   *  questionnaire). Full-assessment-only report UI is gated on this: the
   *  report-type selector and the Organization/Timing/PKI-environment
   *  metadata form. Self view keeps only the core name/assessor/use-case
   *  fields and always exports the self-assessment report. */
  isFullView: boolean;
}

export const UnifiedReport: React.FC<UnifiedReportProps> = ({
  onDownload,
  dataVersion,
  assessmentName,
  assessorName,
  useCaseDescription,
  enabledExtensions,
  onExportPDF,
  onReset,
  onAssessmentName,
  onAssessorName,
  onUseCaseDescription,
  organizationName,
  assessorCompany,
  assessorPosition,
  assessmentType,
  startDate,
  targetDate,
  finishDate,
  pkiEnvironment,
  onOrganizationName,
  onAssessorCompany,
  onAssessorPosition,
  onAssessmentType,
  onStartDate,
  onTargetDate,
  onFinishDate,
  onPkiEnvironment,
  isTransient,
  isFullView,
  sectionAvailability,
}) => {
  const {
    target,
    getModules,
    getProgress,
    getRequirementProgress,
    getActiveExtension,
  } = useAssessmentTarget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareURL, setShareURL] = useState("");
  const [reportTier, setReportTier] = useState<
    "assessment" | "detailed" | "attestation" | "custom"
  >("assessment");
  const [reportFilter, setReportFilter] = useState<RequirementFilterState>({
    text: "",
    statuses: new Set(),
  });
  // Transient Custom-report picker state — never persisted/exported/URL'd.
  // customSections is seeded from customBase's preset the moment the base
  // changes (and starts pre-seeded from the default base below), so Custom
  // always opens with a sensible starting set rather than empty.
  const [customBase, setCustomBase] = useState<
    "attestation" | "assessment" | "detailed"
  >("assessment");
  const [customSections, setCustomSections] = useState<Set<SectionKey>>(
    () => new Set(resolveSections("assessment")),
  );
  const handleCustomBaseChange = (
    base: "attestation" | "assessment" | "detailed",
  ) => {
    setCustomBase(base);
    setCustomSections(new Set(resolveSections(base)));
  };
  const toggleCustomSection = (key: SectionKey) => {
    setCustomSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  // Self view has no report-type selector — it always exports the
  // self-assessment report. Full view exports whichever tier is selected.
  const exportTier:
    "self" | "assessment" | "detailed" | "attestation" | "custom" = isFullView
    ? reportTier
    : "self";
  const customRequirementDetailsActive =
    customSections.has("requirementDetails") &&
    !sectionAvailability.requirementDetails;
  const showRequirementFilter =
    reportTier === "detailed" ||
    (reportTier === "custom" && customRequirementDetailsActive);
  const exportFilter =
    exportTier === "detailed" ||
    (exportTier === "custom" && customRequirementDetailsActive)
      ? reportFilter
      : undefined;
  const exportSections =
    exportTier === "custom"
      ? SECTION_ORDER.filter(
          (key) => customSections.has(key) && !sectionAvailability[key],
        )
      : undefined;

  const modules = getModules();
  const progress = getProgress();
  const requirementProgress = getRequirementProgress();
  const activeExtension = getActiveExtension();

  const isExtensionMode = target.kind === "extension";
  const selectedExtensionId = isExtensionMode ? target.id : undefined;

  // Overall PKI maturity is the baseline (spec): Σ(Level_C × category.weight)
  // / Σ(category.weight). Extension activation does not change this view —
  // extension-specific scores are shown alongside as separate widgets.
  // Memoized so typing in the report's metadata inputs (which re-render this
  // component every keystroke) doesn't rebuild the whole report data set.
  const reportData = React.useMemo(
    () =>
      buildReportData({
        modules,
        progress,
        activeExtension: activeExtension ?? null,
        requirementProgress,
      }),
    [modules, progress, activeExtension, requirementProgress],
  );

  const overallMaturityLevel = reportData.scores.overall;
  const extensionScore = reportData.scores.extension;
  const floorScore = reportData.scores.floor;
  const weightedScore = reportData.scores.weighted;

  // Not Applicable categories are excluded from both the numerator and
  // the denominator — they aren't part of the user's PKI scope, so they
  // shouldn't count toward "X of Y assessed".
  const totalCategories = reportData.completeness.total;
  const assessedCategories = reportData.completeness.assessed;
  const notAssessedCount = reportData.completeness.notAssessed;
  const isIncomplete = reportData.completeness.isIncomplete;

  const handleShare = () => {
    const url = generateURL({
      progress,
      enabledExtensions: enabledExtensions.map((id) => ({
        id,
        version: "0.0.0",
      })),
      dataVersion,
      stateSchemaVersion: 1,
      assessmentName,
      assessorName,
      useCaseDescription,
      modules,
      requirementProgress,
    });
    setShareURL(url);
    setIsModalOpen(true);
  };

  return (
    <Card as="div" className="pkimm-report" padding="lg">
      <h1>
        {isExtensionMode
          ? `${activeExtension?.extension.name} Report`
          : "PKI Maturity Report"}
      </h1>

      <div className="pkimm-user-inputs">
        <div>
          <TextField
            label="Assessment Name:"
            type="text"
            id="assessmentName"
            value={assessmentName}
            onChange={(e) => onAssessmentName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Acme Root CA — 2026 annual review"
          />
        </div>
        <div>
          <TextField
            label="Assessor Name:"
            type="text"
            id="assessorName"
            value={assessorName}
            onChange={(e) => onAssessorName(e.target.value)}
            maxLength={100}
            placeholder="Your name"
          />
        </div>
        <div>
          <TextArea
            label="Description of the Use Case:"
            id="useCaseDescription"
            value={useCaseDescription}
            onChange={(e) => onUseCaseDescription(e.target.value)}
            maxLength={1500}
            rows={5}
            placeholder="What PKI is being assessed, its purpose, and any context for readers of the report…"
          />
        </div>

        {isFullView && (
          <>
            <h3 className="pkimm-user-inputs__subheading">
              Organization &amp; assessor
            </h3>
            <div>
              <TextField
                label="Assessed organization:"
                type="text"
                id="organizationName"
                value={organizationName}
                onChange={(e) => onOrganizationName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Acme Corp"
                hint="The organization whose PKI is being assessed."
              />
            </div>
            <div>
              <TextField
                label="Assessor's company:"
                type="text"
                id="assessorCompany"
                value={assessorCompany}
                onChange={(e) => onAssessorCompany(e.target.value)}
                maxLength={100}
                placeholder="e.g. Acme Corp (internal) or Auditor Ltd (external)"
                hint="Your organization, or the external auditor."
              />
            </div>
            <div>
              <Select
                label="Assessor position:"
                id="assessorPosition"
                value={assessorPosition}
                onChange={(e) =>
                  onAssessorPosition(
                    e.target.value as "" | "internal" | "external",
                  )
                }
              >
                <option value="">—</option>
                <option value="internal">internal</option>
                <option value="external">external</option>
              </Select>
              <p className="pkimm-user-inputs__help">
                Shown on the report header.
              </p>
            </div>
            <div>
              <Select
                label="Assessment type:"
                id="assessmentType"
                value={assessmentType}
                onChange={(e) =>
                  onAssessmentType(
                    e.target.value as "" | "self" | "formal" | "third-party",
                  )
                }
              >
                <option value="">—</option>
                <option value="self">Self-assessed</option>
                <option value="formal">Formal</option>
                <option value="third-party">Third-party</option>
              </Select>
              <p className="pkimm-user-inputs__help">
                Sets the report's assessment type and attestation trust rung.
              </p>
            </div>

            <h3 className="pkimm-user-inputs__subheading">Timing</h3>
            <div>
              <TextField
                label="Start date:"
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => onStartDate(e.target.value)}
                hint="When you began this assessment."
              />
            </div>
            <div>
              <TextField
                label="Target date:"
                type="date"
                id="targetDate"
                value={targetDate}
                onChange={(e) => onTargetDate(e.target.value)}
                hint="When you're aiming to finish — drives the countdown chip."
              />
            </div>
            <div>
              <TextField
                label="Finish date:"
                type="date"
                id="finishDate"
                value={finishDate}
                onChange={(e) => onFinishDate(e.target.value)}
                hint="When the assessment was completed — drives the duration chip."
              />
            </div>

            <h3 className="pkimm-user-inputs__subheading">PKI environment</h3>
            <div>
              <TextArea
                label="Components:"
                id="pkiEnvironmentComponents"
                value={pkiEnvironment.components ?? ""}
                onChange={(e) => onPkiEnvironment("components", e.target.value)}
                autoGrow
                rows={2}
                placeholder="e.g. Offline root CA, two issuing CAs, HSM-backed keys, OCSP responder…"
              />
            </div>
            <div>
              <TextArea
                label="Out-of-scope considerations:"
                id="pkiEnvironmentOutOfScope"
                value={pkiEnvironment.outOfScopeConsiderations ?? ""}
                onChange={(e) =>
                  onPkiEnvironment("outOfScopeConsiderations", e.target.value)
                }
                autoGrow
                rows={2}
                placeholder="e.g. Test/lab PKI, third-party managed sub-CAs…"
              />
            </div>
            <div>
              <TextArea
                label="High-level design:"
                id="pkiEnvironmentHighLevelDesign"
                value={pkiEnvironment.highLevelDesign ?? ""}
                onChange={(e) =>
                  onPkiEnvironment("highLevelDesign", e.target.value)
                }
                autoGrow
                rows={2}
                placeholder="e.g. Two-tier hierarchy; root offline; issuing CAs in HA…"
              />
            </div>
            <div>
              <TextArea
                label="Points of interaction:"
                id="pkiEnvironmentPointsOfInteraction"
                value={pkiEnvironment.pointsOfInteraction ?? ""}
                onChange={(e) =>
                  onPkiEnvironment("pointsOfInteraction", e.target.value)
                }
                autoGrow
                rows={2}
                placeholder="e.g. Enrollment portal, ACME endpoint, CRL/OCSP distribution…"
              />
            </div>
          </>
        )}
      </div>

      {isIncomplete && (
        <Banner tone="info">
          <div className="pkimm-incomplete-notice">
            <div className="pkimm-incomplete-notice__header">
              <span className="pkimm-incomplete-notice__title">
                Assessment in progress
              </span>
              <span className="pkimm-incomplete-notice__count">
                {assessedCategories} / {totalCategories} categories assessed
              </span>
            </div>
            <div
              className="pkimm-incomplete-notice__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalCategories}
              aria-valuenow={assessedCategories}
              aria-label="Assessment completion"
            >
              <div
                className="pkimm-incomplete-notice__bar-fill"
                style={{
                  width: `${Math.round(
                    totalCategories === 0
                      ? 0
                      : (assessedCategories / totalCategories) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="pkimm-incomplete-notice__hint">
              {notAssessedCount} categor
              {notAssessedCount === 1 ? "y is" : "ies are"} still Not Assessed.
              Maturity scores reflect only the assessed categories — unrated
              categories are excluded from the rollup, the same way Not
              Applicable categories are.
            </p>
          </div>
        </Banner>
      )}
      <div className="pkimm-module-widgets">
        <MaturityWidget
          level={overallMaturityLevel}
          label="Overall PKI Maturity Level"
        />
        {isExtensionMode && extensionScore !== null && (
          <MaturityWidget level={extensionScore} label="Extension Score" />
        )}
        {isExtensionMode && floorScore !== null && (
          <MaturityWidget level={floorScore} label="Floor Score" />
        )}
        {isExtensionMode && weightedScore !== null && (
          <MaturityWidget
            level={weightedScore}
            label="Extension-Weighted PKI Maturity Level"
          />
        )}
      </div>

      <details className="pkimm-metrics-help">
        <summary>About these metrics</summary>
        <dl>
          <dt>Overall PKI Maturity Level</dt>
          <dd>
            Weighted average of all assessed core categories using their base
            weights. Not Assessed and Not Applicable categories are excluded
            from the calculation.
          </dd>
          {isExtensionMode && (
            <>
              <dt>Extension Score</dt>
              <dd>
                Overall maturity through this extension&apos;s lens: each
                category&apos;s maturity is blended with the extension&apos;s
                relevance signal, then averaged using the extension&apos;s
                effective category weights.
              </dd>
              <dt>Floor Score</dt>
              <dd>
                The lowest blended category level across the extension&apos;s
                relevant categories. Surfaces the weakest-link risk inside the
                extension&apos;s scope, independent of the averaged Extension
                Score.
              </dd>
              <dt>Extension-Weighted PKI Maturity Level</dt>
              <dd>
                Baseline PKI maturity recalculated using the extension&apos;s
                weight emphasis. Same per-category levels as the Overall score;
                only the category weights are adjusted by the extension&apos;s
                overlays.
              </dd>
            </>
          )}
        </dl>
      </details>

      <h3>Module Weighted Maturity Levels</h3>
      <div className="pkimm-module-widgets pkimm-module-widgets--with-progress">
        {reportData.completeness.perModule.map((moduleProgress, index) => {
          const module = modules[index];
          const moduleLevel = reportData.scores.modules[index]?.level ?? 0;
          const { total, assessed, pct } = moduleProgress;
          const moduleLevelCls =
            moduleLevel > 0
              ? `pkimm-module-progress--level-${moduleLevel}`
              : "";
          return (
            <div className="pkimm-module-progress-card" key={module.id}>
              <MaturityWidget
                level={moduleLevel}
                label={module.name}
                className="pkimm-module-maturity-widget"
              />
              <div
                className={`pkimm-module-progress ${moduleLevelCls}`}
                title={`${assessed} of ${total} categories assessed`}
              >
                <div
                  className="pkimm-module-progress__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={assessed}
                  aria-label={`${module.name} completion`}
                >
                  <div
                    className="pkimm-module-progress__fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="pkimm-module-progress__count">
                  {assessed} / {total}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h3>Assessment Details</h3>
      <div className="pkimm-report-content">
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Category</th>
              <th>Weight</th>
              <th>Maturity Level</th>
            </tr>
          </thead>
          <tbody>
            {reportData.detailRows.map((row) => {
              const displayKey = isExtensionMode
                ? `${selectedExtensionId}.${row.key}`
                : row.key;

              return (
                <tr key={displayKey}>
                  <td>{row.module}</td>
                  <td>{row.category}</td>
                  <td>
                    {row.weightChanged ? (
                      <span>
                        <strong>{row.weightEffective}</strong>
                      </span>
                    ) : (
                      row.weightBase
                    )}
                  </td>
                  <td>
                    <LevelBadge
                      level={
                        row.hasRelevance
                          ? row.blendedLevelNum
                          : row.storedColorKey
                      }
                      variant="soft"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isExtensionMode && activeExtension && (
        <>
          <h3>Overlay Details</h3>
          <div className="pkimm-report-content">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Category</th>
                  <th>Overlays Applied</th>
                </tr>
              </thead>
              <tbody>
                {reportData.overlayRows.map((row) => {
                  const details = row.details;
                  return (
                    <tr key={`overlay-${row.key}`}>
                      <td>{row.module}</td>
                      <td>{row.category}</td>
                      <td className="pkimm-overlay-cell">
                        {details.category && (
                          <div className="pkimm-overlay-row pkimm-overlay-row--category">
                            <span className="pkimm-overlay-row__label">
                              <span className="pkimm-overlay-row__kind">
                                Category
                              </span>
                            </span>
                            <span className="pkimm-overlay-row__weights">
                              <span className="pkimm-overlay-row__base">
                                {formatWeight(details.category.base)}
                              </span>
                              <span className="pkimm-overlay-row__arrow">
                                →
                              </span>
                              <span className="pkimm-overlay-row__effective">
                                {formatWeight(details.category.effective)}
                              </span>
                            </span>
                            <span
                              className={`pkimm-overlay-badge pkimm-overlay-badge--${details.category.operation}`}
                            >
                              {operationBadgeLabel(
                                details.category.operation,
                                details.category.value,
                              )}
                            </span>
                          </div>
                        )}
                        {details.requirements.map((req) => (
                          <div
                            className="pkimm-overlay-row"
                            key={req.id}
                            title={req.description}
                          >
                            <span className="pkimm-overlay-row__label">
                              {req.description}
                            </span>
                            <span className="pkimm-overlay-row__weights">
                              <span className="pkimm-overlay-row__base">
                                {formatWeight(req.base)}
                              </span>
                              <span className="pkimm-overlay-row__arrow">
                                →
                              </span>
                              <span className="pkimm-overlay-row__effective">
                                {formatWeight(req.effective)}
                              </span>
                            </span>
                            <span
                              className={`pkimm-overlay-badge pkimm-overlay-badge--${req.operation}`}
                            >
                              {operationBadgeLabel(req.operation, req.value)}
                            </span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h3>Extension Relevance Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Category</th>
                  <th>Relevance Weight</th>
                  <th>Relevance Level</th>
                </tr>
              </thead>
              <tbody>
                {reportData.relevanceRows.map((row) => (
                  <tr key={`rel-${row.key}`}>
                    <td>{row.module}</td>
                    <td>{row.category}</td>
                    <td>{row.weight}</td>
                    <td>
                      <LevelBadge level={row.colorKey} variant="soft" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isFullView && target.kind === "original" && (
        <div className="pkimm-report-tier">
          <Select
            label="Report type:"
            id="reportTier"
            aria-label="Report type"
            value={reportTier}
            onChange={(e) =>
              setReportTier(
                e.target.value as
                  "assessment" | "detailed" | "attestation" | "custom",
              )
            }
          >
            <option value="assessment">Assessment</option>
            <option value="detailed">Detailed</option>
            <option
              value="attestation"
              disabled={isTransient}
              title={
                isTransient
                  ? "Attestation requires a saved assessment — shared links omit notes/evidence."
                  : undefined
              }
            >
              Attestation
            </option>
            <option value="custom">Custom</option>
          </Select>
        </div>
      )}

      {isFullView && target.kind === "original" && reportTier === "custom" && (
        <div className="pkimm-report-custom">
          <Select
            label="Start from:"
            id="reportCustomBase"
            aria-label="Start from"
            fieldClassName="pkimm-report-custom__base"
            value={customBase}
            onChange={(e) =>
              handleCustomBaseChange(
                e.target.value as "attestation" | "assessment" | "detailed",
              )
            }
          >
            <option value="attestation">Attestation</option>
            <option value="assessment">Assessment</option>
            <option value="detailed">Detailed</option>
          </Select>

          <ul className="pkimm-report-custom__list">
            {SECTION_ORDER.map((key) => {
              const reason = sectionAvailability[key];
              const labelId = `report-custom-${key}-label`;
              return (
                <li key={key} className="pkimm-report-custom__row">
                  <div className="pkimm-report-custom__row-main">
                    <Checkbox
                      labelledBy={labelId}
                      checked={customSections.has(key) && !reason}
                      disabled={!!reason}
                      onChange={() => toggleCustomSection(key)}
                    />
                    <span id={labelId} className="pkimm-report-custom__label">
                      {SECTION_LABELS[key]}
                    </span>
                  </div>
                  {reason && (
                    <span className="pkimm-report-custom__reason">
                      {reason}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isFullView && target.kind === "original" && showRequirementFilter && (
        <div className="pkimm-report-filter">
          <TextField
            label="Filter requirements:"
            type="text"
            fieldClassName="pkimm-report-filter__field"
            placeholder="Filter requirements by text…"
            value={reportFilter.text}
            onChange={(e) =>
              setReportFilter((prev) => ({ ...prev, text: e.target.value }))
            }
          />
          <div
            className="pkimm-report-filter__statuses"
            role="group"
            aria-label="Filter requirements in report"
          >
            {(
              [
                { value: "not-assessed", label: "Not assessed" },
                { value: "1", label: "Level 1" },
                { value: "2", label: "Level 2" },
                { value: "3", label: "Level 3" },
                { value: "4", label: "Level 4" },
                { value: "5", label: "Level 5" },
                { value: "completed", label: "Completed" },
                { value: "flagged", label: "Flagged" },
              ] as const
            ).map((status) => {
              const isActive = reportFilter.statuses.has(status.value);
              return (
                <Button
                  key={status.value}
                  variant="ghost"
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "pkimm-report-filter__status pkimm-report-filter__status--active"
                      : "pkimm-report-filter__status"
                  }
                  onClick={() =>
                    setReportFilter((prev) => {
                      const statuses = new Set(prev.statuses);
                      if (statuses.has(status.value)) {
                        statuses.delete(status.value);
                      } else {
                        statuses.add(status.value);
                      }
                      return { ...prev, statuses };
                    })
                  }
                >
                  {status.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pkimm-actions-container">
        {!isFullView && (
          <Button variant="secondary" onClick={handleShare}>
            Share progress
          </Button>
        )}
        <Button variant="secondary" onClick={onDownload}>
          Download assessment
        </Button>
        <Button
          variant="primary"
          disabled={
            exportTier === "custom" && (exportSections?.length ?? 0) === 0
          }
          onClick={() =>
            onExportPDF(
              exportTier,
              selectedExtensionId,
              exportFilter,
              exportSections,
            )
          }
        >
          Export to PDF
        </Button>
        <Button
          variant="secondary"
          onClick={() => onReset(selectedExtensionId)}
        >
          Reset
        </Button>
      </div>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        url={shareURL}
      />
    </Card>
  );
};
