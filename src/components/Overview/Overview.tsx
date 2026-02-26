import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Overview.module.scss";
import { OverviewData } from "../../types/types";

interface OverviewProps {
  overviewData: OverviewData | null;
  onResetAll: () => void;
  onShare: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  overviewData,
  onResetAll,
  onShare,
}) => {
  // console.log(overviewData?.data);

  return (
    <div className="pkimm-overview">
      <div className="pkimm-overview-header">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {overviewData?.data || "No overview data available."}
        </ReactMarkdown>
      </div>
      <div className="pkimm-overview-actions">
        <button className="share-button" onClick={onShare}>
          Share Progress
        </button>
        <button className="reset-button" onClick={onResetAll}>
          Global Reset
        </button>
      </div>
    </div>
  );
};
