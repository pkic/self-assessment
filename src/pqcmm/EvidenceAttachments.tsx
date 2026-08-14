import React, { useRef } from "react";
import type { PqcmmEvidenceFile } from "./types";
import { Button } from "../components/ui";

interface Props {
  ownerLabel: string;
  evidenceIds: string[];
  evidenceFiles: PqcmmEvidenceFile[];
  onAdd: (files: FileList) => Promise<void>;
  onRemove: (evidenceId: string) => void;
  disabled?: boolean;
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
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = evidenceIds
    .map((id) => evidenceFiles.find((file) => file.id === id))
    .filter((file): file is PqcmmEvidenceFile => Boolean(file));

  return (
    <div className="pqcmm-evidence-attachments">
      <div className="pqcmm-evidence-attachments__header">
        <span>Evidence files</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Add screenshots or documents
        </Button>
        <input
          ref={inputRef}
          className="pkimm-visually-hidden"
          type="file"
          multiple
          aria-label={`Add evidence files for ${ownerLabel}`}
          onChange={async (event) => {
            if (event.target.files?.length) await onAdd(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {files.length === 0 ? (
        <p className="pqcmm-evidence-attachments__empty">No files attached.</p>
      ) : (
        <ul className="pqcmm-evidence-attachments__list">
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
