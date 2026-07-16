import React, { useEffect, useRef } from "react";
import { Modal, IconButton, Button, LevelBadge } from "../ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  faXmark,
  faLock,
  faChevronRight,
  faCircleInfo,
  faDiagramProject,
  faListCheck,
  faFolderOpen,
  faSliders,
  faClipboardCheck,
  faChartColumn,
  faFileLines,
  faPuzzlePiece,
  faLayerGroup,
  faBook,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import {
  resolveHelpTopic,
  type HelpContext,
  type HelpTopicKey,
} from "./helpTopics";
import { HELP_CONTENT, type HelpSection } from "./helpContent";
import "./HelpPanel.module.scss";

const FULL_ONLY: HelpTopicKey[] = [
  "scope",
  "workspace",
  "action-plans",
  "evaluation",
];
// The TOC lists browsable topics only. "extension-rating" is reached
// contextually (via the extension target), never through the TOC.
const TOC_ORDER: HelpTopicKey[] = [
  "overview",
  "workflow",
  "scope",
  "workspace",
  "rating",
  "action-plans",
  "evaluation",
  "report",
  "extensions",
  "assessments",
  "glossary",
  "faq",
];

const TOPIC_ICONS: Record<HelpTopicKey, IconDefinition> = {
  overview: faCircleInfo,
  workflow: faDiagramProject,
  scope: faListCheck,
  workspace: faFolderOpen,
  rating: faSliders,
  "extension-rating": faSliders,
  "action-plans": faClipboardCheck,
  evaluation: faChartColumn,
  report: faFileLines,
  extensions: faPuzzlePiece,
  assessments: faLayerGroup,
  glossary: faBook,
  faq: faCircleQuestion,
};

// Breadcrumb labels for the fixed tabs; a module tab falls back to its id.
const TAB_CRUMBS: Record<string, string> = {
  overview: "Overview",
  scope: "Scope",
  workspace: "Workspace",
  "action-plans": "Action plans",
  evaluation: "Evaluation",
  report: "Report",
  extensions: "Extensions",
  assessments: "Assessments",
};

const crumbFor = (ctx: HelpContext): string | null => {
  if (!ctx.tab) return null;
  if (ctx.moduleIds.includes(ctx.tab))
    return ctx.moduleLabels?.[ctx.tab] ?? `Module ${ctx.tab}`;
  return TAB_CRUMBS[ctx.tab] ?? null;
};

// "1 Initial — reactive, ad hoc, unpredictable" → the description after the
// dash; the LevelBadge already carries the level number and name.
const levelDescription = (item: string): string => {
  const dash = item.indexOf("—");
  return dash >= 0 ? item.slice(dash + 1).trim() : item;
};

const SectionBlock: React.FC<{ section: HelpSection }> = ({ section }) => (
  <section data-help-section={section.id} className="pkimm-help-panel__section">
    <h3 className="pkimm-help-panel__heading">{section.heading}</h3>
    <p className="pkimm-help-panel__text">{section.body}</p>
    {section.list &&
      (section.id === "rating-levels" ? (
        <ul className="pkimm-help-panel__levels">
          {section.list.map((li, j) => (
            <li key={j} className="pkimm-help-panel__level-row">
              <LevelBadge level={j + 1} variant="soft" />
              <span className="pkimm-help-panel__level-desc">
                {levelDescription(li)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="pkimm-help-panel__list">
          {section.list.map((li, j) => (
            <li key={j}>{li}</li>
          ))}
        </ul>
      ))}
  </section>
);

export interface HelpPanelProps {
  helpContext: HelpContext;
  requestedTopic?: HelpTopicKey;
  requestedSectionId?: string;
  onNavigate: (t: HelpTopicKey) => void;
  onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({
  helpContext,
  requestedTopic,
  requestedSectionId,
  onNavigate,
  onClose,
}) => {
  const key = requestedTopic ?? resolveHelpTopic(helpContext);
  const topic = HELP_CONTENT[key];
  const view = helpContext.view;
  const sections = topic[view];
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestedSectionId) return;
    const el = bodyRef.current?.querySelector<HTMLElement>(
      `[data-help-section="${requestedSectionId}"]`,
    );
    // scrollIntoView is undefined in jsdom — optional-chain the call too.
    el?.scrollIntoView?.({ block: "start" });
  }, [requestedSectionId, key]);

  const tocKeys = TOC_ORDER.filter(
    (k) => k !== key && !(view === "self" && FULL_ONLY.includes(k)),
  );
  const crumb = crumbFor(helpContext);

  return (
    <Modal open placement="right" onClose={onClose} titleId="pkimm-help-title">
      <div className="pkimm-help-panel">
        <div className="pkimm-help-panel__header">
          <div className="pkimm-help-panel__crumb">
            Help{crumb ? ` › ${crumb}` : ""}
          </div>
          <div className="pkimm-help-panel__title-row">
            <h2 id="pkimm-help-title" className="pkimm-help-panel__title">
              {topic.title}
            </h2>
            <span className="pkimm-help-panel__chip">
              {view === "full" ? "Full assessment" : "Self assessment"}
            </span>
            <IconButton label="Close help" onClick={onClose}>
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <div className="pkimm-help-panel__body" ref={bodyRef}>
          {sections.map((s, i) => (
            <SectionBlock key={i} section={s} />
          ))}
          <div className="pkimm-help-panel__toc">
            <div className="pkimm-help-panel__toc-label">More help</div>
            {tocKeys.map((k) => (
              <Button
                key={k}
                variant="ghost"
                size="sm"
                className="pkimm-help-panel__toc-item"
                leftIcon={
                  <FontAwesomeIcon
                    icon={TOPIC_ICONS[k]}
                    className="pkimm-help-panel__toc-icon"
                    aria-hidden="true"
                  />
                }
                onClick={() => onNavigate(k)}
              >
                <span className="pkimm-help-panel__toc-title">
                  {HELP_CONTENT[k].title}
                </span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="pkimm-help-panel__toc-chevron"
                  aria-hidden="true"
                />
              </Button>
            ))}
          </div>
          <p className="pkimm-help-panel__privacy">
            <FontAwesomeIcon icon={faLock} aria-hidden="true" />
            <span>Everything stays in this browser.</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};
