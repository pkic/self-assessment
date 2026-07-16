import React, { useState } from "react";
import {
  ModuleData,
  ProgressData,
  ReferenceEntry,
  RequirementProgress,
} from "../../types/types";
import { Category } from "../Category/Category";
import { RequirementFinder } from "../Category/RequirementFinder";
import type { WorkspaceLinks } from "../Category/RequirementCard";
import ReactMarkdown from "react-markdown";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import type { ViewMode } from "../Assessment/hooks/useViewMode";
import type { RequirementFilterState } from "../../utils/requirementFilter";
import type { RequirementEditableField } from "../../utils/requirementProgress";
import type { CategoryEditableField } from "../../utils/categoryProgress";
import "./Module.module.scss";

interface ModuleProps {
  module: ModuleData;
  view?: ViewMode;
  progress: Record<string, ProgressData>;
  referencesLookup?: Map<string, ReferenceEntry>;
  // Per-requirement workspace links (POC/artifact options) forwarded down to
  // Category → FullCategory → RequirementCard in full view. Optional so
  // hosts/tests that don't wire a workspace simply render no links group.
  workspaceLinks?: WorkspaceLinks;
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
  // Category-level "not applicable" reason capture. Optional so
  // hosts/tests that don't wire it simply render no reason field.
  onCategoryReason?: (
    moduleId: string,
    categoryId: string,
    reason: string,
    extensionId?: string,
  ) => void;
  // Category-level notes capture (self view only). Optional so
  // hosts/tests that don't wire it simply render no notes field.
  onCategoryNotes?: (
    moduleId: string,
    categoryId: string,
    notes: string,
    extensionId?: string,
  ) => void;
  onCategoryFieldChange?: <K extends CategoryEditableField>(
    moduleId: string,
    categoryId: string,
    field: K,
    value: ProgressData[K],
    extensionId?: string,
  ) => void;
  // Full-assessment requirement-level write path: forwarded down to the
  // per-requirement inputs that Category renders in full view.
  requirementProgress?: Record<string, RequirementProgress>;
  onRequirementLevelChange?: (
    moduleId: string,
    categoryId: string,
    requirementId: string,
    level: number,
  ) => void;
  onRequirementApplicabilityChange?: (
    moduleId: string,
    categoryId: string,
    requirementId: string,
  ) => void;
  onRequirementFieldChange?: <K extends RequirementEditableField>(
    moduleId: string,
    categoryId: string,
    requirementId: string,
    field: K,
    value: RequirementProgress[K],
  ) => void;
  onClearRequirementAssessments?: (
    moduleId: string,
    categoryId: string,
  ) => void;
  // Session resume: an externally-driven scroll target (e.g.
  // restoring lastPosition on load), separate from the finder's own
  // cross-category jump. Module owns which one is "pending" and clears the
  // external one via onExternalScrollConsumed once the owning Category acts
  // on it.
  externalScrollToKey?: string;
  onExternalScrollConsumed?: () => void;
  onCardFocus?: (key: string) => void;
}

export const Module: React.FC<ModuleProps> = ({
  module,
  view,
  progress,
  referencesLookup,
  workspaceLinks,
  onLevelChange,
  onApplicabilityChange,
  onCategoryReason,
  onCategoryNotes,
  onCategoryFieldChange,
  requirementProgress,
  onRequirementLevelChange,
  onRequirementApplicabilityChange,
  onRequirementFieldChange,
  onClearRequirementAssessments,
  externalScrollToKey,
  onExternalScrollConsumed,
  onCardFocus,
}) => {
  const { target, getActiveExtension } = useAssessmentTarget();
  const activeExtension = getActiveExtension();
  const isExtensionMode = target.kind === "extension";
  const extensionId = isExtensionMode ? target.id : undefined;

  const [filter, setFilter] = useState<RequirementFilterState>({
    text: "",
    statuses: new Set(),
  });
  // Cross-category jump target set by the finder's jump list; consumed by
  // the owning Category, which scrolls+focuses the card then clears it.
  const [jumpKey, setJumpKey] = useState<string | undefined>(undefined);

  const extModule = activeExtension?.relevance.modules.find(
    (m) => m.id === module.id,
  );

  const categoriesToRender =
    isExtensionMode && activeExtension
      ? module.categories.filter((category) =>
          activeExtension.relevance.modules
            .find((m) => m.id === module.id)
            ?.categories.find((c) => c.id === category.id),
        )
      : module.categories;

  if (isExtensionMode && categoriesToRender.length === 0) {
    return (
      <div className="pkimm-module">
        <div className="extension-module-header">
          <h3>Module {module.name}</h3>
          <span className="extension-badge">
            {activeExtension?.extension.name} Active
          </span>
        </div>
        <div className="pkimm-module-description">
          <p>
            No categories in this module are relevant to the{" "}
            <strong>{activeExtension?.extension.name}</strong> extension.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pkimm-module">
      <div className="pkimm-module-description">
        {isExtensionMode ? (
          <div className="extension-module-header">
            <h3>Module {module.name}</h3>
            <span className="extension-badge">
              {activeExtension?.extension.name} Active
            </span>
          </div>
        ) : (
          <ReactMarkdown>{module.description}</ReactMarkdown>
        )}
      </div>
      {!isExtensionMode && (
        <p className="pkimm-module__intro">
          {view === "full"
            ? "Rate each requirement on how well your PKI meets it. Not sure what a level means? Open Help (the ? button)."
            : "Rate each category from your own knowledge — open Help if you're unsure what a level means."}
        </p>
      )}
      {view === "full" && !isExtensionMode && (
        <RequirementFinder
          module={module}
          requirementProgress={requirementProgress}
          filter={filter}
          onFilterChange={setFilter}
          onJump={setJumpKey}
        />
      )}
      {categoriesToRender.map((category) => {
        const extCategory = extModule?.categories.find(
          (c) => c.id === category.id,
        );

        return (
          <Category
            key={category.id}
            moduleId={module.id}
            category={category}
            view={view}
            extCategory={extCategory}
            extensionId={extensionId}
            progress={progress}
            referencesLookup={referencesLookup}
            workspaceLinks={workspaceLinks}
            onLevelChange={onLevelChange}
            onApplicabilityChange={onApplicabilityChange}
            onCategoryReason={onCategoryReason}
            onCategoryNotes={onCategoryNotes}
            onCategoryFieldChange={onCategoryFieldChange}
            requirementProgress={requirementProgress}
            onRequirementLevelChange={onRequirementLevelChange}
            onRequirementApplicabilityChange={onRequirementApplicabilityChange}
            onRequirementFieldChange={onRequirementFieldChange}
            onClearRequirementAssessments={onClearRequirementAssessments}
            requirementFilter={
              view === "full" && !isExtensionMode ? filter : undefined
            }
            scrollToKey={jumpKey ?? externalScrollToKey}
            onScrollToKeyConsumed={() => {
              if (jumpKey) setJumpKey(undefined);
              else onExternalScrollConsumed?.();
            }}
            onCardFocus={onCardFocus}
          />
        );
      })}
    </div>
  );
};
