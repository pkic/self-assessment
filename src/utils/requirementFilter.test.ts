import {
  buildRequirementViews,
  matchesFilter,
  nextUnassessedKey,
  resolveRequirementName,
  type RequirementFilterState,
} from "./requirementFilter";
import type {
  AssessmentData,
  CategoryData,
  RequirementProgress,
} from "../types/types";

const category: CategoryData = {
  id: "c1",
  weight: 1,
  name: "C1",
  description: "",
  levels: [],
  requirements: [
    {
      id: "r1",
      weight: 1,
      description: "Key ceremony",
      guidance: "roots",
      assessment: "",
      references: [],
    },
    {
      id: "r2",
      weight: 1,
      description: "HSM policy",
      guidance: "",
      assessment: "tamper",
      references: [],
    },
    {
      id: "r3",
      weight: 1,
      description: "Audit logging",
      guidance: "",
      assessment: "",
      references: [],
    },
  ],
};

describe("buildRequirementViews", () => {
  it("builds one view per requirement, keyed by module.category.requirement", () => {
    const rp: Record<string, RequirementProgress> = {
      "G.c1.r2": { level: 0, applicability: false, notes: "", evidence: "" }, // out of scope
    };
    const views = buildRequirementViews("G", category, rp);
    expect(views.map((v) => v.key)).toEqual(["G.c1.r1", "G.c1.r2", "G.c1.r3"]);
    expect(views[1].applicability).toBe(false);
  });

  it("defaults level 0, applicable, not completed/flagged when no progress", () => {
    const v = buildRequirementViews("G", category, undefined);
    expect(v[0]).toMatchObject({
      level: 0,
      applicability: true,
      completed: false,
      flagged: false,
    });
  });
});

describe("matchesFilter", () => {
  const views = buildRequirementViews("G", category, {
    "G.c1.r1": {
      level: 3,
      applicability: true,
      notes: "",
      evidence: "",
      flagged: true,
    },
    "G.c1.r3": {
      level: 0,
      applicability: true,
      notes: "",
      evidence: "",
      completed: true,
    },
  });
  const f = (
    partial: Partial<RequirementFilterState>,
  ): RequirementFilterState => ({
    text: "",
    statuses: new Set(),
    ...partial,
  });

  it("free-text matches description/guidance/assessment case-insensitively", () => {
    expect(matchesFilter(views[0], f({ text: "ceremony" }))).toBe(true); // description
    expect(matchesFilter(views[1], f({ text: "TAMPER" }))).toBe(true); // assessment
    expect(matchesFilter(views[2], f({ text: "ceremony" }))).toBe(false);
  });
  it("empty filter matches everything", () => {
    expect(views.every((v) => matchesFilter(v, f({})))).toBe(true);
  });
  it("status chips: level number, not-assessed, flagged, completed", () => {
    expect(matchesFilter(views[0], f({ statuses: new Set(["3"]) }))).toBe(true);
    expect(matchesFilter(views[0], f({ statuses: new Set(["flagged"]) }))).toBe(
      true,
    );
    expect(
      matchesFilter(views[2], f({ statuses: new Set(["not-assessed"]) })),
    ).toBe(true);
    expect(
      matchesFilter(views[2], f({ statuses: new Set(["completed"]) })),
    ).toBe(true);
    expect(
      matchesFilter(views[0], f({ statuses: new Set(["not-assessed"]) })),
    ).toBe(false);
  });
  it("multiple status chips are OR-combined; text AND statuses", () => {
    expect(
      matchesFilter(
        views[0],
        f({ text: "ceremony", statuses: new Set(["3", "flagged"]) }),
      ),
    ).toBe(true);
    expect(
      matchesFilter(views[0], f({ text: "nope", statuses: new Set(["3"]) })),
    ).toBe(false);
  });
});

describe("resolveRequirementName", () => {
  const data: AssessmentData = {
    version: "2.0.0",
    modules: [
      { id: "G", name: "Governance", description: "", categories: [category] },
    ],
  };

  it("resolves a requirement key to its description", () => {
    expect(resolveRequirementName("G.c1.r2", data)).toBe("HSM policy");
  });

  it("resolves a category-only key to its category name", () => {
    expect(resolveRequirementName("G.c1", data)).toBe("C1");
  });

  it("returns undefined when the module/category no longer exists", () => {
    expect(resolveRequirementName("X.missing.r1", data)).toBeUndefined();
  });

  it("returns undefined when the requirement no longer exists", () => {
    expect(resolveRequirementName("G.c1.missing", data)).toBeUndefined();
  });

  it("returns undefined when data hasn't loaded yet", () => {
    expect(resolveRequirementName("G.c1.r1", null)).toBeUndefined();
  });

  it("returns undefined for a malformed key", () => {
    expect(resolveRequirementName("", data)).toBeUndefined();
  });
});

describe("nextUnassessedKey", () => {
  const views = buildRequirementViews("G", category, {
    "G.c1.r1": { level: 3, applicability: true, notes: "", evidence: "" },
  });
  it("returns the first in-scope, level-0 requirement after the given key", () => {
    expect(nextUnassessedKey(views)).toBe("G.c1.r2");
    expect(nextUnassessedKey(views, "G.c1.r2")).toBe("G.c1.r3");
  });
  it("skips out-of-scope requirements and wraps to undefined when none remain", () => {
    const all = buildRequirementViews("G", category, {
      "G.c1.r1": { level: 1, applicability: true, notes: "", evidence: "" },
      "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
      "G.c1.r3": { level: 3, applicability: true, notes: "", evidence: "" },
    });
    expect(nextUnassessedKey(all)).toBeUndefined();
  });
});
