import React from "react";
import "./ForwardCompatRefusal.module.scss";

interface Props {
  message: string;
  onDownloadRaw: () => void;
  changelogUrl?: string;
}

export const ForwardCompatRefusal: React.FC<Props> = ({
  message,
  onDownloadRaw,
  changelogUrl,
}) => (
  <div className="pkimm-forward-compat" role="alertdialog">
    <h2>Newer version of this widget is required</h2>
    <p>{message}</p>
    <p>Your data is safe — it has not been modified.</p>
    <div className="pkimm-forward-compat__actions">
      <button
        type="button"
        className="pkimm-forward-compat__primary"
        onClick={onDownloadRaw}
      >
        Download saved assessments
      </button>
      {changelogUrl && (
        <a
          className="pkimm-forward-compat__link"
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
