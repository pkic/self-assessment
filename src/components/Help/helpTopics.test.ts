import { resolveHelpTopic } from "./helpTopics";

const base = {
  view: "full" as const,
  target: "original" as const,
  moduleIds: ["G", "M", "O", "R"],
};

describe("resolveHelpTopic", () => {
  it("maps content tabs to their topic", () => {
    expect(resolveHelpTopic({ ...base, tab: "overview" })).toBe("overview");
    expect(resolveHelpTopic({ ...base, tab: "scope" })).toBe("scope");
    expect(resolveHelpTopic({ ...base, tab: "workspace" })).toBe("workspace");
    expect(resolveHelpTopic({ ...base, tab: "action-plans" })).toBe(
      "action-plans",
    );
    expect(resolveHelpTopic({ ...base, tab: "evaluation" })).toBe("evaluation");
    expect(resolveHelpTopic({ ...base, tab: "report" })).toBe("report");
    expect(resolveHelpTopic({ ...base, tab: "extensions" })).toBe("extensions");
    expect(resolveHelpTopic({ ...base, tab: "assessments" })).toBe(
      "assessments",
    );
  });
  it("maps a module tab to rating (original) or extension-rating (extension)", () => {
    expect(resolveHelpTopic({ ...base, tab: "G" })).toBe("rating");
    expect(resolveHelpTopic({ ...base, tab: "M", target: "extension" })).toBe(
      "extension-rating",
    );
  });
  it("falls back to overview for null/unknown", () => {
    expect(resolveHelpTopic({ ...base, tab: null })).toBe("overview");
    expect(resolveHelpTopic({ ...base, tab: "mystery" })).toBe("overview");
  });
});
