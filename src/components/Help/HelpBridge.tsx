import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import { HelpProvider, useHelp } from "./HelpProvider";
import { IconButton } from "../ui";
import type { HelpContext } from "./helpTopics";

export const HelpBridge: React.FC<{
  tab: string | null;
  view: "self" | "full";
  moduleIds: string[];
  moduleLabels?: Record<string, string>;
  children: React.ReactNode;
}> = ({ tab, view, moduleIds, moduleLabels, children }) => {
  const { target } = useAssessmentTarget();
  const helpContext: HelpContext = {
    tab,
    view,
    target: target.kind === "extension" ? "extension" : "original",
    moduleIds,
    moduleLabels,
  };
  return <HelpProvider helpContext={helpContext}>{children}</HelpProvider>;
};

// Lives under a HelpBridge so useHelp() resolves against its context —
// rendered wherever a "?" affordance is needed (e.g. the main header).
export const HeaderHelpButton: React.FC = () => {
  const { openHelp } = useHelp();
  return (
    <IconButton label="Help" onClick={() => openHelp()}>
      <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
    </IconButton>
  );
};
