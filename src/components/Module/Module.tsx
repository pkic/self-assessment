import React from "react";
import {
  ModuleData,
  ProgressData,
  ExtensionData,
  ExtensionCategoryData,
} from "../../types/types";
import { Category } from "../Category/Category";
import ReactMarkdown from "react-markdown";
import "./Module.module.scss";

interface ModuleProps {
  module: ModuleData;
  progress: Record<string, ProgressData>;
  onLevelChange: (
    moduleId: string,
    questionId: string,
    level: number,
    extensionId?: string,
  ) => void;
  onApplicabilityChange: (
    moduleId: string,
    questionId: string,
    extensionId?: string,
  ) => void;
}

export const Module: React.FC<ModuleProps> = ({
  module,
  progress,
  onLevelChange,
  onApplicabilityChange,
}) => {
  return (
    <div className="pkimm-module">
      <div className="pkimm-module-description">
        <ReactMarkdown>{module.description}</ReactMarkdown>
      </div>
      {module.categories.map((category) => {
        const key = `${module.id}.${category.id}`;
        if (!progress[key]) {
          console.warn(`Missing progress for category ${key}`);
        }
        return (
          <Category
            key={category.id}
            moduleId={module.id}
            category={category}
            progress={progress}
            onLevelChange={onLevelChange}
            onApplicabilityChange={onApplicabilityChange}
          />
        );
      })}
    </div>
  );
};
