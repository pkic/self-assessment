import React from "react";
import type { SaveStatusView } from "../../utils/saveStatus";
import "./SaveStatusChip.module.scss";

interface Props {
  status: SaveStatusView;
  lastExportLabel: string | null;
  onExport: () => void;
}

export const SaveStatusChip: React.FC<Props> = ({
  status,
  lastExportLabel,
  onExport,
}) => {
  if (status.kind === "idle") return null;
  const cls = [
    "pkimm-save-status",
    status.kind === "warning" ? "is-warning" : "",
    status.kind === "error" ? "is-error" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      role="status"
      aria-live="polite"
      title={status.message}
    >
      <span aria-label={status.message}>{status.short}</span>
      <button
        type="button"
        className="pkimm-save-status__export"
        onClick={onExport}
        title={`${status.message} — download the active assessment as a file`}
      >
        {lastExportLabel ?? "Export"}
      </button>
    </span>
  );
};
