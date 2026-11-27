import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPenToSquare,
  faCopy,
  faDownload,
  faPlus,
  faFileImport,
  faTrash,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import type {
  Assessment,
  AssessmentData,
  ExtensionData,
  SavedState,
} from "../../types/types";
import type { RevisionRecord } from "../../utils/storageAdapter";
import { formatBytes } from "../../utils/durability";
import { buildAssessmentCardModel } from "../../utils/assessmentCard";
import { Button, Card, LevelBadge, Menu } from "../ui";
import type { MenuItem } from "../ui";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import "./AssessmentManager.module.scss";

interface Props {
  state: SavedState;
  loadedDataVersion: string;
  data: AssessmentData | null;
  extensionsData: ExtensionData[];
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
  onListRevisions: (id: string) => Promise<RevisionRecord[]>;
  onRestoreRevision: (revId: string, assessmentId: string) => Promise<void>;
  storageEstimate: { usage: number; quota: number } | null;
  methodology?: AssessmentProfileData["runtime"]["methodology"];
}

export const AssessmentManager: React.FC<Props> = ({
  state,
  loadedDataVersion,
  data,
  extensionsData,
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
  onListRevisions,
  onRestoreRevision,
  storageEstimate,
  methodology,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <Card as="section" padding="lg" className="pkimm-assessment-manager">
      <header className="pkimm-assessment-manager__header">
        <h2>Saved assessments</h2>
        <div className="pkimm-assessment-manager__primary-actions">
          <Button
            variant="primary"
            leftIcon={<FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
            onClick={onCreateNew}
          >
            New assessment
          </Button>
          <Button
            variant="secondary"
            leftIcon={
              <FontAwesomeIcon icon={faFileImport} aria-hidden="true" />
            }
            onClick={() => fileInputRef.current?.click()}
          >
            Import file
          </Button>
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
            <li key={a.id}>
              <AssessmentCard
                assessment={a}
                isActive={a.id === state.activeId}
                model={buildAssessmentCardModel(
                  a,
                  data?.modules ?? null,
                  loadedDataVersion,
                  extensionsData,
                  methodology,
                )}
                onSelect={() => onSelect(a.id)}
                onRename={(name) => onRename(a.id, name)}
                onDuplicate={() => onDuplicate(a.id)}
                onDelete={() => onDelete(a.id)}
                onDownload={() => onDownload(a.id)}
                onListRevisions={onListRevisions}
                onRestoreRevision={onRestoreRevision}
              />
            </li>
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
              <Button
                variant="secondary"
                leftIcon={
                  <FontAwesomeIcon icon={faFileImport} aria-hidden="true" />
                }
                onClick={onImportLegacy}
              >
                Import legacy assessment
              </Button>
            )}
            {onRemoveLegacy && (
              <Button
                variant="danger"
                leftIcon={<FontAwesomeIcon icon={faTrash} aria-hidden="true" />}
                onClick={() => {
                  if (
                    globalThis.confirm(
                      "Remove the old-format storage permanently? This cannot be undone.",
                    )
                  ) {
                    onRemoveLegacy();
                  }
                }}
              >
                Remove legacy storage
              </Button>
            )}
          </div>
        </section>
      )}

      {storageEstimate && (
        <p className="pkimm-assessment-manager__storage-estimate">
          Browser storage: {formatBytes(storageEstimate.usage)} of{" "}
          {formatBytes(storageEstimate.quota)} used
        </p>
      )}
    </Card>
  );
};

interface CardProps {
  assessment: Assessment;
  isActive: boolean;
  model: import("../../utils/assessmentCard").AssessmentCardModel;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onListRevisions: (id: string) => Promise<RevisionRecord[]>;
  onRestoreRevision: (revId: string, assessmentId: string) => Promise<void>;
}

const AssessmentCard: React.FC<CardProps> = ({
  assessment,
  isActive,
  model,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onDownload,
  onListRevisions,
  onRestoreRevision,
}) => {
  const [revisions, setRevisions] = useState<RevisionRecord[] | null>(null);

  const toggleHistory = (): void => {
    if (revisions) {
      setRevisions(null);
      return;
    }
    void onListRevisions(assessment.id).then(setRevisions);
  };

  const menuItems: MenuItem[] = [
    {
      id: "rename",
      label: "Rename",
      icon: <FontAwesomeIcon icon={faPenToSquare} />,
      onSelect: () => {
        const name = globalThis.prompt("Rename assessment", assessment.name);
        if (name) onRename(name);
      },
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <FontAwesomeIcon icon={faCopy} />,
      onSelect: onDuplicate,
    },
    {
      id: "download",
      label: "Download (YAML)",
      icon: <FontAwesomeIcon icon={faDownload} />,
      onSelect: onDownload,
    },
    {
      id: "history",
      label: "History",
      icon: <FontAwesomeIcon icon={faClockRotateLeft} />,
      onSelect: toggleHistory,
    },
    {
      id: "delete",
      label: "Delete",
      icon: <FontAwesomeIcon icon={faTrash} />,
      tone: "danger",
      onSelect: () => {
        if (globalThis.confirm(`Delete "${assessment.name}"?`)) onDelete();
      },
    },
  ];

  const barLevelClass =
    model.overallLevel && model.overallLevel >= 1 && model.overallLevel <= 5
      ? ` pkimm-assessment-card__bar--level-${model.overallLevel}`
      : "";
  const fillPct =
    model.totalCount > 0
      ? Math.round((model.assessedCount / model.totalCount) * 100)
      : 0;

  return (
    <Card
      as="article"
      padding="md"
      elevated={isActive}
      className="pkimm-assessment-card"
    >
      <div className="pkimm-assessment-card__headline">
        {isActive && (
          <span
            className="pkimm-assessment-card__active-badge"
            title="Currently active assessment"
          >
            Active
          </span>
        )}
        <span className="pkimm-assessment-card__name">
          {assessment.name || "Untitled assessment"}
        </span>
        <span className="pkimm-assessment-card__mode-pill">
          {model.isFull ? "Full" : "Self"}
        </span>
      </div>

      <div className="pkimm-assessment-card__maturity">
        {model.overallLevel !== null ? (
          <>
            <LevelBadge level={model.overallLevel} variant="soft" />
            <div
              className={`pkimm-assessment-card__bar${barLevelClass}`}
              aria-hidden="true"
            >
              <div
                className="pkimm-assessment-card__bar-fill"
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span className="pkimm-assessment-card__assessed">
              {model.assessedCount} of {model.totalCount} assessed
            </span>
          </>
        ) : !model.isCompatible ? (
          <>
            <span className="pkimm-assessment-card__migrate">
              Migrate to score
            </span>
            <span className="pkimm-assessment-card__migrate-note">
              created with an older model version
            </span>
          </>
        ) : (
          <span className="pkimm-assessment-card__migrate-note">—</span>
        )}
      </div>

      <div className="pkimm-assessment-card__footer">
        <div className="pkimm-assessment-card__meta">
          {model.typeLabel ? `${model.typeLabel} · ` : ""}v
          {assessment.dataVersion} · updated{" "}
          {formatRelative(assessment.meta.updatedAt)}
        </div>
        <div className="pkimm-assessment-card__actions">
          <Button
            variant={isActive ? "secondary" : "primary"}
            size="sm"
            leftIcon={
              <FontAwesomeIcon icon={faFolderOpen} aria-hidden="true" />
            }
            disabled={isActive}
            onClick={onSelect}
          >
            Open
          </Button>
          <Menu
            label={`More actions for ${assessment.name}`}
            items={menuItems}
          />
        </div>
      </div>

      {revisions && (
        <div className="pkimm-assessment-card__revisions">
          {revisions.length === 0 ? (
            <p>
              No snapshots yet — snapshots are taken automatically while you
              work.
            </p>
          ) : (
            <ul>
              {revisions.map((r) => (
                <li key={r.revId}>
                  <span>
                    {new Date(r.createdAt).toLocaleString()} · {r.reason}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (
                        globalThis.confirm(
                          "Restore this snapshot? The current version is snapshotted first, so nothing is lost.",
                        )
                      ) {
                        void onRestoreRevision(r.revId, assessment.id)
                          .then(() => setRevisions(null))
                          .catch(() => {
                            globalThis.alert(
                              "This snapshot is no longer available.",
                            );
                            setRevisions(null);
                          });
                      }
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
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
