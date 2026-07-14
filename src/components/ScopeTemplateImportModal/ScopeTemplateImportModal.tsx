import React from "react";
import { Modal, Button } from "../ui";
import type {
  ScopeTemplateFile,
  TemplateCompatibility,
} from "../../utils/scopeTemplateFile";
import "./ScopeTemplateImportModal.module.scss";

export interface ScopeTemplateImportModalProps {
  file: ScopeTemplateFile;
  compatibility: TemplateCompatibility;
  modelVersion: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ScopeTemplateImportModal: React.FC<
  ScopeTemplateImportModalProps
> = ({ file, compatibility, modelVersion, onConfirm, onClose }) => {
  const {
    versionMatch,
    matchedCategories,
    unmatchedCategories,
    matchedRequirements,
    unmatchedRequirements,
  } = compatibility;
  const totalCats = matchedCategories + unmatchedCategories;
  const totalReqs = matchedRequirements + unmatchedRequirements;

  return (
    <Modal open onClose={onClose} titleId="pkimm-scope-import-title">
      <div className="pkimm-scope-import">
        <h2 id="pkimm-scope-import-title" className="pkimm-modal__title">
          Import scope template
        </h2>
        <p className="pkimm-scope-import__name">
          <strong>{file.name}</strong>
        </p>
        <p
          className={`pkimm-scope-import__version${
            versionMatch ? "" : " pkimm-scope-import__version--warn"
          }`}
        >
          {versionMatch
            ? `Made for model ${file.dataVersion} — matches the model you're on.`
            : `Made for model ${file.dataVersion} — you're on ${modelVersion}.`}
        </p>
        <p className="pkimm-scope-import__preview">
          {matchedCategories} of {totalCats} out-of-scope categories and{" "}
          {matchedRequirements} of {totalReqs} requirements match the current
          model
          {unmatchedCategories + unmatchedRequirements > 0
            ? "; the rest are kept in the template but will be skipped when applied."
            : "."}
        </p>
        <div className="pkimm-scope-import__actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Add to templates
          </Button>
        </div>
      </div>
    </Modal>
  );
};
