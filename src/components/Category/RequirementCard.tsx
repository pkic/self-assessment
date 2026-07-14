import React, { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlag,
  faCheck,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import type { RequirementView } from "../../utils/requirementFilter";
import type { RequirementProgress, ReferenceEntry } from "../../types/types";
import type { RequirementEditableField } from "../../utils/requirementProgress";
import LevelResult from "../../enums/LevelResult";
import { Button, IconButton, TextArea } from "../ui";
import { WorkspaceLinksSection } from "./WorkspaceLinksSection";
import { useHelp } from "../Help/HelpProvider";
import "./Category.module.scss";

// Per-requirement workspace links: the POC/artifact options offered by the
// links group below. Defined once here and threaded (as `workspaceLinks?`)
// through CategoryProps/FullCategoryProps/ModuleProps to avoid re-declaring
// the shape at each hop.
export interface WorkspaceLinks {
  pocs: { id: string; name: string; role?: string }[];
  artifacts: { id: string; title: string }[];
}

export interface RequirementCardProps {
  view: RequirementView; // status + model prose
  progress: RequirementProgress | undefined; // notes/evidence/reason/flagNote live here
  referencesLookup?: Map<string, ReferenceEntry>;
  referenceIds: string[]; // resolved ids for THIS requirement
  workspaceLinks?: WorkspaceLinks;
  onLevelChange: (level: number) => void;
  onToggleApplicability: () => void;
  onFieldChange: <K extends RequirementEditableField>(
    field: K,
    value: RequirementProgress[K],
  ) => void;
  onNavigate?: (dir: "next" | "prev") => void; // n / p keys
  onCardFocus?: () => void; // reports this card as the current position (session resume)
}

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5];

const levelLabel = (level: number): string =>
  level === 0 ? "Not Assessed" : `level ${level}`;

const statusChipText = (view: RequirementView): string => {
  if (!view.applicability) return LevelResult[-1];
  return LevelResult[view.level] ?? LevelResult[0];
};

const NOTES_PLACEHOLDER =
  "How this level is met — what's in place today, and any caveats.";
const EVIDENCE_PLACEHOLDER =
  "Documents, systems, or records that show this — names or locations.";
const NA_REASON_PLACEHOLDER = "Why this requirement doesn't apply to your PKI.";

export const RequirementCard: React.FC<RequirementCardProps> = ({
  view,
  progress,
  referencesLookup,
  referenceIds,
  workspaceLinks,
  onLevelChange,
  onToggleApplicability,
  onFieldChange,
  onNavigate,
  onCardFocus,
}) => {
  const radiosRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const { openHelp } = useHelp();

  const chipLevel = view.applicability ? view.level : -1;
  const chipText = statusChipText(view);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;

    if (/^[0-5]$/.test(e.key)) {
      onLevelChange(Number(e.key));
      return;
    }
    if (e.key === "f" || e.key === "F") {
      onFieldChange("flagged", !view.flagged);
      return;
    }
    if (e.key === "n" || e.key === "N") {
      onNavigate?.("next");
      return;
    }
    if (e.key === "p" || e.key === "P") {
      onNavigate?.("prev");
      return;
    }
  };

  const handleRadioKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    let nextIndex: number | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % LEVEL_OPTIONS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + LEVEL_OPTIONS.length) % LEVEL_OPTIONS.length;
    }
    if (nextIndex === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    const nextLevel = LEVEL_OPTIONS[nextIndex];
    onLevelChange(nextLevel);
    radiosRef.current.get(nextLevel)?.focus();
  };

  const resolvedReferences = referencesLookup
    ? referenceIds
        .map((id) => referencesLookup.get(id))
        .filter((r): r is ReferenceEntry => Boolean(r))
    : [];

  return (
    <div
      data-testid={`requirement-card-${view.key}`}
      className="pkimm-requirement-card"
      tabIndex={0}
      onKeyDown={handleKey}
      onFocus={onCardFocus}
    >
      <div className="pkimm-requirement-card__header">
        <span className="pkimm-requirement-card__description">
          {view.description}
        </span>
        <span className="pkimm-requirement-card__weight">
          weight {view.weight}
        </span>
        <span
          className={`pkimm-status-chip level-${chipLevel} ${
            view.completed ? "pkimm-status-chip--completed" : ""
          }`}
        >
          {chipText}
        </span>
        <Button
          variant="ghost"
          className={`pkimm-flag-toggle ${view.flagged ? "active" : ""}`}
          aria-pressed={view.flagged}
          aria-label={view.flagged ? "Unflag requirement" : "Flag requirement"}
          onClick={() => onFieldChange("flagged", !view.flagged)}
        >
          {view.flagged ? (
            <>
              <FontAwesomeIcon icon={faFlag} aria-hidden="true" /> Flagged
            </>
          ) : (
            "Flag"
          )}
        </Button>
        <Button
          variant="ghost"
          className={`pkimm-completed-toggle ${view.completed ? "active" : ""}`}
          aria-pressed={view.completed}
          onClick={() => onFieldChange("completed", !view.completed)}
        >
          {view.completed ? (
            <>
              <FontAwesomeIcon icon={faCheck} aria-hidden="true" /> Completed
            </>
          ) : (
            "Mark complete"
          )}
        </Button>
      </div>

      {view.guidance && (
        <details open className="pkimm-requirement-card__disclosure">
          <summary>Guidance</summary>
          <ReactMarkdown>{view.guidance}</ReactMarkdown>
        </details>
      )}

      {view.assessment && (
        <details open className="pkimm-requirement-card__disclosure">
          <summary>Assessment criteria</summary>
          <ReactMarkdown>{view.assessment}</ReactMarkdown>
        </details>
      )}

      {resolvedReferences.length > 0 && (
        <details className="pkimm-category-references">
          <summary>References ({resolvedReferences.length})</summary>
          <ul>
            {resolvedReferences.map((ref) => (
              <li key={ref.id}>
                {ref.url ? (
                  <a href={ref.url} target="_blank" rel="noopener noreferrer">
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
      )}

      <div className="pkimm-requirement-card__applicability-row">
        <div className="pkimm-requirement-card__applicability">
          <button
            type="button"
            className={`pkimm-inscope-toggle ${
              view.applicability ? "" : "not-applicable"
            }`}
            aria-pressed={view.applicability}
            aria-label={`${view.description} in scope`}
            onClick={onToggleApplicability}
          >
            {view.applicability ? "In scope" : "Not applicable"}
          </button>
        </div>
        <IconButton
          label="Help on applicability"
          size="sm"
          variant="ghost"
          onClick={() => openHelp(undefined, "applicability")}
        >
          <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
        </IconButton>
      </div>

      {!view.applicability && (
        <label className="pkimm-requirement-card__field">
          <span>Reason for not applicable</span>
          <TextArea
            rows={2}
            autoGrow
            placeholder={NA_REASON_PLACEHOLDER}
            value={progress?.applicabilityReason ?? ""}
            onChange={(e) =>
              onFieldChange("applicabilityReason", e.target.value)
            }
          />
        </label>
      )}

      <div className="pkimm-requirement-card__level-header">
        <span>Level</span>
        <IconButton
          label="Help on rating levels"
          size="sm"
          variant="ghost"
          onClick={() => openHelp(undefined, "rating-levels")}
        >
          <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
        </IconButton>
      </div>
      <div
        className="pkimm-requirement-card__levels"
        role="radiogroup"
        aria-label={`${view.description} maturity level`}
      >
        {LEVEL_OPTIONS.map((level, index) => (
          <button
            key={level}
            type="button"
            role="radio"
            ref={(el) => {
              if (el) radiosRef.current.set(level, el);
              else radiosRef.current.delete(level);
            }}
            aria-label={levelLabel(level)}
            aria-checked={chipLevel === level}
            tabIndex={chipLevel === level ? 0 : -1}
            className={`pkimm-requirement-card__level-option level-${level} ${
              chipLevel === level ? "selected" : ""
            }`}
            onClick={() => onLevelChange(level)}
            onKeyDown={(e) => handleRadioKeyDown(e, index)}
          >
            {level}
          </button>
        ))}
      </div>

      <label className="pkimm-requirement-card__field">
        <span>Rationale / Notes</span>
        <TextArea
          rows={2}
          autoGrow
          placeholder={NOTES_PLACEHOLDER}
          value={progress?.notes ?? ""}
          onChange={(e) => onFieldChange("notes", e.target.value)}
        />
      </label>

      <label className="pkimm-requirement-card__field">
        <span>Evidence</span>
        <TextArea
          rows={2}
          autoGrow
          placeholder={EVIDENCE_PLACEHOLDER}
          value={progress?.evidence ?? ""}
          onChange={(e) => onFieldChange("evidence", e.target.value)}
        />
      </label>

      {workspaceLinks &&
        (workspaceLinks.pocs.length > 0 ||
          workspaceLinks.artifacts.length > 0) && (
          <WorkspaceLinksSection
            idPrefix={view.key}
            workspaceLinks={workspaceLinks}
            links={progress}
            onFieldChange={onFieldChange}
          />
        )}
    </div>
  );
};
