import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import type { RequirementProgress } from "../../types/types";
import type { RequirementEditableField } from "../../utils/requirementProgress";
import type { WorkspaceLinks } from "./RequirementCard";
import { summarizeWorkspaceLinks } from "../../utils/workspaceLinks";
import { Button, IconButton, Select, TextField } from "../ui";
import "./Category.module.scss";

/** The minimal link shape this section reads — a structural subset of both
 *  RequirementProgress (requirement grain) and ProgressData (extension
 *  category grain), so the one component serves both. */
export interface WorkspaceLinkValues {
  pocId?: string;
  interviewDate?: string;
  artifactIds?: string[];
}

export interface WorkspaceLinksSectionProps {
  idPrefix: string;
  workspaceLinks: WorkspaceLinks;
  links: WorkspaceLinkValues | undefined;
  // The type stays the requirement-field union so RequirementCard passes its
  // existing handler verbatim; this section only ever calls it with
  // pocId/interviewDate/artifactIds (which ProgressData shares).
  onFieldChange: <K extends RequirementEditableField>(
    field: K,
    value: RequirementProgress[K],
  ) => void;
}

export const WorkspaceLinksSection: React.FC<WorkspaceLinksSectionProps> = ({
  idPrefix,
  workspaceLinks,
  links,
  onFieldChange,
}) => {
  const [attachOpen, setAttachOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const linkedIds = links?.artifactIds ?? [];
  const revealId = `req-artifacts-reveal-${idPrefix}`;

  const summary = summarizeWorkspaceLinks(
    {
      pocId: links?.pocId,
      artifactIds: links?.artifactIds,
      interviewDate: links?.interviewDate,
    },
    workspaceLinks,
  );

  const linkedArtifacts = workspaceLinks.artifacts.filter((a) =>
    linkedIds.includes(a.id),
  );
  const unlinked = workspaceLinks.artifacts.filter(
    (a) => !linkedIds.includes(a.id),
  );

  const q = searchText.trim().toLowerCase();
  const addable =
    q === ""
      ? unlinked
      : unlinked.filter((a) => a.title.toLowerCase().includes(q));

  const addArtifact = (id: string): void => {
    onFieldChange("artifactIds", [...linkedIds, id]);
  };
  const removeArtifact = (id: string): void => {
    onFieldChange(
      "artifactIds",
      linkedIds.filter((x) => x !== id),
    );
  };

  return (
    <details className="pkimm-requirement-card__links">
      <summary>Workspace links — {summary}</summary>
      <div className="pkimm-requirement-card__links-body">
        {workspaceLinks.pocs.length > 0 && (
          <Select
            label="Point of contact"
            fieldClassName="pkimm-requirement-card__link-field"
            value={links?.pocId ?? ""}
            onChange={(e) =>
              onFieldChange("pocId", e.target.value || undefined)
            }
          >
            <option value="">— none —</option>
            {workspaceLinks.pocs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.role ? ` (${p.role})` : ""}
              </option>
            ))}
          </Select>
        )}

        <TextField
          type="date"
          label="Interview date"
          fieldClassName="pkimm-requirement-card__link-field"
          value={links?.interviewDate ?? ""}
          onChange={(e) =>
            onFieldChange("interviewDate", e.target.value || undefined)
          }
        />

        {workspaceLinks.artifacts.length > 0 && (
          <div className="pkimm-requirement-card__artifacts">
            <span className="pkimm-requirement-card__artifacts-label">
              Artifacts
            </span>
            <div className="pkimm-artifact-chips">
              {linkedArtifacts.map((a) => (
                <span key={a.id} className="pkimm-artifact-chip">
                  <span className="pkimm-artifact-chip__label">{a.title}</span>
                  <IconButton
                    label={`Remove ${a.title}`}
                    size="sm"
                    onClick={() => removeArtifact(a.id)}
                  >
                    <span aria-hidden="true">×</span>
                  </IconButton>
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                leftIcon={
                  attachOpen ? undefined : (
                    <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                  )
                }
                aria-expanded={attachOpen}
                aria-controls={revealId}
                onClick={() => setAttachOpen((o) => !o)}
              >
                {attachOpen ? "Done" : "Add artifact"}
              </Button>
            </div>
            <div id={revealId} className="pkimm-artifact-picker">
              {attachOpen && (
                <>
                  <TextField
                    type="search"
                    label="Search artifacts"
                    hideLabel
                    placeholder="Search artifacts…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {addable.length === 0 ? (
                    <p className="pkimm-artifact-picker__empty">
                      {unlinked.length === 0
                        ? "All artifacts attached"
                        : "No artifacts match"}
                    </p>
                  ) : (
                    <ul className="pkimm-artifact-picker__list">
                      {addable.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className="pkimm-artifact-picker__add"
                            aria-label={`Add ${a.title}`}
                            onClick={() => addArtifact(a.id)}
                          >
                            <FontAwesomeIcon
                              icon={faPlus}
                              aria-hidden="true"
                              className="pkimm-artifact-picker__add-icon"
                            />
                            <span>{a.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  );
};
