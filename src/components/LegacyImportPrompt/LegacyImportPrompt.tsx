import React from "react";
import { Banner, Button } from "../ui";
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
  <Banner tone="danger" className="pkimm-legacy-prompt__banner">
    <div className="pkimm-legacy-prompt">
      <p>
        <span className="pkimm-legacy-prompt__icon" aria-hidden="true">
          ⚠
        </span>
        We found a saved PKIMM 1.0.0 assessment in your browser
        {count > 0 ? ` with ${count} answered categories` : ""}. Would you like
        to bring it into the new assessment manager?
      </p>
      <p className="pkimm-legacy-prompt__hint">
        Your original copy stays in browser storage either way — if you also use
        a page that runs the older widget, it will still find your work.
      </p>
      <div className="pkimm-legacy-prompt__actions">
        <Button
          variant="primary"
          className="pkimm-legacy-prompt__primary"
          onClick={onImport}
        >
          Import a copy
        </Button>
        <Button
          variant="secondary"
          className="pkimm-legacy-prompt__secondary"
          onClick={onKeepSeparate}
        >
          Keep separate
        </Button>
      </div>
    </div>
  </Banner>
);
