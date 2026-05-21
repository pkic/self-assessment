import React, { useState } from "react";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import MaturityWidget from "../MaturityWidget/MaturityWidget";
import ShareModal from "../ShareModal/ShareModal";
import { generateURL, exportToYAML } from "../../utils/urlGenerator";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
  calculateExtensionFloorScore,
  calculateExtensionMaturityLevels,
  calculateExtensionWeightedPKIMMScore,
  getEffectiveWeight,
  calculateBlendedLevel,
  getCategoryOverlayInfo,
  hasOverlays,
  OverlayOperation,
} from "../../utils/maturityCalculations";

const operationBadgeLabel = (op: OverlayOperation, value: number): string => {
  if (op === "override") return `= ${value}`;
  if (op === "multiplier") return `× ${value}`;
  return value >= 0 ? `+ ${value}` : `${value}`;
};

const formatWeight = (n: number): string =>
  Number.isInteger(n) ? n.toString() : n.toFixed(2);
import { EmailData } from "../../types/types";
import LevelResult from "../../enums/LevelResult";
import "./Report.module.scss";

interface UnifiedReportProps {
  email: EmailData | null;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  enabledExtensions: string[];
  onExportPDF: (extensionId?: string) => void;
  onReset: (extensionId?: string) => void;
  onAssessmentName: (name: string) => void;
  onAssessorName: (name: string) => void;
  onUseCaseDescription: (description: string) => void;
}

export const UnifiedReport: React.FC<UnifiedReportProps> = ({
  email,
  assessmentName,
  assessorName,
  useCaseDescription,
  enabledExtensions,
  onExportPDF,
  onReset,
  onAssessmentName,
  onAssessorName,
  onUseCaseDescription,
}) => {
  const { target, getModules, getProgress, getActiveExtension } =
    useAssessmentTarget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareURL, setShareURL] = useState("");

  const modules = getModules();
  const progress = getProgress();
  const activeExtension = getActiveExtension();

  const isExtensionMode = target.kind === "extension";
  const selectedExtensionId = isExtensionMode ? target.id : undefined;

  // Overall PKI maturity is the baseline (spec): Σ(Level_C × category.weight)
  // / Σ(category.weight). Extension activation does not change this view —
  // extension-specific scores are shown alongside as separate widgets.
  const overallMaturityLevel = calculateOverallMaturityLevel(
    modules,
    progress,
    [],
    [],
  );

  const moduleMaturityLevels = calculateModuleMaturityLevels(
    modules,
    progress,
    [],
    [],
  );

  const floorScore = activeExtension
    ? calculateExtensionFloorScore(modules, activeExtension, progress)
    : null;
  const weightedScore = activeExtension
    ? calculateExtensionWeightedPKIMMScore(modules, progress, activeExtension)
    : null;
  const extensionScore = activeExtension
    ? (calculateExtensionMaturityLevels(
        modules,
        [activeExtension],
        [activeExtension.extension.id],
        progress,
      )[0]?.level ?? null)
    : null;

  // Not Applicable categories are excluded from both the numerator and
  // the denominator — they aren't part of the user's PKI scope, so they
  // shouldn't count toward "X of Y assessed".
  const totalCategories = modules.reduce((acc, m) => {
    return (
      acc +
      m.categories.filter((c) => {
        const entry = progress[`${m.id}.${c.id}`];
        return entry?.applicability !== false;
      }).length
    );
  }, 0);
  const assessedCategories = modules.reduce((acc, m) => {
    return (
      acc +
      m.categories.filter((c) => {
        const entry = progress[`${m.id}.${c.id}`];
        return entry?.applicability !== false && (entry?.level ?? 0) > 0;
      }).length
    );
  }, 0);
  const notAssessedCount = modules.reduce((acc, m) => {
    return (
      acc +
      m.categories.filter((c) => {
        const entry = progress[`${m.id}.${c.id}`];
        const applicable = entry?.applicability !== false;
        return applicable && (entry?.level ?? 0) === 0;
      }).length
    );
  }, 0);
  const isIncomplete = notAssessedCount > 0;

  const handleShare = () => {
    const url = generateURL({
      progress,
      enabledExtensions: enabledExtensions.map((id) => ({
        id,
        version: "0.0.0",
      })),
      dataVersion: "1.0.0",
      stateSchemaVersion: 1,
      assessmentName,
      assessorName,
      useCaseDescription,
    });
    setShareURL(url);
    setIsModalOpen(true);
  };

  const handleSendEmail = () => {
    if (!email) return;
    const progressUrl = generateURL({
      progress,
      enabledExtensions: enabledExtensions.map((id) => ({
        id,
        version: "0.0.0",
      })),
      dataVersion: "1.0.0",
      stateSchemaVersion: 1,
      assessmentName,
      assessorName,
      useCaseDescription,
    });
    const mailtoLink = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body.replace("${progressUrl}", progressUrl))}`;
    window.open(mailtoLink, "_blank", "noopener,noreferrer");
  };

  const handleExportYAML = () => {
    exportToYAML({
      progress,
      enabledExtensions: enabledExtensions.map((id) => ({
        id,
        version: "0.0.0",
      })),
      dataVersion: "1.0.0",
      assessmentName,
      assessorName,
      useCaseDescription,
    });
  };

  return (
    <div className="pkimm-report">
      <h1>
        {isExtensionMode
          ? `${activeExtension?.extension.name} Report`
          : "PKI Maturity Report"}
      </h1>

      <div className="pkimm-user-inputs">
        <div>
          <label htmlFor="assessmentName">Assessment Name:</label>
          <input
            type="text"
            id="assessmentName"
            value={assessmentName}
            onChange={(e) => onAssessmentName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="assessorName">Assessor Name:</label>
          <input
            type="text"
            id="assessorName"
            value={assessorName}
            onChange={(e) => onAssessorName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="useCaseDescription">
            Description of the Use Case:
          </label>
          <textarea
            id="useCaseDescription"
            value={useCaseDescription}
            onChange={(e) => onUseCaseDescription(e.target.value)}
            maxLength={1500}
            rows={5}
          />
        </div>
      </div>

      {isIncomplete && (
        <div className="pkimm-incomplete-notice" role="status">
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
            categories are excluded from the rollup, the same way Not Applicable
            categories are.
          </p>
        </div>
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
        {modules.map((module) => {
          const moduleLevel =
            moduleMaturityLevels.find((m) => m.module === module.name)?.level ??
            0;
          const total = module.categories.filter((c) => {
            const entry = progress[`${module.id}.${c.id}`];
            return entry?.applicability !== false;
          }).length;
          const assessed = module.categories.filter((c) => {
            const entry = progress[`${module.id}.${c.id}`];
            return entry?.applicability !== false && (entry?.level ?? 0) > 0;
          }).length;
          const pct = total === 0 ? 0 : Math.round((assessed / total) * 100);
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
            {modules.map((module) => {
              const extModule = activeExtension?.relevance.modules.find(
                (m) => m.id === module.id,
              );
              return module.categories.map((category) => {
                const coreKey = `${module.id}.${category.id}`;
                const extKey = isExtensionMode
                  ? `${selectedExtensionId}.${module.id}.${category.id}`
                  : coreKey;
                const displayKey = isExtensionMode ? extKey : coreKey;
                const hasRelevance = !!extModule?.categories.find(
                  (c) => c.id === category.id,
                );

                return (
                  <tr key={displayKey}>
                    <td>{module.name}</td>
                    <td>{category.name}</td>
                    <td>
                      {isExtensionMode && activeExtension
                        ? (() => {
                            const effectiveWeight = getEffectiveWeight(
                              module.id,
                              category,
                              [activeExtension],
                              [activeExtension.extension.id],
                            );
                            return effectiveWeight === category.weight ? (
                              category.weight
                            ) : (
                              <span>
                                <strong>{effectiveWeight}</strong>
                              </span>
                            );
                          })()
                        : category.weight}
                    </td>
                    <td
                      style={{
                        color: `var(--pkimm-maturity-level-${
                          isExtensionMode && activeExtension && hasRelevance
                            ? Math.floor(
                                calculateBlendedLevel(
                                  module.id,
                                  category,
                                  activeExtension,
                                  progress,
                                ),
                              )
                            : progress[coreKey]?.level || 0
                        })`,
                        fontWeight: "bold",
                      }}
                    >
                      {isExtensionMode && activeExtension && hasRelevance
                        ? (() => {
                            const blendedLevel = calculateBlendedLevel(
                              module.id,
                              category,
                              activeExtension,
                              progress,
                            );
                            if (blendedLevel === -1) {
                              return LevelResult[-1];
                            }
                            const levelNum = Math.floor(blendedLevel);
                            return LevelResult[levelNum];
                          })()
                        : progress[coreKey]?.result || "Not Assessed"}
                    </td>
                  </tr>
                );
              });
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
                {modules.flatMap((module) =>
                  module.categories
                    .map((category) => {
                      const details = getCategoryOverlayInfo(
                        module.id,
                        category,
                        activeExtension,
                      );
                      if (!hasOverlays(details)) return null;
                      return (
                        <tr key={`overlay-${module.id}-${category.id}`}>
                          <td>{module.name}</td>
                          <td>{category.name}</td>
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
                                  {operationBadgeLabel(
                                    req.operation,
                                    req.value,
                                  )}
                                </span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })
                    .filter(Boolean),
                )}
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
                {activeExtension.relevance.modules.map((module) =>
                  module.categories.map((category) => {
                    const coreModule = modules.find((m) => m.id === module.id);
                    const coreCategory = coreModule?.categories.find(
                      (c) => c.id === category.id,
                    );
                    const extKey = `${activeExtension.extension.id}.${module.id}.${category.id}`;
                    const relLevel = progress[extKey]?.level ?? 0;
                    return (
                      <tr key={`rel-${extKey}`}>
                        <td>{coreModule?.name || module.id}</td>
                        <td>{coreCategory?.name || category.id}</td>
                        <td>{category.weight}</td>
                        <td
                          style={{
                            color: `var(--pkimm-maturity-level-${relLevel})`,
                            fontWeight: "bold",
                          }}
                        >
                          {LevelResult[relLevel]}
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="pkimm-actions-container">
        <button onClick={handleShare}>Share Progress</button>
        {email?.enabled && (
          <button onClick={handleSendEmail}>Send Email</button>
        )}
        <button onClick={handleExportYAML}>Export to YAML</button>
        <button onClick={() => onExportPDF(selectedExtensionId)}>
          Export to PDF
        </button>
        <button onClick={() => onReset(selectedExtensionId)}>Reset</button>
      </div>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        url={shareURL}
      />
    </div>
  );
};
