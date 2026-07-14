import { getContentTabs, getNextContentTab } from "./contentTabs";

const MODULES = [
  { id: "G", name: "Governance" },
  { id: "M", name: "Management" },
  { id: "O", name: "Operations" },
  { id: "R", name: "Resources" },
];

describe("getContentTabs", () => {
  it("self order: Overview, modules, Report", () => {
    expect(getContentTabs(MODULES, false).map((t) => t.id)).toEqual([
      "overview",
      "G",
      "M",
      "O",
      "R",
      "report",
    ]);
  });

  it("full order: Overview, Scope, Workspace, modules, Action plans, Evaluation, Report", () => {
    expect(getContentTabs(MODULES, true).map((t) => t.id)).toEqual([
      "overview",
      "scope",
      "workspace",
      "G",
      "M",
      "O",
      "R",
      "action-plans",
      "evaluation",
      "report",
    ]);
  });

  it("labels use module names and fixed tab titles (full sequence)", () => {
    expect(getContentTabs(MODULES, true).map((t) => t.label)).toEqual([
      "Overview",
      "Scope",
      "Workspace",
      "Governance",
      "Management",
      "Operations",
      "Resources",
      "Action plans",
      "Evaluation",
      "Report",
    ]);
    expect(getContentTabs(MODULES, false).map((t) => t.label)).toEqual([
      "Overview",
      "Governance",
      "Management",
      "Operations",
      "Resources",
      "Report",
    ]);
  });

  it("empty modules: self collapses to Overview + Report", () => {
    expect(getContentTabs([], false).map((t) => t.id)).toEqual([
      "overview",
      "report",
    ]);
  });

  it("empty modules: full keeps Scope/Workspace/Action plans/Evaluation", () => {
    expect(getContentTabs([], true).map((t) => t.id)).toEqual([
      "overview",
      "scope",
      "workspace",
      "action-plans",
      "evaluation",
      "report",
    ]);
  });
});

describe("getNextContentTab", () => {
  it("full: Overview → Scope", () => {
    expect(getNextContentTab("overview", MODULES, true)?.id).toBe("scope");
  });

  it("self: Overview → first module", () => {
    expect(getNextContentTab("overview", MODULES, false)).toEqual({
      id: "G",
      label: "Governance",
    });
  });

  it("full: Workspace → first module", () => {
    expect(getNextContentTab("workspace", MODULES, true)?.id).toBe("G");
  });

  it("full: Resources → Action plans", () => {
    expect(getNextContentTab("R", MODULES, true)?.id).toBe("action-plans");
  });

  it("self: Resources → Report", () => {
    expect(getNextContentTab("R", MODULES, false)?.id).toBe("report");
  });

  it("full: Evaluation → Report", () => {
    expect(getNextContentTab("evaluation", MODULES, true)?.id).toBe("report");
  });

  it("Report (last) → null", () => {
    expect(getNextContentTab("report", MODULES, true)).toBeNull();
    expect(getNextContentTab("report", MODULES, false)).toBeNull();
  });

  it("meta tabs → null", () => {
    expect(getNextContentTab("assessments", MODULES, true)).toBeNull();
    expect(getNextContentTab("extensions", MODULES, true)).toBeNull();
  });

  it("unknown id and null → null", () => {
    expect(getNextContentTab("nope", MODULES, true)).toBeNull();
    expect(getNextContentTab(null, MODULES, true)).toBeNull();
  });

  it("empty modules full: Overview → Scope, Workspace → Action plans", () => {
    expect(getNextContentTab("overview", [], true)?.id).toBe("scope");
    expect(getNextContentTab("workspace", [], true)?.id).toBe("action-plans");
  });
});
