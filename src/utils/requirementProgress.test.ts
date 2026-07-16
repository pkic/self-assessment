import type { Assessment, RequirementProgress } from "../types/types";
import {
  applyRequirementEdit,
  clearRequirementProgressForCategory,
  computeNextRequirementProgress,
  defaultRequirementProgress,
} from "./requirementProgress";

const makeAssessment = (
  progress: Assessment["progress"] = {},
  requirementProgress?: Record<string, RequirementProgress>,
): Assessment => ({
  id: "a1",
  name: "Test",
  dataVersion: "2.0.0",
  progress,
  enabledExtensions: [],
  assessmentName: "",
  assessorName: "",
  useCaseDescription: "",
  requirementProgress,
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-07-05T10:00:00.000Z",
    updatedAt: "2026-07-05T10:00:00.000Z",
  },
});

describe("defaultRequirementProgress", () => {
  it("returns the level-0, applicable, empty-text shape", () => {
    expect(defaultRequirementProgress()).toEqual({
      level: 0,
      applicability: true,
      notes: "",
      evidence: "",
    });
  });
});

describe("computeNextRequirementProgress", () => {
  it("merges a patch onto the default when prev is undefined", () => {
    const result = computeNextRequirementProgress(undefined, { level: 3 });
    expect(result).toEqual({
      level: 3,
      applicability: true,
      notes: "",
      evidence: "",
    });
  });

  it("merges a patch onto prev, preserving untouched fields", () => {
    const prev: RequirementProgress = {
      level: 2,
      applicability: true,
      notes: "existing notes",
      evidence: "existing evidence",
      flagged: true,
    };
    const result = computeNextRequirementProgress(prev, { level: 4 });
    expect(result).toEqual({
      level: 4,
      applicability: true,
      notes: "existing notes",
      evidence: "existing evidence",
      flagged: true,
    });
  });

  it("toggling applicability to false keeps the prior level", () => {
    const prev: RequirementProgress = {
      level: 3,
      applicability: true,
      notes: "",
      evidence: "",
    };
    const result = computeNextRequirementProgress(prev, {
      applicability: false,
    });
    expect(result.level).toBe(3);
    expect(result.applicability).toBe(false);
  });

  it("is clock-free: never sets updatedAt on its own", () => {
    const result = computeNextRequirementProgress(undefined, { level: 1 });
    expect(result.updatedAt).toBeUndefined();
  });
});

describe("applyRequirementEdit (progress-immutability invariant)", () => {
  it("writes only requirementProgress, leaving a.progress the same reference", () => {
    const a = makeAssessment({
      "G.c1": { level: 2, result: "", description: "", applicability: true },
    });
    const result = applyRequirementEdit(a, "G.c1.r1", { level: 3 });

    // Headline invariant: category progress is untouched by reference.
    expect(result.progress).toBe(a.progress);
    expect(result.requirementProgress!["G.c1.r1"].level).toBe(3);
    // The key never leaks into the category-level progress map.
    expect(result.progress["G.c1.r1"]).toBeUndefined();
  });

  it("uses the 3-segment key format moduleId.categoryId.requirementId", () => {
    const a = makeAssessment();
    const result = applyRequirementEdit(a, "M.c2.r5", { level: 1 });
    expect(Object.keys(result.requirementProgress!)).toEqual(["M.c2.r5"]);
  });

  it("merges onto an existing requirementProgress entry without dropping other keys", () => {
    const a = makeAssessment(
      {},
      {
        "G.c1.r1": { level: 1, applicability: true, notes: "n", evidence: "e" },
        "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
      },
    );
    const result = applyRequirementEdit(a, "G.c1.r1", { level: 5 });
    expect(result.requirementProgress!["G.c1.r1"]).toEqual({
      level: 5,
      applicability: true,
      notes: "n",
      evidence: "e",
    });
    expect(result.requirementProgress!["G.c1.r2"]).toEqual(
      a.requirementProgress!["G.c1.r2"],
    );
  });

  it("does not mutate the original assessment", () => {
    const a = makeAssessment();
    applyRequirementEdit(a, "G.c1.r1", { level: 3 });
    expect(a.requirementProgress).toBeUndefined();
  });
});

describe("clearRequirementProgressForCategory", () => {
  it("removes only the target category's requirement keys, leaves progress untouched by reference", () => {
    const a = makeAssessment(
      {
        "G.c1": { level: 2, result: "", description: "", applicability: true },
      },
      {
        "G.c1.r1": { level: 1, applicability: true, notes: "", evidence: "" },
        "G.c1.r2": { level: 3, applicability: true, notes: "", evidence: "" },
        "G.c2.r1": { level: 4, applicability: true, notes: "", evidence: "" },
        "M.c1.r1": { level: 2, applicability: true, notes: "", evidence: "" },
        // A category id that has "c1" as a prefix must NOT be cleared by clearing "c1".
        "G.c10.r1": { level: 5, applicability: true, notes: "", evidence: "" },
      },
    );
    const result = clearRequirementProgressForCategory(a, "G", "c1");

    expect(result.requirementProgress).toEqual({
      "G.c2.r1": { level: 4, applicability: true, notes: "", evidence: "" },
      "M.c1.r1": { level: 2, applicability: true, notes: "", evidence: "" },
      "G.c10.r1": { level: 5, applicability: true, notes: "", evidence: "" },
    });
    expect(result.progress).toBe(a.progress);
  });

  it("is a no-op-safe when requirementProgress is undefined", () => {
    const a = makeAssessment();
    const result = clearRequirementProgressForCategory(a, "G", "c1");
    expect(result.requirementProgress).toBeUndefined();
    expect(result.progress).toBe(a.progress);
  });
});
