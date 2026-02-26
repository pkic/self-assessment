import React from "react";
import {
  ExtensionData,
  ProgressData,
  ModuleData,
} from "../../types/types";
import MaturityWidget from "../MaturityWidget/MaturityWidget";
import {
  calculateExtensionMaturityLevels,
  calculateExtensionWeightedPKIMMScore,
  calculateExtensionFloorScore,
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
  getCategoryOverlayInfo,
  calculateBlendedLevel,
  getEffectiveWeight,
} from "../../utils/maturityCalculations";
import "../Report/Report.module.scss";

interface ExtensionReportProps {
  extension: ExtensionData;
  progress: Record<string, ProgressData>;
  coreModules: ModuleData[];
  onReset: (extensionId: string) => void;
  onExportPDF: (extensionId: string) => void;
}

export const ExtensionReport: React.FC<ExtensionReportProps> = ({
  extension,
  progress,
  coreModules,
  onReset,
  onExportPDF,
}) => {
  const extensionMaturity = calculateExtensionMaturityLevels(
    coreModules,
    [extension],
    [extension.extension.id],
    progress,
  )[0];

  const overallWeightedMaturity = calculateOverallMaturityLevel(
    coreModules,
    progress,
    [extension],
    [extension.extension.id]
  );

  const moduleWeightedMaturityLevels = calculateModuleMaturityLevels(
    coreModules,
    progress,
    [extension],
    [extension.extension.id]
  );

  const floorScore = calculateExtensionFloorScore(coreModules, extension, progress);

  const weightedScore = extension.extension.weightedScoreEnabled
    ? calculateExtensionWeightedPKIMMScore(coreModules, progress, extension)
    : null;

  return (
    <div className="pkimm-report">
      <h1>{extension.extension.name} Report</h1>

      <div className="pkimm-module-widgets">
        <MaturityWidget
          level={overallWeightedMaturity}
          label="Overall PKI Maturity Level"
        />
        {floorScore !== null && (
          <MaturityWidget
            level={floorScore}
            label="Floor Score"
          />
        )}
        {weightedScore !== null && (
          <MaturityWidget
            level={weightedScore}
            label="Extension-Weighted PKI Maturity Level"
          />
        )}
      </div>

      <h3>Module Weighted Maturity Levels</h3>
      <div className="pkimm-module-widgets">
        {moduleWeightedMaturityLevels.map(({ module, level }) => (
          <MaturityWidget
            key={module}
            level={level}
            label={`${module}`}
            className="pkimm-module-maturity-widget"
          />
        ))}
      </div>

      <h3>Assessment Details</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Module</th>
            <th>Category</th>
            <th>Weight</th>
            <th>Maturity Level</th>
            <th>Overlays Applied</th>
          </tr>
        </thead>
        <tbody>
          {coreModules.map((module) =>
            module.categories.map((category) => {
              const key = `${extension.extension.id}.${module.id}.${category.id}`;
              const overlayInfo = getCategoryOverlayInfo(module.id, category, extension);
              return (
                <tr key={key}>
                  <td>
                    {module.id}.{category.id}
                  </td>
                  <td>{module.name}</td>
                  <td>{category.name}</td>
                  <td>
                    {(() => {
                      const effectiveWeight = getEffectiveWeight(module.id, category, [extension], [extension.extension.id]);
                      return effectiveWeight !== category.weight ? (
                        <span>
                          <strong>{effectiveWeight}</strong>
                        </span>
                      ) : (
                        category.weight
                      );
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const blendedLevel = calculateBlendedLevel(module.id, category, extension, progress);
                      if (blendedLevel === -1) {
                        return "Not Applicable";
                      }
                      return `Level ${Math.floor(blendedLevel)} (${blendedLevel.toFixed(2)})`;
                    })()}
                  </td>
                  <td>
                    {overlayInfo.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85em" }}>
                        {overlayInfo.map((info, i) => (
                          <li key={i}>{info}</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: "#999", fontSize: "0.85em" }}>None</span>
                    )}
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>

      <div className="pkimm-actions-container">
        <button onClick={() => onExportPDF(extension.extension.id)}>
          Export PDF
        </button>
        <button onClick={() => onReset(extension.extension.id)}>
          Reset Extension
        </button>
      </div>
    </div>
  );
};
