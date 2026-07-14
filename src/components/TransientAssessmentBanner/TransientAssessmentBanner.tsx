import React from "react";
import { Banner, Button } from "../ui";
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
  <Banner tone="info" className="pkimm-transient-banner__margin">
    <div className="pkimm-transient-banner">
      <p>
        You are viewing a shared assessment{name ? ` (“${name}”)` : ""}. It is
        not saved to this browser yet.
      </p>
      <div className="pkimm-transient-banner__actions">
        <Button
          variant="primary"
          className="pkimm-transient-banner__primary"
          onClick={onSave}
        >
          Save to my assessments
        </Button>
        <Button
          variant="secondary"
          className="pkimm-transient-banner__secondary"
          onClick={onDiscard}
        >
          Discard
        </Button>
      </div>
    </div>
  </Banner>
);
