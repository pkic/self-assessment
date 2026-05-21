import React from "react";
import type { MigrationSummary as Summary } from "../../types/types";
import "./MigrationSummary.module.scss";

interface Props {
  summary: Summary;
  onClose: () => void;
  onReview?: () => void;
}

export const MigrationSummary: React.FC<Props> = ({
  summary,
  onClose,
  onReview,
}) => (
  <div className="pkimm-migration-summary-overlay" role="dialog">
    <div
      className="pkimm-migration-summary"
      role="document"
      aria-labelledby="pkimm-ms-title"
    >
      <h2 id="pkimm-ms-title">Migration complete</h2>
      <ul>
        <li>Mapped: {summary.mapped}</li>
        {summary.addedInTarget.length > 0 && (
          <li>
            New in target ({summary.addedInTarget.length}):
            <ul>
              {summary.addedInTarget.slice(0, 10).map((n) => (
                <li key={n}>{n}</li>
              ))}
              {summary.addedInTarget.length > 10 && (
                <li>… and {summary.addedInTarget.length - 10} more</li>
              )}
            </ul>
          </li>
        )}
        {summary.unmappedFromSource.length > 0 && (
          <li>
            Not carried over ({summary.unmappedFromSource.length}):
            <ul>
              {summary.unmappedFromSource.slice(0, 10).map((n) => (
                <li key={n}>{n}</li>
              ))}
              {summary.unmappedFromSource.length > 10 && (
                <li>… and {summary.unmappedFromSource.length - 10} more</li>
              )}
            </ul>
          </li>
        )}
        {summary.reclassifiedLevel1ToZero > 0 && (
          <li>
            Reset to Not Assessed (untouched Initial entries):{" "}
            {summary.reclassifiedLevel1ToZero}
          </li>
        )}
      </ul>
      <div className="pkimm-migration-summary__actions">
        {onReview && (
          <button
            type="button"
            className="pkimm-migration-summary__secondary"
            onClick={onReview}
          >
            Review new categories
          </button>
        )}
        <button
          type="button"
          className="pkimm-migration-summary__primary"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  </div>
);
