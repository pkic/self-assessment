import React, { useState } from "react";
import {
  ExtensionData,
  ProgressData,
  AssessmentData,
} from "../../types/types";
import { ExtensionAssessment } from "../ExtensionAssessment/ExtensionAssessment";
import { ExtensionReport } from "../ExtensionReport/ExtensionReport";
import ReactMarkdown from "react-markdown";
import "./ExtensionsView.module.scss";

interface ExtensionsViewProps {
  extensions: ExtensionData[];
  enabledExtensions: string[];
  onToggle: (extensionId: string) => void;
  progress: Record<string, ProgressData>;
  coreData: AssessmentData;
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
  onResetExtension: (extensionId: string) => void;
  onExportExtensionPDF: (extensionId: string) => void;
}

export const ExtensionsView: React.FC<ExtensionsViewProps> = ({
  extensions,
  enabledExtensions,
  onToggle,
  progress,
  coreData,
  onLevelChange,
  onApplicabilityChange,
  onResetExtension,
  onExportExtensionPDF,
}) => {
  const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(
    extensions.length > 0 ? extensions[0].extension.id : null,
  );
  const [viewMode, setViewMode] = useState<"overview" | "G" | "M" | "O" | "R" | "report">("overview");

  const selectedExtension = extensions.find(
    (ext) => ext.extension.id === selectedExtensionId,
  ) || extensions[0];

  const isSelectedEnabled = enabledExtensions.includes(selectedExtension.extension.id);

  const handleNextSection = (nextMode: "overview" | "G" | "M" | "O" | "R" | "report") => {
    setViewMode(nextMode);
    const scrollQuerySelector = getComputedStyle(
      document.documentElement,
    ).getPropertyValue("--pkimm-scroll-query-selector");
    if (scrollQuerySelector === "window") {
      window.scrollTo(0, 0);
    } else {
      const element = document.querySelector(scrollQuerySelector);
      if (element) {
        element.scrollTo(0, 0);
      }
    }
  };

  return (
    <div className="pkimm-extensions-view">
      <div className="pkimm-extensions-view-sidebar">
        <h3>Extensions</h3>
        <ul>
          {extensions.map((ext) => (
            <li
              key={ext.extension.id}
              className={selectedExtension.extension.id === ext.extension.id ? "active" : ""}
              onClick={() => {
                setSelectedExtensionId(ext.extension.id);
                setViewMode("overview");
              }}
            >
              <div className="sidebar-item-content">
                <div className="sidebar-item-info">
                  <span className="extension-name">{ext.extension.name}</span>
                  <span className="extension-version">{ext.extension.version}</span>
                </div>
                <label className="pkimm-toggle-switch">
                  <input
                    type="checkbox"
                    checked={enabledExtensions.includes(ext.extension.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggle(ext.extension.id);
                    }}
                  />
                  <span className="pkimm-slider"></span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="pkimm-extensions-view-content">
        {!isSelectedEnabled ? (
          <div className="pkimm-extensions-view-disabled-overlay">
            <h3>{selectedExtension.extension.name} is disabled</h3>
            <p>{selectedExtension.extension.description}</p>
            <button className="enable-button" onClick={() => onToggle(selectedExtension.extension.id)}>
              Enable Extension
            </button>
          </div>
        ) : (
          <>
            <div className="pkimm-extensions-view-tabs">
              <button
                className={viewMode === "overview" ? "active" : ""}
                onClick={() => setViewMode("overview")}
              >
                Overview
              </button>
              <button
                className={viewMode === "G" ? "active" : ""}
                onClick={() => setViewMode("G")}
              >
                Governance
              </button>
              <button
                className={viewMode === "M" ? "active" : ""}
                onClick={() => setViewMode("M")}
              >
                Management
              </button>
              <button
                className={viewMode === "O" ? "active" : ""}
                onClick={() => setViewMode("O")}
              >
                Operations
              </button>
              <button
                className={viewMode === "R" ? "active" : ""}
                onClick={() => setViewMode("R")}
              >
                Resources
              </button>
              <button
                className={viewMode === "report" ? "active" : ""}
                onClick={() => setViewMode("report")}
              >
                Report
              </button>
            </div>
            <div className="pkimm-extensions-view-body">
              {viewMode === "overview" && (
                <div className="pkimm-module">
                  <div className="pkimm-module-description">
                    <h2>{selectedExtension.extension.name}</h2>
                    <ReactMarkdown>{selectedExtension.extension.description}</ReactMarkdown>
                  </div>
                  <button className="continue-button" onClick={() => handleNextSection("G")}>
                    Continue to Governance
                  </button>
                </div>
              )}
              {(viewMode === "G" || viewMode === "M" || viewMode === "O" || viewMode === "R") && (
                <ExtensionAssessment
                  extension={selectedExtension}
                  progress={progress}
                  onLevelChange={onLevelChange}
                  onApplicabilityChange={onApplicabilityChange}
                  coreData={coreData}
                  moduleId={viewMode}
                  onNextSection={handleNextSection}
                />
              )}
              {viewMode === "report" && (
                <ExtensionReport
                  extension={selectedExtension}
                  progress={progress}
                  coreModules={coreData.modules}
                  onReset={onResetExtension}
                  onExportPDF={onExportExtensionPDF}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
