// The Workspace tab only exists in full view. If the view drops back to self
// while it's active, redirect to Report rather than stranding the user on a
// hidden nav item (mirrors shouldLeaveScopeTab / shouldLeaveEvaluationTab).
export const shouldLeaveWorkspaceTab = (
  currentTab: string | null,
  view: "self" | "full",
): boolean => currentTab === "workspace" && view !== "full";
