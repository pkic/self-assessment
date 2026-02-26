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

  const categoriesToRender = isExtensionMode && activeExtension
    ? module.categories.filter(category =>
        activeExtension.relevance.modules
          .find(m => m.id === module.id)
          ?.categories.find(c => c.id === category.id)
      )
    : module.categories;

  if (isExtensionMode && categoriesToRender.length === 0) {
    return (
      <div className="pkimm-module">
        <div className="extension-module-header">
          <h3>Module {module.name}</h3>
          <span className="extension-badge">{activeExtension?.extension.name} Active</span>
        </div>
        <div className="pkimm-module-description">
          <p>No categories in this module are relevant to the <strong>{activeExtension?.extension.name}</strong> extension.</p>
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
        {isExtensionMode ? (
          <div className="extension-module-header">
            <h3>Module {module.name}</h3>
            <span className="extension-badge">{activeExtension?.extension.name} Active</span>
          </div>
        ) : <ReactMarkdown>{module.description}</ReactMarkdown>}
      </div>
      {categoriesToRender
        .map((category) => {
          const extCategory = extModule?.categories.find((c) => c.id === category.id);

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
