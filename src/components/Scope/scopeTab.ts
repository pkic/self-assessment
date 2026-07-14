// The Scope tab only exists in full view. If the view drops back to self
// while it's active, redirect to Report rather than stranding the user on a
// hidden nav item (mirrors shouldLeaveEvaluationTab).
export const shouldLeaveScopeTab = (
  currentTab: string | null,
  view: "self" | "full",
): boolean => currentTab === "scope" && view !== "full";
