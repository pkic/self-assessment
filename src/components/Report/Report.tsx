import React, { useState } from "react";
import { ModuleData, ProgressData } from "../../types/types";
import MaturityWidget from "../MaturityWidget/MaturityWidget";
import ShareModal from "../ShareModal/ShareModal";
import { generateURL } from "../../utils/urlGenerator";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
} from "../../utils/maturityCalculations";
import "./Report.module.scss";

interface OverviewProps {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  onShare: () => void;
  onExportYAML: () => void;
  onExportPDF: () => void;
  onReset: () => void;
  onAssessmentName: (name: string) => void;
  onAssessorName: (name: string) => void;
  onUseCaseDescription: (description: string) => void;
}

export const Report: React.FC<OverviewProps> = ({
  modules,
  progress,
  assessmentName,
  assessorName,
  useCaseDescription,
  onExportPDF,
  onReset,
  onAssessmentName,
  onAssessorName,
  onUseCaseDescription,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareURL, setShareURL] = useState("");

  const overallMaturityLevel = calculateOverallMaturityLevel(modules, progress);
  const moduleMaturityLevels = calculateModuleMaturityLevels(modules, progress);

  const handleShare = () => {
    const url = generateURL(
      progress,
      assessmentName,
      assessorName,
      useCaseDescription,
    );
    setShareURL(url);
    setIsModalOpen(true);
  };

  const handleSendEmail = () => {
    const progressUrl = generateURL(
      progress,
      assessmentName,
      assessorName,
      useCaseDescription,
    );
    const subject = "PKI Maturity Model (PKIMM) Self-Assessment";
    const body = `
Below you find a link to your PKI Maturity Model (PKIMM) Self-Assessment. This link allows you to continue the assessment at a later stage. You can also export the results to PDF.

If you have any questions about the PKI Maturity Model, please reach out to our community at https://pkic.org/discussions.

Assessment URL:
${progressUrl}

Kind regards,
The PKI Maturity Model Working Group of the PKI Consortium
`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="pkimm-report">
      <h1>PKI Maturity Report</h1>

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

      <MaturityWidget
        level={overallMaturityLevel}
        label="Overall PKI Maturity Level"
      />

      <h3>Module Maturity Levels</h3>
      <div className="pkimm-module-widgets">
        {moduleMaturityLevels.map(({ module, level }) => (
          <MaturityWidget
            key={module}
            level={level}
            label={`${module}`}
            className="pkimm-module-maturity-widget"
          />
        ))}
      </div>

      <h3>Details</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Module</th>
            <th>Category</th>
            <th>Maturity Level</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((module) =>
            module.categories.map((category) => (
              <tr key={`${module.id}-${category.id}`}>
                <td>
                  {module.id}.{category.id}
                </td>
                <td>{module.name}</td>
                <td>{category.name}</td>
                <td>{progress[`${module.id}.${category.id}`].result}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>

      <div className="pkimm-actions-container">
        <button onClick={handleShare}>Share Progress</button>
        <button onClick={handleSendEmail}>Send Email</button>
        {/*<button onClick={onExportYAML}>Export to YAML</button>*/}
        <button onClick={onExportPDF}>Export to PDF</button>
        <button onClick={onReset}>Reset</button>
      </div>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        url={shareURL}
      />
    </div>
  );
};
