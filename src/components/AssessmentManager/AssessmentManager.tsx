import React, { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPenToSquare,
  faCopy,
  faDownload,
  faTrashCan,
  faPlus,
  faFileImport,
  faFileArrowUp,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type { Assessment, SavedState } from "../../types/types";
import "./AssessmentManager.module.scss";

interface Props {
  state: SavedState;
  loadedDataVersion: string;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onUpload: (file: File) => void;
  hasLegacyData: boolean;
  onImportLegacy?: () => void;
  onRemoveLegacy?: () => void;
}

export const AssessmentManager: React.FC<Props> = ({
  state,
  loadedDataVersion,
  onSelect,
  onCreateNew,
  onRename,
  onDuplicate,
  onDelete,
  onDownload,
  onUpload,
  hasLegacyData,
  onImportLegacy,
  onRemoveLegacy,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="pkimm-assessment-manager">
      <header className="pkimm-assessment-manager__header">
        <h2>Saved assessments</h2>
        <div className="pkimm-assessment-manager__primary-actions">
          <button
            type="button"
            className="pkimm-assessment-manager__primary"
            onClick={onCreateNew}
          >
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            <span>New assessment</span>
          </button>
          <button
            type="button"
            className="pkimm-assessment-manager__secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <FontAwesomeIcon icon={faFileImport} aria-hidden="true" />
            <span>Import file</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onUpload(f);
                e.target.value = "";
              }
            }}
          />
        </div>
      </header>

      {state.assessments.length === 0 ? (
        <p className="pkimm-assessment-manager__empty">
          No assessments saved in this browser yet.
        </p>
      ) : (
        <ul className="pkimm-assessment-manager__list">
          {state.assessments.map((a) => (
            <Row
              key={a.id}
              assessment={a}
              isActive={a.id === state.activeId}
              isCompatible={a.dataVersion === loadedDataVersion}
              onSelect={() => onSelect(a.id)}
              onRename={(name) => onRename(a.id, name)}
              onDuplicate={() => onDuplicate(a.id)}
              onDelete={() => onDelete(a.id)}
              onDownload={() => onDownload(a.id)}
            />
          ))}
        </ul>
      )}

      {hasLegacyData && (
        <section className="pkimm-assessment-manager__legacy">
          <h3>Legacy storage detected</h3>
          <p>
            An assessment from the older widget is still in this browser&apos;s
            storage. Import it into the new manager, or remove it once you no
            longer need it.
          </p>
          <div className="pkimm-assessment-manager__legacy-actions">
            {onImportLegacy && (
              <button
                type="button"
                className="pkimm-assessment-manager__secondary"
                onClick={onImportLegacy}
              >
                <FontAwesomeIcon icon={faFileArrowUp} aria-hidden="true" />
                <span>Import legacy assessment</span>
              </button>
            )}
            {onRemoveLegacy && (
              <button
                type="button"
                className="pkimm-assessment-manager__danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove the old-format storage permanently? This cannot be undone.",
                    )
                  ) {
                    onRemoveLegacy();
                  }
                }}
              >
                <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                <span>Remove legacy storage</span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

interface RowProps {
  assessment: Assessment;
  isActive: boolean;
  isCompatible: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

const Row: React.FC<RowProps> = ({
  assessment,
  isActive,
  isCompatible,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onDownload,
}) => {
  const cls = [
    "pkimm-assessment-manager__row",
    isActive ? "is-active" : "",
    !isCompatible ? "is-incompatible" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const versionBadgeCls = [
    "pkimm-assessment-manager__version-badge",
    isCompatible
      ? "pkimm-assessment-manager__version-badge--compatible"
      : "pkimm-assessment-manager__version-badge--incompatible",
  ].join(" ");

  return (
    <li className={cls}>
      <div className="pkimm-assessment-manager__row-info">
        <div className="pkimm-assessment-manager__row-headline">
          {isActive && (
            <span
              className="pkimm-assessment-manager__row-active-badge"
              aria-label="Currently active assessment"
              title="Currently active assessment"
            >
              Active
            </span>
          )}
          <span className="pkimm-assessment-manager__row-name">
            {assessment.name || "Untitled assessment"}
          </span>
          <span
            className={versionBadgeCls}
            title={
              isCompatible
                ? `Compatible with the loaded model (v${assessment.dataVersion})`
                : `Created with PKIMM v${assessment.dataVersion}; migrate to align with the loaded model`
            }
          >
            v{assessment.dataVersion}
          </span>
        </div>
        <div className="pkimm-assessment-manager__row-meta">
          Updated {formatRelative(assessment.meta.updatedAt)}
        </div>
      </div>
      <div
        className="pkimm-assessment-manager__row-actions"
        role="group"
        aria-label={`Actions for ${assessment.name}`}
      >
        <IconButton
          icon={faFolderOpen}
          label="Open"
          onClick={onSelect}
          disabled={isActive}
          highlight={!isActive}
        />
        <IconButton
          icon={faPenToSquare}
          label="Rename"
          onClick={() => {
            const name = window.prompt("Rename assessment", assessment.name);
            if (name) onRename(name);
          }}
        />
        <IconButton icon={faCopy} label="Duplicate" onClick={onDuplicate} />
        <IconButton icon={faDownload} label="Download" onClick={onDownload} />
        <IconButton
          icon={faTrashCan}
          label="Delete"
          danger
          onClick={() => {
            if (window.confirm(`Delete "${assessment.name}"?`)) onDelete();
          }}
        />
      </div>
    </li>
  );
};

interface IconButtonProps {
  icon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  label: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
  danger?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  highlight,
  danger,
}) => {
  const cls = [
    "pkimm-assessment-manager__icon-button",
    highlight ? "pkimm-assessment-manager__icon-button--highlight" : "",
    danger ? "pkimm-assessment-manager__icon-button--danger" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <FontAwesomeIcon icon={icon} aria-hidden="true" />
    </button>
  );
};

const formatRelative = (iso: string): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
