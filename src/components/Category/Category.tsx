import React from "react";
import {
  CategoryData,
  ProgressData,
  ExtensionCategoryData,
} from "../../types/types";
import ReactMarkdown from "react-markdown";
import styles from "./Category.module.scss";

console.log("Styles:", styles); // Add this line

interface CategoryProps {
  moduleId: string;
  category: CategoryData;
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
  extensionCategories?: {
    extensionId: string;
    extensionName: string;
    category: ExtensionCategoryData;
  }[];
}

export const Category: React.FC<CategoryProps> = ({
  moduleId,
  category,
  progress,
  onLevelChange,
  onApplicabilityChange,
  extensionCategories = [],
}) => {
  const selectedLevel =
    progress[`${moduleId}.${category.id}`] === undefined
      ? 0
      : progress[`${moduleId}.${category.id}`].level;
  const isApplicable =
    progress[`${moduleId}.${category.id}`] === undefined
      ? true
      : progress[`${moduleId}.${category.id}`].applicability;

  return (
    // keep only the name of the style class
    <div className="pkimm-category-card">
      <div className="pkimm-category-header">
        <div className="pkimm-category-text">
          <label className="pkimm-toggle-switch">
            <input
              type="checkbox"
              checked={isApplicable}
              onChange={() => onApplicabilityChange(moduleId, category.id)}
            />
            <span className="pkimm-slider"></span>
          </label>
          <strong>
            {moduleId}.{category.id} {category.name}
          </strong>
        </div>
      </div>
      {isApplicable && (
        <>
          <div className="pkimm-category-description">
            <ReactMarkdown>{category.description}</ReactMarkdown>
          </div>
          <div className="pkimm-levels">
            {category.levels.map((level, index) => (
              <div
                key={index}
                className={`pkimm-level-card ${selectedLevel === level.number ? "selected" : ""}`}
                onClick={() =>
                  onLevelChange(moduleId, category.id, level.number)
                }
              >
                <strong>{level.name}</strong>:{" "}
                <ReactMarkdown>{level.description}</ReactMarkdown>
              </div>
            ))}
          </div>

          {extensionCategories.length > 0 &&
            extensionCategories.map((ext) => {
              const extKey = `${ext.extensionId}.${moduleId}.${ext.category.id}`;
              const extSelectedLevel = progress[extKey]?.level || 1;
              const extIsApplicable =
                progress[extKey]?.applicability !== undefined
                  ? progress[extKey].applicability
                  : true;

              return (
                <div key={ext.extensionId} className="pkimm-extension-content">
                  <div className="pkimm-extension-header">
                    <label className="pkimm-toggle-switch">
                      <input
                        type="checkbox"
                        checked={extIsApplicable}
                        onChange={() =>
                          onApplicabilityChange(
                            moduleId,
                            ext.category.id,
                            ext.extensionId,
                          )
                        }
                      />
                      <span className="pkimm-slider"></span>
                    </label>
                    <strong>Extension: {ext.extensionName}</strong>
                  </div>
                  {extIsApplicable && (
                    <div className="pkimm-extension-body">
                      <div className="pkimm-extension-guidance">
                        <strong>Guidance:</strong>
                        <ReactMarkdown>{ext.category.guidance}</ReactMarkdown>
                      </div>
                      <div className="pkimm-extension-assessment">
                        <strong>Assessment:</strong>
                        <ReactMarkdown>{ext.category.assessment}</ReactMarkdown>
                      </div>
                      <div className="pkimm-levels">
                        {ext.category.levels.map((level, index) => (
                          <div
                            key={index}
                            className={`pkimm-level-card extension ${extSelectedLevel === level.number ? "selected" : ""}`}
                            onClick={() =>
                              onLevelChange(
                                moduleId,
                                ext.category.id,
                                level.number,
                                ext.extensionId,
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
        </>
      )}
    </div>
  );
};
