import React, { useState } from "react";
import type { Assessment } from "../../types/types";
import type { MergeStrategy } from "../../utils/mergeAssessment";
import { Modal, Button } from "../ui";
import "./ImportCollisionModal.module.scss";

export interface ImportCollisionModalProps {
  /** The assessment already saved in this browser under the same id. */
  existing: Assessment;
  /** The parsed assessment from the file the user just selected. */
  incoming: Assessment;
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
  /** Whether the two assessments share a `dataVersion` and can be merged. */
  canMerge: boolean;
  onMerge: (strategy: MergeStrategy) => void;
}

/** Renders the "File is newer/older than your local copy by N days" line
 *  comparing `meta.updatedAt` on both sides. Same-day edits are called out
 *  as "about the same age" rather than a misleading "0 days". */
const compareAge = (existing: Assessment, incoming: Assessment): string => {
  const existingAt = Date.parse(existing.meta.updatedAt);
  const incomingAt = Date.parse(incoming.meta.updatedAt);
  if (Number.isNaN(existingAt) || Number.isNaN(incomingAt)) {
    return "The file's and your local copy's modification times could not be compared.";
  }
  const diffMs = incomingAt - existingAt;
  const days = Math.round(Math.abs(diffMs) / 86_400_000);
  if (days === 0) {
    return "The file and your local copy are about the same age.";
  }
  const noun = days === 1 ? "day" : "days";
  return diffMs > 0
    ? `The file is newer than your local copy by ${days} ${noun}.`
    : `The file is older than your local copy by ${days} ${noun}.`;
};

/** Focus-trapped `role="dialog"` shown when an imported v2 file's
 *  `assessment.id` already matches a locally-saved assessment. Modeled on
 *  `ShowCalculationPopover`'s focus-trap pattern: focuses the first
 *  focusable element on mount, restores focus to whatever triggered the
 *  import on unmount, and Escape cancels. */
export const ImportCollisionModal: React.FC<ImportCollisionModalProps> = ({
  existing,
  incoming,
  onReplace,
  onKeepBoth,
  onCancel,
  canMerge,
  onMerge,
}) => {
  const [strategy, setStrategy] = useState<MergeStrategy>("fill-gaps");

  return (
    <Modal
      open
      onClose={onCancel}
      titleId="pkimm-import-collision-title"
      describedById="pkimm-import-collision-desc"
    >
      <div className="pkimm-import-collision">
        <h2 id="pkimm-import-collision-title">Assessment already exists</h2>
        <p id="pkimm-import-collision-desc">
          An assessment named &quot;{existing.name}&quot; already exists in this
          browser. {compareAge(existing, incoming)}
        </p>
        <p className="pkimm-import-collision__hint">
          Replace overwrites your local copy with the file (a snapshot of your
          current copy is kept in History). Keep both adds the file as a new,
          separate assessment.
        </p>
        {canMerge ? (
          <div className="pkimm-import-collision__merge">
            <label htmlFor="pkimm-merge-strategy">Merge strategy</label>
            <select
              id="pkimm-merge-strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as MergeStrategy)}
            >
              <option value="fill-gaps">
                Fill gaps only (never overwrite existing)
              </option>
              <option value="prefer-newest">Prefer newest</option>
              <option value="prefer-imported">Prefer imported</option>
            </select>
            <Button
              variant="secondary"
              className="pkimm-import-collision__secondary"
              onClick={() => onMerge(strategy)}
            >
              Merge
            </Button>
          </div>
        ) : (
          <p className="pkimm-import-collision__hint">
            Merge is unavailable — the file was authored against a different
            model version.
          </p>
        )}
        <div className="pkimm-import-collision__actions">
          <Button
            variant="secondary"
            className="pkimm-import-collision__secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="pkimm-import-collision__secondary"
            onClick={onKeepBoth}
          >
            Keep both
          </Button>
          <Button
            variant="primary"
            className="pkimm-import-collision__primary"
            onClick={onReplace}
          >
            Replace
          </Button>
        </div>
      </div>
    </Modal>
  );
};
