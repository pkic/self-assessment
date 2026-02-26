import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Overview.module.scss";
import { OverviewData } from "../../types/types";

interface OverviewProps {
  overviewData: OverviewData | null;
  onResetAll: () => void;
  onShare: () => void;
  enabledExtensions: string[];
  onToggleExtension: (extensionId: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  overviewData,
  onResetAll,
  onShare,
}) => {
  return (
    <div className="pkimm-overview">
      <div className="pkimm-overview-header">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {overviewData?.data || "No overview data available."}
        </ReactMarkdown>
      </div>
    </div>
  );
};
