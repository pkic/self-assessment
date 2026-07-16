import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalculator,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import {
  CategoryData,
  ProgressData,
  ExtensionCategoryData,
  ReferenceEntry,
  RequirementProgress,
} from "../../types/types";
import ReactMarkdown from "react-markdown";
import type { ViewMode } from "../Assessment/hooks/useViewMode";
import {
  calculateEffectiveCategoryLevel,
  explainEffectiveCategoryLevel,
} from "../../utils/effectiveLevel";
import type { RequirementEditableField } from "../../utils/requirementProgress";
import {
  buildRequirementViews,
  matchesFilter,
  nextUnassessedKey,
  type RequirementFilterState,
} from "../../utils/requirementFilter";
import LevelResult from "../../enums/LevelResult";
import { RequirementCard } from "./RequirementCard";
import type { WorkspaceLinks } from "./RequirementCard";
import { WorkspaceLinksSection } from "./WorkspaceLinksSection";
import type { CategoryEditableField } from "../../utils/categoryProgress";
import { ShowCalculationPopover } from "./ShowCalculationPopover";
import { Toggle, Button, IconButton, TextArea, Card, Menu } from "../ui";
import { useHelp } from "../Help/HelpProvider";
import "./Category.module.scss";

interface CategoryProps {
  moduleId: string;
  category: CategoryData;
  view?: ViewMode;
  extCategory?: ExtensionCategoryData;
  extensionId?: string;
  progress: Record<string, ProgressData>;
  referencesLookup?: Map<string, ReferenceEntry>;
  // Per-requirement workspace links (POC/artifact options) forwarded to
  // RequirementCard in full view. Optional so callers/tests that don't wire
  // a workspace simply render no links group.
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
  // callers/tests that don't wire it simply render no reason field.
  onCategoryReason?: (
    moduleId: string,
    categoryId: string,
    reason: string,
    extensionId?: string,
  ) => void;
  // Category-level notes capture (self view only). Optional so
  // callers/tests that don't wire it simply render no notes field.
  onCategoryNotes?: (
    moduleId: string,
    categoryId: string,
    notes: string,
    extensionId?: string,
  ) => void;
  // Category-grain additive fields (extension full view): evidence + the
  // three workspace-link fields. Optional so callers/tests that don't wire it
  // simply render no evidence/workspace block.
  onCategoryFieldChange?: <K extends CategoryEditableField>(
    moduleId: string,
    categoryId: string,
    field: K,
    value: ProgressData[K],
    extensionId?: string,
  ) => void;
  // Full-assessment requirement-level write path: the per-requirement inputs
  // shown when view === "full" call these.
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
  // RequirementFinder wiring: when present, the full-view branch
  // hides any card whose view fails matchesFilter. Empty filter (no text,
  // no statuses) matches everything, so unfiltered behavior is unchanged.
  requirementFilter?: RequirementFilterState;
  // Cross-category jump target set by the finder's jump list. When this
  // key belongs to a requirement in this category, the FullCategory
  // scrolls+focuses that card, then calls onScrollToKeyConsumed to clear
  // the pending jump in the parent.
  scrollToKey?: string;
  onScrollToKeyConsumed?: () => void;
  // Session resume: reports the requirement key whenever a card
  // (or a control inside it) receives focus. Callers debounce/settle this
  // before writing lastPosition — Category just reports every focus event.
  onCardFocus?: (key: string) => void;
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

interface FullCategoryProps {
  moduleId: string;
  category: CategoryData;
  name: string;
  progress: Record<string, ProgressData>;
  categoryProgress: ProgressData | undefined;
  isApplicable: boolean;
  referencesLookup?: Map<string, ReferenceEntry>;
  requirementProgress?: Record<string, RequirementProgress>;
  // Distinct interface from CategoryProps (no extends), so this needs its
  // own workspaceLinks field even though the shape is identical.
  workspaceLinks?: WorkspaceLinks;
  onApplicabilityChange: (moduleId: string, categoryId: string) => void;
  onCategoryReason?: (
    moduleId: string,
    categoryId: string,
    reason: string,
  ) => void;
  onRequirementLevelChange?: CategoryProps["onRequirementLevelChange"];
  onRequirementApplicabilityChange?: CategoryProps["onRequirementApplicabilityChange"];
  onRequirementFieldChange?: CategoryProps["onRequirementFieldChange"];
  onClearRequirementAssessments?: CategoryProps["onClearRequirementAssessments"];
  requirementFilter?: RequirementFilterState;
  scrollToKey?: string;
  onScrollToKeyConsumed?: () => void;
  onCardFocus?: (key: string) => void;
}

// Full-assessment card list: one RequirementCard per in-scope requirement,
// plus a sticky sub-header carrying the live effective level, an
// assessed-count, "Show calculation", "Next unassessed", and an overflow
// menu with "Clear requirement assessments". Split out from Category so its
// hooks (popover/menu open state, card refs) only mount for the full view.
const FullCategory: React.FC<FullCategoryProps> = ({
  moduleId,
  category,
  name,
  progress,
  categoryProgress,
  isApplicable,
  referencesLookup,
  requirementProgress,
  workspaceLinks,
  onApplicabilityChange,
  onCategoryReason,
  onRequirementLevelChange,
  onRequirementApplicabilityChange,
  onRequirementFieldChange,
  onClearRequirementAssessments,
  requirementFilter,
  scrollToKey,
  onScrollToKeyConsumed,
  onCardFocus,
}) => {
  const [showCalculation, setShowCalculation] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { openHelp } = useHelp();

  const effective = calculateEffectiveCategoryLevel(
    moduleId,
    category,
    progress,
    requirementProgress,
  );
  const views = buildRequirementViews(moduleId, category, requirementProgress);
  // RequirementFinder wiring: empty filter (no text, no statuses) matches
  // every view, so this is a no-op when the finder isn't active.
  const visibleViews = requirementFilter
    ? views.filter((v) => matchesFilter(v, requirementFilter))
    : views;

  // Self-declared reference chip: shown when the effective level did NOT
  // come from requirement ratings, yet the category still carries a
  // self-declared level from the quick/self view.
  const hasSelfValue =
    categoryProgress !== undefined && categoryProgress.level > 0;
  const showSelfDeclaredChip =
    effective.source !== "requirements" && hasSelfValue;

  const focusCard = (key: string): void => {
    const wrapper = cardRefs.current.get(key);
    if (!wrapper) return;
    const card = wrapper.querySelector<HTMLElement>(
      `[data-testid="requirement-card-${key}"]`,
    );
    const target = card ?? wrapper;
    target.scrollIntoView?.({ behavior: "smooth", block: "center" });
    target.focus();
  };

  const handleNextUnassessed = (): void => {
    // Walk visibleViews (not views) so the target is guaranteed to be
    // rendered/have a cardRefs entry — see handleNavigate below for the
    // same reasoning. Without this, an active filter that hides the first
    // unassessed requirement made focusCard silently no-op even though
    // later visible unassessed cards existed.
    const key = nextUnassessedKey(visibleViews);
    if (!key) return;
    focusCard(key);
  };

  // Cross-category jump (RequirementFinder): Module hands every Category
  // the same pending scrollToKey. Only the category that actually owns
  // that requirement acts on it, then reports back so Module clears the
  // pending jump. Guarded on visibleViews so a jump can't target a card
  // hidden by the active filter (the finder's own list is already
  // filtered, so this only matters if filter and jump state briefly
  // disagree, e.g. mid re-render).
  useEffect(() => {
    if (!scrollToKey) return;
    if (!visibleViews.some((v) => v.key === scrollToKey)) return;
    focusCard(scrollToKey);
    onScrollToKeyConsumed?.();
    // Deliberately keyed on scrollToKey alone: focusCard/onScrollToKeyConsumed
    // are recreated every render, and this project's eslint config does not
    // enforce react-hooks/exhaustive-deps.
  }, [scrollToKey]);

  // n/p keyboard navigation between adjacent requirement cards.
  // Walks visibleViews (not views) so navigation only lands on cards that
  // are actually rendered — with the RequirementFinder filter active,
  // views includes filtered-out (unmounted) requirements that have no
  // cardRefs entry, which would make focusCard silently no-op. Clamps at
  // the array bounds — first visible card's `p` and last visible card's
  // `n` are no-ops, no wrap-around.
  const handleNavigate = (fromKey: string, dir: "next" | "prev"): void => {
    const idx = visibleViews.findIndex((v) => v.key === fromKey);
    if (idx === -1) return;
    const targetIdx = idx + (dir === "next" ? 1 : -1);
    const target = visibleViews[targetIdx];
    if (!target) return;
    focusCard(target.key);
  };

  const handleClear = (): void => {
    onClearRequirementAssessments?.(moduleId, category.id);
  };

  return (
    <Card
      padding="lg"
      className="pkimm-category-card pkimm-category-card--full"
    >
      <div className="pkimm-category-header">
        <div className="pkimm-category-text">
          <Toggle
            checked={isApplicable}
            label={`${name} applicable`}
            onChange={() => onApplicabilityChange(moduleId, category.id)}
          />
          <IconButton
            label="Help on category applicability"
            size="sm"
            variant="ghost"
            onClick={() => openHelp(undefined, "applicability")}
          >
            <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
          </IconButton>
          <strong>{name}</strong>
        </div>
      </div>
      <div className="pkimm-category-description">
        <ReactMarkdown>{category.description}</ReactMarkdown>
      </div>
      {!isApplicable && (
        <label className="pkimm-category-reason-field">
          <span>Reason this category is not applicable</span>
          <TextArea
            rows={2}
            autoGrow
            placeholder="e.g. no external CAs are operated, so this does not apply"
            value={categoryProgress?.applicabilityReason ?? ""}
            onChange={(e) =>
              onCategoryReason?.(moduleId, category.id, e.target.value)
            }
          />
        </label>
      )}
      {isApplicable && (
        <>
          <div
            className={`pkimm-category-sticky-level level-${effective.display}`}
          >
            <div
              className="pkimm-category-sticky-level__live"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="pkimm-category-sticky-level__label">
                {LevelResult[effective.display]}
              </span>
              <span className="pkimm-category-sticky-level__count">
                {effective.assessedCount} of {effective.totalInScope} assessed
              </span>
              {showSelfDeclaredChip && (
                <span className="pkimm-category-sticky-level__self-chip">
                  Self-declared: {LevelResult[categoryProgress!.level]}
                </span>
              )}
            </div>
            <div className="pkimm-category-sticky-level__actions">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
                }
                onClick={handleNextUnassessed}
              >
                Next unassessed
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  <FontAwesomeIcon icon={faCalculator} aria-hidden="true" />
                }
                onClick={() => setShowCalculation(true)}
              >
                Show calculation
              </Button>
              <Menu
                label="More actions"
                items={[
                  {
                    id: "clear",
                    label: "Clear requirement assessments",
                    tone: "danger",
                    onSelect: handleClear,
                  },
                ]}
              />
            </div>
          </div>
          <div className="pkimm-requirement-list">
            {visibleViews.map((v) => {
              const req = category.requirements?.find(
                (r) => r.id === v.requirementId,
              );
              const referenceIds =
                req && Array.isArray(req.references) ? req.references : [];
              return (
                <div
                  key={v.key}
                  ref={(el) => {
                    if (el) cardRefs.current.set(v.key, el);
                    else cardRefs.current.delete(v.key);
                  }}
                >
                  <RequirementCard
                    view={v}
                    progress={requirementProgress?.[v.key]}
                    referencesLookup={referencesLookup}
                    referenceIds={referenceIds}
                    workspaceLinks={workspaceLinks}
                    onLevelChange={(level) =>
                      onRequirementLevelChange?.(
                        moduleId,
                        category.id,
                        v.requirementId,
                        level,
                      )
                    }
                    onToggleApplicability={() =>
                      onRequirementApplicabilityChange?.(
                        moduleId,
                        category.id,
                        v.requirementId,
                      )
                    }
                    onFieldChange={(field, value) =>
                      onRequirementFieldChange?.(
                        moduleId,
                        category.id,
                        v.requirementId,
                        field,
                        value,
                      )
                    }
                    onNavigate={(dir) => handleNavigate(v.key, dir)}
                    onCardFocus={() => onCardFocus?.(v.key)}
                  />
                </div>
              );
            })}
          </div>
          {showCalculation && (
            <ShowCalculationPopover
              explanation={explainEffectiveCategoryLevel(
                moduleId,
                category,
                progress,
                requirementProgress,
              )}
              onClose={() => setShowCalculation(false)}
            />
          )}
        </>
      )}
    </Card>
  );
};

export const Category: React.FC<CategoryProps> = ({
  moduleId,
  category,
  view,
  extCategory,
  extensionId,
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
  requirementFilter,
  scrollToKey,
  onScrollToKeyConsumed,
  onCardFocus,
}) => {
  const { openHelp } = useHelp();
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

  // Self view calculated-level badge: when this category carries
  // requirement-derived data (source === "requirements"), surface a
  // read-only badge with the calculated level alongside the self-declared
  // cards — even on a modes="self" host, so the data is never hidden. When
  // there is no requirement data, `effective.source` is "self" or
  // "derived-not-applicable" and nothing new renders: the self view stays
  // byte-identical to before this feature. Only applies to core categories;
  // extension relevance categories have no `category.requirements`-driven
  // scoring, so calculateEffectiveCategoryLevel would never report
  // "requirements" for them anyway.
  const effective = !extCategory
    ? calculateEffectiveCategoryLevel(
        moduleId,
        category,
        progress,
        requirementProgress,
      )
    : undefined;
  const showCalculatedBadge = effective?.source === "requirements";
  const showSelfDeclaredChip =
    showCalculatedBadge &&
    selectedLevel > 0 &&
    selectedLevel !== effective!.display;

  // Full-assessment view renders a per-requirement rating list instead of
  // the self-view level cards. Only applies to core categories — extension
  // relevance categories (no `category.requirements`-driven scoring) keep
  // the self-view rendering regardless of the active view mode.
  if (view === "full" && !extCategory) {
    return (
      <FullCategory
        moduleId={moduleId}
        category={category}
        name={name}
        progress={progress}
        categoryProgress={categoryProgress}
        isApplicable={isApplicable}
        referencesLookup={referencesLookup}
        requirementProgress={requirementProgress}
        workspaceLinks={workspaceLinks}
        onApplicabilityChange={onApplicabilityChange}
        onCategoryReason={onCategoryReason}
        onRequirementLevelChange={onRequirementLevelChange}
        onRequirementApplicabilityChange={onRequirementApplicabilityChange}
        onRequirementFieldChange={onRequirementFieldChange}
        onClearRequirementAssessments={onClearRequirementAssessments}
        requirementFilter={requirementFilter}
        scrollToKey={scrollToKey}
        onScrollToKeyConsumed={onScrollToKeyConsumed}
        onCardFocus={onCardFocus}
      />
    );
  }

  return (
    <Card
      padding="lg"
      className={`pkimm-category-card ${extCategory ? "extension" : ""}`}
    >
      <div className="pkimm-category-header">
        <div className="pkimm-category-text">
          <Toggle
            checked={isApplicable}
            label={`${name} applicable`}
            accent={extCategory ? "secondary" : "primary"}
            onChange={() =>
              onApplicabilityChange(moduleId, category.id, extensionId)
            }
          />
          <IconButton
            label="Help on category applicability"
            size="sm"
            variant="ghost"
            onClick={() => openHelp(undefined, "applicability")}
          >
            <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
          </IconButton>
          <strong>{name}</strong>
        </div>
        {showCalculatedBadge && (
          <div
            className={`pkimm-category-calculated-badge level-${effective!.display}`}
          >
            <span className="pkimm-category-calculated-badge__label">
              Calculated: {LevelResult[effective!.display]}
            </span>
            {showSelfDeclaredChip && (
              <span className="pkimm-category-calculated-badge__self-chip">
                Self-declared: {LevelResult[selectedLevel]}
              </span>
            )}
          </div>
        )}
      </div>
      {!isApplicable && (
        <label className="pkimm-category-reason-field">
          <span>Reason this category is not applicable</span>
          <TextArea
            rows={2}
            autoGrow
            placeholder="e.g. no external CAs are operated, so this does not apply"
            value={categoryProgress?.applicabilityReason ?? ""}
            onChange={(e) =>
              onCategoryReason?.(
                moduleId,
                category.id,
                e.target.value,
                extensionId,
              )
            }
          />
        </label>
      )}
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
          <label className="pkimm-category-notes-field">
            <span>Notes</span>
            <TextArea
              rows={2}
              autoGrow
              placeholder="e.g. rationale for this rating, links to evidence, follow-up items"
              value={categoryProgress?.notes ?? ""}
              onChange={(e) =>
                onCategoryNotes?.(
                  moduleId,
                  category.id,
                  e.target.value,
                  extensionId,
                )
              }
            />
          </label>
          {extCategory && view === "full" && (
            <>
              <label className="pkimm-category-notes-field">
                <span>Evidence</span>
                <TextArea
                  rows={2}
                  autoGrow
                  placeholder="e.g. documents reviewed, links, ticket references"
                  value={categoryProgress?.evidence ?? ""}
                  onChange={(e) =>
                    onCategoryFieldChange?.(
                      moduleId,
                      category.id,
                      "evidence",
                      e.target.value,
                      extensionId,
                    )
                  }
                />
              </label>
              {workspaceLinks &&
                (workspaceLinks.pocs.length > 0 ||
                  workspaceLinks.artifacts.length > 0) && (
                  <WorkspaceLinksSection
                    idPrefix={`${extensionId ?? ""}.${moduleId}.${category.id}`}
                    workspaceLinks={workspaceLinks}
                    links={categoryProgress}
                    onFieldChange={(field, value) => {
                      if (
                        field === "pocId" ||
                        field === "interviewDate" ||
                        field === "artifactIds"
                      ) {
                        onCategoryFieldChange?.(
                          moduleId,
                          category.id,
                          field,
                          value as ProgressData[
                            "pocId" | "interviewDate" | "artifactIds"],
                          extensionId,
                        );
                      }
                    }}
                  />
                )}
            </>
          )}
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
    </Card>
  );
};
