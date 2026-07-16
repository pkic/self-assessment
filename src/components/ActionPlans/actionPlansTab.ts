// The Action plans tab only exists in full view; if the view drops to self
// while it's active, redirect to Report (mirrors shouldLeaveScopeTab).
export const shouldLeaveActionPlansTab = (
  currentTab: string | null,
  view: "self" | "full",
): boolean => currentTab === "action-plans" && view !== "full";
