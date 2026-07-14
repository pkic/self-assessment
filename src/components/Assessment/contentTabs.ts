export interface ContentTab {
  id: string;
  label: string;
}

// The ordered CONTENT tabs (meta tabs Extensions/Assessments excluded),
// matching the tab strip's content group exactly.
export function getContentTabs(
  modules: { id: string; name: string }[],
  fullMode: boolean,
): ContentTab[] {
  const tabs: ContentTab[] = [{ id: "overview", label: "Overview" }];
  if (fullMode) {
    tabs.push({ id: "scope", label: "Scope" });
    tabs.push({ id: "workspace", label: "Workspace" });
  }
  for (const m of modules) {
    tabs.push({ id: m.id, label: m.name });
  }
  if (fullMode) {
    tabs.push({ id: "action-plans", label: "Action plans" });
    tabs.push({ id: "evaluation", label: "Evaluation" });
  }
  tabs.push({ id: "report", label: "Report" });
  return tabs;
}

// The next content tab after currentTab, or null when currentTab is the last
// content tab (Report) or is not a content tab (a meta tab / unknown / null).
export function getNextContentTab(
  currentTab: string | null,
  modules: { id: string; name: string }[],
  fullMode: boolean,
): ContentTab | null {
  const tabs = getContentTabs(modules, fullMode);
  const idx = tabs.findIndex((t) => t.id === currentTab);
  if (idx === -1) return null;
  return tabs[idx + 1] ?? null;
}
