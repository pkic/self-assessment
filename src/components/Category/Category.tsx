import React from "react";
import {
  CategoryData,
  ProgressData,
  ExtensionCategoryData,
  ReferenceEntry,
} from "../../types/types";
import ReactMarkdown from "react-markdown";
import "./Category.module.scss";

interface CategoryProps {
  moduleId: string;
  category: CategoryData;
  extCategory?: ExtensionCategoryData;
  extensionId?: string;
  progress: Record<string, ProgressData>;
  referencesLookup?: Map<string, ReferenceEntry>;
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
}

// Collects unique reference ids from the category source (either the
// requirements of a core category or the references field of an extension
// relevance category) and resolves them through the lookup map.
const collectReferenceIds = (
  category: CategoryData,
  extCategory?: ExtensionCategoryData,
): string[] => {
  const ids: string[] = [];
  if (extCategory) {
    const refs = extCategory.references;
    if (Array.isArray(refs)) ids.push(...refs);
  } else {
    for (const req of category.requirements ?? []) {
      const refs = req.references;
      if (Array.isArray(refs)) ids.push(...refs);
    }
  }
  return Array.from(new Set(ids));
};

export const Category: React.FC<CategoryProps> = ({
  moduleId,
  category,
  extCategory,
  extensionId,
  progress,
  referencesLookup,
  onLevelChange,
  onApplicabilityChange,
}) => {
  const key = extensionId
    ? `${extensionId}.${moduleId}.${category.id}`
    : `${moduleId}.${category.id}`;
  const categoryProgress = progress[key];
  const selectedLevel =
    categoryProgress === undefined ? 0 : categoryProgress.level;
  const isApplicable =
    categoryProgress === undefined ? true : categoryProgress.applicability;

  const levels = extCategory ? extCategory.levels : category.levels;
  const name = extCategory ? `${category.name} (Extension)` : category.name;
  const description = category.description;

  return (
    <div className={`pkimm-category-card ${extCategory ? "extension" : ""}`}>
      <div className="pkimm-category-header">
        <div className="pkimm-category-text">
          <label className="pkimm-toggle-switch">
            <input
              type="checkbox"
              checked={isApplicable}
              onChange={() =>
                onApplicabilityChange(moduleId, category.id, extensionId)
              }
            />
            <span className="pkimm-slider"></span>
          </label>
          <strong>
            {moduleId}.{category.id} {name}
          </strong>
        </div>
      </div>
      {isApplicable && (
        <>
          {extCategory && (
            <div className="pkimm-extension-body">
              <div className="pkimm-extension-guidance">
                <strong>Guidance:</strong>
                <ReactMarkdown>{extCategory.guidance}</ReactMarkdown>
              </div>
              <div className="pkimm-extension-assessment">
                <strong>Assessment:</strong>
                <ReactMarkdown>{extCategory.assessment}</ReactMarkdown>
              </div>
            </div>
          )}
          {!extCategory && (
            <div className="pkimm-category-description">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          )}
          <div className="pkimm-levels">
            {levels.map((level, index) => (
              <div
                key={index}
                className={`pkimm-level-card ${extCategory ? "extension" : ""} ${selectedLevel === level.number ? "selected" : ""}`}
                onClick={() =>
                  onLevelChange(
                    moduleId,
                    category.id,
                    level.number,
                    extensionId,
                  )
                }
              >
                <div className="pkimm-level-name">{level.name}</div>
                <div className="pkimm-level-description">
                  <ReactMarkdown>{level.description}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
          {(() => {
            const refIds = collectReferenceIds(category, extCategory);
            const resolved = referencesLookup
              ? refIds
                  .map((id) => referencesLookup.get(id))
                  .filter((r): r is ReferenceEntry => Boolean(r))
              : [];
            if (resolved.length === 0) return null;
            return (
              <details className="pkimm-category-references">
                <summary>References ({resolved.length})</summary>
                <ul>
                  {resolved.map((ref) => (
                    <li key={ref.id}>
                      {ref.url ? (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {ref.title}
                        </a>
                      ) : (
                        <span>{ref.title}</span>
                      )}
                      {ref.authority && (
                        <span className="pkimm-category-references__authority">
                          {" — "}
                          {ref.authority}
                        </span>
                      )}
                      {ref.regions?.map((region) => (
                        <span
                          key={region}
                          className="pkimm-category-references__region"
                        >
                          {region}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })()}
        </>
      )}
    </div>
  );
};
