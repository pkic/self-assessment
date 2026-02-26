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
  extensions?: ExtensionData[];
  enabledExtensions?: string[];
}

export const Module: React.FC<ModuleProps> = ({
  module,
  progress,
  onLevelChange,
  onApplicabilityChange,
  extensions = [],
  enabledExtensions = [],
}) => {
  return (
    <div className="pkimm-module">
      <div className="pkimm-module-description">
        <ReactMarkdown>{module.description}</ReactMarkdown>
      </div>
      {module.categories.map((category) => {
        const extensionCategories: {
          extensionId: string;
          extensionName: string;
          category: ExtensionCategoryData;
        }[] = [];

        extensions.forEach((ext) => {
          if (enabledExtensions.includes(ext.extension.id)) {
            const extModule = ext.relevance.modules.find(
              (m) => m.id === module.id,
            );
            const extCat = extModule?.categories.find(
              (c) => c.id === category.id,
            );
            if (extCat) {
              extensionCategories.push({
                extensionId: ext.extension.id,
                extensionName: ext.extension.name,
                category: extCat,
              });
            }
          }
        });

        return (
          <Category
            key={category.id}
            moduleId={module.id}
            category={category}
            progress={progress}
            onLevelChange={onLevelChange}
            onApplicabilityChange={onApplicabilityChange}
            extensionCategories={extensionCategories}
          />
        );
      })}
    </div>
  );
};
