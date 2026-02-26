import React from "react";
import {
  ModuleData,
  ProgressData,
} from "../../types/types";
import { Category } from "../Category/Category";
import ReactMarkdown from "react-markdown";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import "./Module.module.scss";

interface ModuleProps {
  module: ModuleData;
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
  onNextSection: (nextId: string) => void;
}

export const Module: React.FC<ModuleProps> = ({
  module,
  progress,
  onLevelChange,
  onApplicabilityChange,
  onNextSection,
}) => {
  const { target, getActiveExtension } = useAssessmentTarget();
  const activeExtension = getActiveExtension();
  const isExtensionMode = target.kind === 'extension';
  const extensionId = isExtensionMode ? target.id : undefined;

  const extModule = activeExtension?.relevance.modules.find(m => m.id === module.id);

  const getNextSection = (currentId: string) => {
    switch (currentId) {
      case "G": return "M";
      case "M": return "O";
      case "O": return "R";
      case "R": return "report";
      default: return "report";
    }
  };

  const nextSectionId = getNextSection(module.id);
  const nextSectionName = nextSectionId === 'report' ? 'Report' : 
                          nextSectionId === 'M' ? 'Management' :
                          nextSectionId === 'O' ? 'Operations' : 'Resources';

  if (isExtensionMode && !extModule) {
    return (
      <div className="pkimm-module">
        <div className="pkimm-module-description">
          <h3>No extension assessment data for this module ({activeExtension?.extension.name}).</h3>
        </div>
        <button className="continue-button" onClick={() => onNextSection(nextSectionId)}>
          Continue to {nextSectionName}
        </button>
      </div>
    );
  }

  return (
    <div className="pkimm-module">
      <div className="pkimm-module-description">
        {isExtensionMode ? <h3>Module {module.name} ({activeExtension?.extension.name})</h3> : <ReactMarkdown>{module.description}</ReactMarkdown>}
      </div>
      {module.categories.map((category) => {
        const extCategory = extModule?.categories.find(c => c.id === category.id);
        
        return (
          <Category
            key={category.id}
            moduleId={module.id}
            category={category}
            extCategory={extCategory}
            extensionId={extensionId}
            progress={progress}
            onLevelChange={onLevelChange}
            onApplicabilityChange={onApplicabilityChange}
          />
        );
      })}
      <button className="continue-button" onClick={() => onNextSection(nextSectionId)}>
        Continue to {nextSectionName}
      </button>
    </div>
  );
};
