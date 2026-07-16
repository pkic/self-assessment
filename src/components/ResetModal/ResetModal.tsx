import React, { useState } from "react";
import { Modal, Button, Checkbox } from "../ui";
import type { ResetScopes } from "../../utils/resetAssessment";
import "./ResetModal.module.scss";

interface ResetModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scopes: ResetScopes) => void;
  /** Full view offers all four scopes; self/quick view offers only the two
   *  that belong to a self assessment (ratings + report details). Action
   *  plans and workspace are full-assessment-only surfaces, so offering to
   *  clear them in self view is meaningless. */
  fullMode: boolean;
}

const EMPTY: ResetScopes = {
  ratings: false,
  actionPlans: false,
  workspace: false,
  reportDetails: false,
};

const ROWS: {
  key: keyof ResetScopes;
  label: string;
  hint: string;
  fullOnly?: boolean;
}[] = [
  {
    key: "ratings",
    label: "Ratings",
    hint: "All category and requirement maturity ratings.",
  },
  {
    key: "actionPlans",
    label: "Action plans",
    hint: "Every planned category and its tasks.",
    fullOnly: true,
  },
  {
    key: "workspace",
    label: "Workspace",
    hint: "Intake, notes, artifacts, contacts, checklist.",
    fullOnly: true,
  },
  {
    key: "reportDetails",
    label: "Report details",
    hint: "Names, organization, dates, PKI environment.",
  },
];

export const ResetModal: React.FC<ResetModalProps> = ({
  open,
  onClose,
  onConfirm,
  fullMode,
}) => {
  const [scopes, setScopes] = useState<ResetScopes>(EMPTY);
  if (!open) return null;
  const rows = ROWS.filter((r) => fullMode || !r.fullOnly);
  const any = rows.some((r) => scopes[r.key]);
  const all = rows.every((r) => scopes[r.key]);
  const setAll = (value: boolean) =>
    setScopes((s) => {
      const next = { ...s };
      for (const r of rows) next[r.key] = value;
      return next;
    });
  const reset = () => {
    // Submit only the currently-visible scopes: if fullMode flipped to false
    // while the dialog stayed mounted, any stale full-only selection must not
    // ride along and clear data the user can no longer see selected.
    const submitted: ResetScopes = { ...EMPTY };
    for (const r of rows) submitted[r.key] = scopes[r.key];
    onConfirm(submitted);
    setScopes(EMPTY);
  };
  const close = () => {
    setScopes(EMPTY);
    onClose();
  };
  return (
    <Modal open={open} onClose={close} titleId="reset-modal-title">
      <div className="pkimm-reset-modal">
        <h2 id="reset-modal-title">Reset assessment</h2>
        <p className="pkimm-reset-modal__intro">
          Choose what to clear. This cannot be undone.
        </p>
        <div className="pkimm-reset-modal__all">
          <Checkbox
            labelledBy="reset-all-label"
            checked={all}
            onChange={() => setAll(!all)}
          />
          <span id="reset-all-label" className="pkimm-reset-modal__all-label">
            Select all
          </span>
        </div>
        <ul className="pkimm-reset-modal__list">
          {rows.map((row) => (
            <li key={row.key} className="pkimm-reset-modal__row">
              <div className="pkimm-reset-modal__row-main">
                <Checkbox
                  labelledBy={`reset-${row.key}-label`}
                  checked={scopes[row.key]}
                  onChange={() =>
                    setScopes((s) => ({ ...s, [row.key]: !s[row.key] }))
                  }
                />
                <span
                  id={`reset-${row.key}-label`}
                  className="pkimm-reset-modal__label"
                >
                  {row.label}
                </span>
              </div>
              <span className="pkimm-reset-modal__hint">{row.hint}</span>
            </li>
          ))}
        </ul>
        <div className="pkimm-reset-modal__actions">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" onClick={reset} disabled={!any}>
            Reset
          </Button>
        </div>
      </div>
    </Modal>
  );
};
