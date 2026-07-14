export type HelpTopicKey =
  | "overview"
  | "scope"
  | "workspace"
  | "rating"
  | "extension-rating"
  | "action-plans"
  | "evaluation"
  | "report"
  | "extensions"
  | "assessments"
  | "workflow"
  | "glossary"
  | "faq";

export interface HelpContext {
  tab: string | null;
  view: "self" | "full";
  target: "original" | "extension";
  moduleIds: string[];
  moduleLabels?: Record<string, string>; // moduleId → display name, for the breadcrumb
}

const FIXED: Record<string, HelpTopicKey> = {
  overview: "overview",
  scope: "scope",
  workspace: "workspace",
  "action-plans": "action-plans",
  evaluation: "evaluation",
  report: "report",
  extensions: "extensions",
  assessments: "assessments",
};

export const resolveHelpTopic = (ctx: HelpContext): HelpTopicKey => {
  const { tab } = ctx;
  if (tab && ctx.moduleIds.includes(tab)) {
    return ctx.target === "extension" ? "extension-rating" : "rating";
  }
  if (tab && FIXED[tab]) return FIXED[tab];
  return "overview";
};
