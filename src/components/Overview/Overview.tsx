import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faFolderOpen,
  faLock,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Card } from "../ui";
import { MaturityLadder } from "./MaturityLadder";
import {
  RESOURCES,
  OVERVIEW_GUIDANCE,
  PRIVACY_NOTE,
  HELP_POINTER_NOTE,
} from "./overviewContent";
import "./Overview.module.scss";

interface OverviewProps {
  view: "self" | "full";
}

export const Overview: React.FC<OverviewProps> = ({ view }) => {
  const g = OVERVIEW_GUIDANCE[view];

  return (
    <Card as="section" className="pkimm-overview" padding="lg">
      <div className="pkimm-overview__hero">
        <h1 className="pkimm-overview__title">PKI Maturity Model</h1>
        <span className="pkimm-overview__chip">
          {view === "full" ? "Full assessment" : "Self assessment"}
        </span>
      </div>
      <p className="pkimm-overview__intro">{g.intro}</p>

      <div className="pkimm-overview__guide">
        <h2 className="pkimm-overview__guide-heading">{g.heading}</h2>
        <ol className="pkimm-overview__steps">
          {g.steps.map((label, i) => (
            <li key={label} className="pkimm-overview__step">
              {i > 0 && (
                <FontAwesomeIcon
                  className="pkimm-overview__step-chevron"
                  icon={faChevronRight}
                  aria-hidden="true"
                />
              )}
              <span className="pkimm-overview__step-chip">
                <span className="pkimm-overview__step-num">{i + 1}</span>
                {label}
              </span>
            </li>
          ))}
        </ol>
        <div className="pkimm-overview__facts">
          <div className="pkimm-overview__fact">
            <FontAwesomeIcon icon={faClock} aria-hidden="true" />
            <div>
              <div className="pkimm-overview__fact-label">Time</div>
              <div className="pkimm-overview__fact-body">{g.time}</div>
            </div>
          </div>
          <div className="pkimm-overview__fact">
            <FontAwesomeIcon icon={faFolderOpen} aria-hidden="true" />
            <div>
              <div className="pkimm-overview__fact-label">
                What you&apos;ll need
              </div>
              <div className="pkimm-overview__fact-body">{g.needs}</div>
            </div>
          </div>
          <div className="pkimm-overview__fact">
            <FontAwesomeIcon icon={faLock} aria-hidden="true" />
            <div>
              <div className="pkimm-overview__fact-label">Private</div>
              <div className="pkimm-overview__fact-body">{PRIVACY_NOTE}</div>
            </div>
          </div>
        </div>
        <p className="pkimm-overview__note">{g.note}</p>
        <p className="pkimm-overview__note">{HELP_POINTER_NOTE}</p>
      </div>

      <h2 className="pkimm-overview__section-heading">
        The five maturity levels
      </h2>
      <p className="pkimm-overview__section-sub">
        Each category is rated on this ladder — the goal is steady,
        evidence-backed progress.
      </p>
      <MaturityLadder />

      <h2 className="pkimm-overview__section-heading">Resources</h2>
      <div className="pkimm-overview__resources">
        {RESOURCES.map((r) => (
          <a
            key={r.url}
            className="pkimm-overview__resource"
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="pkimm-overview__resource-title">{r.title}</span>
            <span className="pkimm-overview__resource-desc">
              {r.description}
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
};
