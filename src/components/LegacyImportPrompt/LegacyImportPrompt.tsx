import React from "react";
import "./LegacyImportPrompt.module.scss";

interface Props {
  count: number;
  onImport: () => void;
  onKeepSeparate: () => void;
}

export const LegacyImportPrompt: React.FC<Props> = ({
  count,
  onImport,
  onKeepSeparate,
}) => (
  <div className="pkimm-legacy-prompt" role="alertdialog" aria-live="polite">
    <p>
      <span className="pkimm-legacy-prompt__icon" aria-hidden="true">
        ⚠
      </span>
      We found a saved PKIMM 1.0.0 assessment in your browser
      {count > 0 ? ` with ${count} answered categories` : ""}. Would you like to
      bring it into the new assessment manager?
    </p>
    <p className="pkimm-legacy-prompt__hint">
      Your original copy stays in browser storage either way — if you also use a
      page that runs the older widget, it will still find your work.
    </p>
    <div className="pkimm-legacy-prompt__actions">
      <button
        type="button"
        className="pkimm-legacy-prompt__primary"
        onClick={onImport}
      >
        Import a copy
      </button>
      <button
        type="button"
        className="pkimm-legacy-prompt__secondary"
        onClick={onKeepSeparate}
      >
        Keep separate
      </button>
    </div>
  </div>
);
