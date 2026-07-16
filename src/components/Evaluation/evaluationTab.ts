// The Evaluation tab only exists in full view — if the user switches back
// to self view (or a restored session resolves to self because full isn't
// available), a currently-active Evaluation tab is stranded and must fall
// back to the Report tab.
export const shouldLeaveEvaluationTab = (
  currentTab: string | null,
  view: "self" | "full",
): boolean => currentTab === "evaluation" && view !== "full";
