import React from "react";
import "./TransientAssessmentBanner.module.scss";

interface Props {
  name: string;
  onSave: () => void;
  onDiscard: () => void;
}

export const TransientAssessmentBanner: React.FC<Props> = ({
  name,
  onSave,
  onDiscard,
}) => (
  <div className="pkimm-transient-banner" role="status">
    <p>
      You are viewing a shared assessment{name ? ` (“${name}”)` : ""}. It is not
      saved to this browser yet.
    </p>
    <div className="pkimm-transient-banner__actions">
      <button
        type="button"
        className="pkimm-transient-banner__primary"
        onClick={onSave}
      >
        Save to my assessments
      </button>
      <button
        type="button"
        className="pkimm-transient-banner__secondary"
        onClick={onDiscard}
      >
        Discard
      </button>
    </div>
  </div>
);
