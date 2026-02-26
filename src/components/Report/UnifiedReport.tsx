import React, { useState } from "react";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import MaturityWidget from "../MaturityWidget/MaturityWidget";
import ShareModal from "../ShareModal/ShareModal";
import { generateURL, exportToYAML } from "../../utils/urlGenerator";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
  calculateExtensionFloorScore,
  calculateExtensionWeightedPKIMMScore,
  getEffectiveWeight,
  calculateBlendedLevel,
  getCategoryOverlayInfo,
} from "../../utils/maturityCalculations";
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
  const { target, getModules, getProgress, getActiveExtension } = useAssessmentTarget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareURL, setShareURL] = useState("");

  const modules = getModules();
  const progress = getProgress();
  const activeExtension = getActiveExtension();

  const isExtensionMode = target.kind === "extension";
  const selectedExtensionId = isExtensionMode ? target.id : undefined;

  const overallMaturityLevel = calculateOverallMaturityLevel(
    modules,
    progress,
    activeExtension ? [activeExtension] : [],
    selectedExtensionId ? [selectedExtensionId] : []
  );

  const moduleMaturityLevels = calculateModuleMaturityLevels(
    modules,
    progress,
    activeExtension ? [activeExtension] : [],
    selectedExtensionId ? [selectedExtensionId] : []
  );

  const floorScore = activeExtension ? calculateExtensionFloorScore(modules, activeExtension, progress) : null;
  const weightedScore = activeExtension ? calculateExtensionWeightedPKIMMScore(modules, progress, activeExtension) : null;

  const handleShare = () => {
    const url = generateURL(
      progress,
      assessmentName,
      assessorName,
      useCaseDescription,
      enabledExtensions,
    );
    setShareURL(url);
    setIsModalOpen(true);
  };

  const handleSendEmail = () => {
    if (!email) return;
    const progressUrl = generateURL(progress, assessmentName, assessorName, useCaseDescription, enabledExtensions);
    const mailtoLink = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body.replace("${progressUrl}", progressUrl))}`;
    window.open(mailtoLink, "_blank", "noopener,noreferrer");
  };

  const handleExportYAML = () => {
    exportToYAML(
      progress,
      assessmentName,
      assessorName,
      useCaseDescription,
      enabledExtensions,
    );
  };

  return (
    <div className="pkimm-report">
      <h1>{isExtensionMode ? `${activeExtension?.extension.name} Report` : "PKI Maturity Report"}</h1>

      <div className="pkimm-user-inputs">
        <div>
          <label htmlFor="assessmentName">Assessment Name:</label>
          <input type="text" id="assessmentName" value={assessmentName} onChange={(e) => onAssessmentName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <label htmlFor="assessorName">Assessor Name:</label>
          <input type="text" id="assessorName" value={assessorName} onChange={(e) => onAssessorName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <label htmlFor="useCaseDescription">Description of the Use Case:</label>
          <textarea id="useCaseDescription" value={useCaseDescription} onChange={(e) => onUseCaseDescription(e.target.value)} maxLength={1500} rows={5} />
        </div>
      </div>

      <div className="pkimm-module-widgets">
        <MaturityWidget level={overallMaturityLevel} label="Overall PKI Maturity Level" />
        {isExtensionMode && floorScore !== null && <MaturityWidget level={floorScore} label="Floor Score" />}
        {isExtensionMode && weightedScore !== null && <MaturityWidget level={weightedScore} label="Extension-Weighted PKI Maturity Level" />}
      </div>

      <h3>Module Weighted Maturity Levels</h3>
      <div className="pkimm-module-widgets">
        {moduleMaturityLevels.map(({ module, level }) => (
          <MaturityWidget key={module} level={level} label={module} className="pkimm-module-maturity-widget" />
        ))}
      </div>

      <h3>Assessment Details</h3>
      <div className="pkimm-report-content">
        <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Module</th>
            <th>Category</th>
            <th>Weight</th>
            <th>Maturity Level</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((module) => {
            const extModule = activeExtension?.relevance.modules.find((m) => m.id === module.id);
            return module.categories
              .map((category) => {
                const coreKey = `${module.id}.${category.id}`;
                const extKey = isExtensionMode ? `${selectedExtensionId}.${module.id}.${category.id}` : coreKey;
                const displayKey = isExtensionMode ? extKey : coreKey;
                const hasRelevance = !!extModule?.categories.find((c) => c.id === category.id);

                return (
                  <tr key={displayKey}>
                    <td>{module.id}.{category.id}</td>
                    <td>{module.name}</td>
                    <td>{category.name}</td>
                    <td>
                      {isExtensionMode && activeExtension ? (
                        (() => {
                          const effectiveWeight = getEffectiveWeight(module.id, category, [activeExtension], [activeExtension.extension.id]);
                          return effectiveWeight !== category.weight ? (
                            <span>
                              <strong>{effectiveWeight}</strong>
                            </span>
                          ) : (
                            category.weight
                          );
                        })()
                      ) : (
                        category.weight
                      )}
                    </td>
                    <td 
                      style={{ 
                        color: `var(--pkimm-maturity-level-${
                          isExtensionMode && activeExtension && hasRelevance
                            ? Math.floor(calculateBlendedLevel(module.id, category, activeExtension, progress)) 
                            : (progress[coreKey]?.level || 0)
                        })`, 
                        fontWeight: "bold" 
                      }}
                    >
                      {isExtensionMode && activeExtension && hasRelevance ? (
                        (() => {
                          const blendedLevel = calculateBlendedLevel(module.id, category, activeExtension, progress);
                          if (blendedLevel === -1) {
                            return LevelResult[-1];
                          }
                          const levelNum = Math.floor(blendedLevel);
                          return LevelResult[levelNum];
                        })()
                      ) : (
                        progress[coreKey]?.result || "Not Assessed"
                      )}
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
                <th>#</th>
                <th>Module</th>
                <th>Category</th>
                <th>Overlays Applied</th>
              </tr>
            </thead>
            <tbody>
              {modules.flatMap((module) =>
                module.categories
                  .map((category) => {
                    const overlayInfo = getCategoryOverlayInfo(module.id, category, activeExtension);
                    if (overlayInfo.length === 0) return null;
                    return (
                      <tr key={`overlay-${module.id}-${category.id}`}>
                        <td>{module.id}.{category.id}</td>
                        <td>{module.name}</td>
                        <td>{category.name}</td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85em" }}>
                            {overlayInfo.map((info, i) => (
                              <li key={i}>{info}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })
                  .filter(Boolean)
              )}
            </tbody>
          </table>

          <h3>Extension Relevance Details</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>
                <th>Relevance Weight</th>
                <th>Relevance Level</th>
              </tr>
            </thead>
            <tbody>
              {activeExtension.relevance.modules.map((module) =>
                module.categories.map((category) => {
                  const coreModule = modules.find((m) => m.id === module.id);
                  const coreCategory = coreModule?.categories.find((c) => c.id === category.id);
                  const extKey = `${activeExtension.extension.id}.${module.id}.${category.id}`;
                  const relLevel = progress[extKey]?.level || 1;
                  return (
                    <tr key={`rel-${extKey}`}>
                      <td>{module.id}.{category.id}</td>
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
        {email?.enabled && <button onClick={handleSendEmail}>Send Email</button>}
        <button onClick={handleExportYAML}>Export to YAML</button>
        <button onClick={() => onExportPDF(selectedExtensionId)}>Export to PDF</button>
        <button onClick={() => onReset(selectedExtensionId)}>Reset</button>
      </div>

      <ShareModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} url={shareURL} />
    </div>
  );
};
