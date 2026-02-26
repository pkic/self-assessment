import React from "react";
import {
  ExtensionData,
  ProgressData,
  AssessmentData,
} from "../../types/types";
import { Category } from "../Category/Category";
import ReactMarkdown from "react-markdown";
import "../Module/Module.module.scss";

interface ExtensionAssessmentProps {
  extension: ExtensionData;
  progress: Record<string, ProgressData>;
  onLevelChange: (
    moduleId: string,
    categoryId: string,
    level: number,
    extensionId?: string,
  ) => void;
  onApplicabilityChange: (
    moduleId: string,
    categoryId: string,
    extensionId?: string,
  ) => void;
  coreData: AssessmentData;
  moduleId: string;
  onNextSection: (nextMode: "overview" | "G" | "M" | "O" | "R" | "report") => void;
}

export const ExtensionAssessment: React.FC<ExtensionAssessmentProps> = ({
  extension,
  progress,
  onLevelChange,
  onApplicabilityChange,
  coreData,
  moduleId,
  onNextSection,
}) => {
  const getNextSection = (currentId: string): "overview" | "G" | "M" | "O" | "R" | "report" => {
    switch (currentId) {
      case "G":
        return "M";
      case "M":
        return "O";
      case "O":
        return "R";
      case "R":
        return "report";
      default:
        return "report";
    }
  };

  const nextSection = getNextSection(moduleId);
  const nextSectionLabel = nextSection === "report" ? "Report" : 
                           nextSection === "G" ? "Governance" :
                           nextSection === "M" ? "Management" :
                           nextSection === "O" ? "Operations" : "Resources";

  const extModule = extension.relevance.modules.find((m) => m.id === moduleId);
  const coreModule = coreData.modules.find((m) => m.id === moduleId);

  if (!extModule || !coreModule) {
    return (
      <div className="pkimm-module">
        <div className="pkimm-module-description">
          <p>No extension assessment data for this module.</p>
        </div>
        <button className="continue-button" onClick={() => onNextSection(nextSection)}>
          Continue to {nextSectionLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="pkimm-module">
      <div className="pkimm-module-description">
        <h3>Module {coreModule.name}</h3>
      </div>
      {extModule.categories.map((extCategory) => {
        const coreCategory = coreModule.categories.find(
          (c) => c.id === extCategory.id,
        );
        if (!coreCategory) return null;

        const extKey = `${extension.extension.id}.${extModule.id}.${extCategory.id}`;
        const extSelectedLevel = progress[extKey]?.level || 1;
        const extIsApplicable =
          progress[extKey]?.applicability !== undefined
            ? progress[extKey].applicability
            : true;

        return (
          <div key={extCategory.id} className="pkimm-category-card">
            <div className="pkimm-category-header">
              <div className="pkimm-category-text">
                <label className="pkimm-toggle-switch">
                  <input
                    type="checkbox"
                    checked={extIsApplicable}
                    onChange={() =>
                      onApplicabilityChange(
                        extModule.id,
                        extCategory.id,
                        extension.extension.id,
                      )
                    }
                  />
                  <span className="pkimm-slider"></span>
                </label>
                <strong>
                  {extModule.id}.{extCategory.id} {coreCategory.name} (Extension)
                </strong>
              </div>
            </div>
            {extIsApplicable && (
              <div className="pkimm-extension-body">
                <div className="pkimm-extension-guidance">
                  <strong>Guidance:</strong>
                  <ReactMarkdown>{extCategory.guidance}</ReactMarkdown>
                </div>
                <div className="pkimm-extension-assessment">
                  <strong>Assessment:</strong>
                  <ReactMarkdown>{extCategory.assessment}</ReactMarkdown>
                </div>
                <div className="pkimm-levels">
                  {extCategory.levels.map((level, index) => (
                    <div
                      key={index}
                      className={`pkimm-level-card extension ${extSelectedLevel === level.number ? "selected" : ""}`}
                      onClick={() =>
                        onLevelChange(
                          extModule.id,
                          extCategory.id,
                          level.number,
                          extension.extension.id,
                        )
                      }
                    >
                      <strong>{level.name}</strong>:{" "}
                      <ReactMarkdown>{level.description}</ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button className="continue-button" onClick={() => onNextSection(nextSection)}>
        Continue to {nextSectionLabel}
      </button>
    </div>
  );
};
