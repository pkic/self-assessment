import React, { useRef } from "react";
import type { AssessmentEvidenceFile } from "./types";
import { Button } from "../ui";

interface Props {
  ownerLabel: string;
  evidenceIds: string[];
  evidenceFiles: AssessmentEvidenceFile[];
  onAdd: (files: FileList) => Promise<void>;
  onRemove: (evidenceId: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  acceptedMediaTypes?: string[];
  maxFiles?: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const EvidenceAttachments: React.FC<Props> = ({
  ownerLabel,
  evidenceIds,
  evidenceFiles,
  onAdd,
  onRemove,
  disabled = false,
  label = "Evidence files",
  description,
  acceptedMediaTypes = ["*/*"],
  maxFiles,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = evidenceIds
    .map((id) => evidenceFiles.find((file) => file.id === id))
    .filter((file): file is AssessmentEvidenceFile => Boolean(file));

  return (
    <div className="evidence-assessment-evidence-attachments">
      <div className="evidence-assessment-evidence-attachments__header">
        <span>{label}</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={
            disabled || (maxFiles !== undefined && files.length >= maxFiles)
          }
          onClick={() => inputRef.current?.click()}
        >
          Add {label}
        </Button>
        <input
          ref={inputRef}
          className="pkimm-visually-hidden"
          type="file"
          multiple={maxFiles !== 1}
          accept={acceptedMediaTypes.join(",")}
          aria-label={`Add ${label} for ${ownerLabel}`}
          onChange={async (event) => {
            if (event.target.files?.length) await onAdd(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {description ? (
        <p className="evidence-assessment-evidence-attachments__description">
          {description}
        </p>
      ) : null}
      {files.length === 0 ? (
        <p className="evidence-assessment-evidence-attachments__empty">
          No files attached.
        </p>
      ) : (
        <ul className="evidence-assessment-evidence-attachments__list">
          {files.map((file) => (
            <li key={file.id}>
              <span>
                <strong>{file.name}</strong> ({formatBytes(file.size)})
                <small>SHA-256 {file.sha256.slice(0, 16)}…</small>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(file.id)}
                aria-label={`Remove ${file.name} from ${ownerLabel}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
