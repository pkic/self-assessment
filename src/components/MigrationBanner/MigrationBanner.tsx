import React from "react";
import "./MigrationBanner.module.scss";

export interface AxisMismatch {
  kind: "model" | "extension";
  label: string;
  extensionId?: string;
  canKeepHidden: boolean;
}

interface Props {
  sourceName: string;
  mismatches: AxisMismatch[];
  onMigrate: () => void;
  onStartFresh: () => void;
  onKeepHidden?: (extensionId: string) => void;
  changelogUrl?: string;
}

export const MigrationBanner: React.FC<Props> = ({
  sourceName,
  mismatches,
  onMigrate,
  onStartFresh,
  onKeepHidden,
  changelogUrl,
}) => (
  <div className="pkimm-migration-banner" role="alertdialog">
    <p>
      Your assessment <strong>{sourceName}</strong> was created with a different
      version of this model:
    </p>
    <ul>
      {mismatches.map((m, i) => (
        <li key={i}>
          {m.label}
          {m.canKeepHidden && m.extensionId && onKeepHidden && (
            <button
              type="button"
              className="pkimm-migration-banner__keep"
              onClick={() => onKeepHidden(m.extensionId!)}
            >
              Keep on prior version (extension hidden)
            </button>
          )}
        </li>
      ))}
    </ul>
    <div className="pkimm-migration-banner__actions">
      <button
        type="button"
        className="pkimm-migration-banner__primary"
        onClick={onMigrate}
      >
        Migrate
      </button>
      <button
        type="button"
        className="pkimm-migration-banner__secondary"
        onClick={onStartFresh}
      >
        Start fresh
      </button>
      {changelogUrl && (
        <a
          className="pkimm-migration-banner__link"
          href={changelogUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View changelog
        </a>
      )}
    </div>
  </div>
);
