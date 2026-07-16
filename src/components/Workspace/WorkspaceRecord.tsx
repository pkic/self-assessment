import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../ui";
import "./WorkspaceRecord.module.scss";

export interface WorkspaceRecordProps {
  recordKey: string;
  open: boolean;
  onToggle: () => void;
  summary: string;
  secondary?: string;
  muted?: boolean;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}

export const WorkspaceRecord: React.FC<WorkspaceRecordProps> = ({
  recordKey,
  open,
  onToggle,
  summary,
  secondary,
  muted,
  onRemove,
  removeLabel,
  children,
}) => (
  <div className="pkimm-ws-record" data-record-id={recordKey}>
    <div className="pkimm-ws-record__header">
      <button
        type="button"
        className="pkimm-ws-record__disclosure"
        aria-expanded={open}
        onClick={onToggle}
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`pkimm-ws-record__chevron${
            open ? " pkimm-ws-record__chevron--open" : ""
          }`}
          aria-hidden="true"
        />
        <span
          className={`pkimm-ws-record__summary${
            muted ? " pkimm-ws-record__summary--muted" : ""
          }`}
        >
          {summary}
        </span>
        {secondary ? (
          <span className="pkimm-ws-record__secondary"> · {secondary}</span>
        ) : null}
      </button>
      <IconButton
        label={removeLabel}
        variant="danger"
        size="sm"
        onClick={onRemove}
      >
        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
      </IconButton>
    </div>
    {open ? <div className="pkimm-ws-record__body">{children}</div> : null}
  </div>
);
