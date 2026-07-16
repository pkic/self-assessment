import yaml from "js-yaml";
import {
  alignBaseline,
  buildComparison,
  buildActionPlanReconciliation,
} from "./comparison";
import type {
  Assessment,
  AssessmentData,
  StructureSnapshot,
  ProgressData,
} from "../types/types";

const TARGET_YAML = `
schemaVersion: "2.0.0"
version: "2.0.0"
modules:
  - id: "G"
    name: "Governance"
    description: "Gov"
    categories:
      - id: "strategy-and-vision"
        weight: 5
        name: "Strategy and Vision"
        description: "Strategy"
        levels:
          - { number: 1, name: "Initial", description: "x" }
          - { number: 2, name: "Foundational", description: "x" }
          - { number: 3, name: "Advanced", description: "x" }
          - { number: 4, name: "Managed", description: "x" }
          - { number: 5, name: "Optimized", description: "x" }
        requirements:
          - id: "org-sponsor-support"
            weight: 3
            description: "Organizational sponsor and support"
            guidance: "x"
            assessment: "x"
            references: []
  - id: "M"
    name: "Management"
    description: "Mgmt"
    categories:
      - id: "risk-management"
        weight: 4
        name: "Risk Management"
        description: "Risk"
        levels:
          - { number: 1, name: "Initial", description: "x" }
          - { number: 2, name: "Foundational", description: "x" }
          - { number: 3, name: "Advanced", description: "x" }
          - { number: 4, name: "Managed", description: "x" }
          - { number: 5, name: "Optimized", description: "x" }
        requirements: []
`;

const mkProgress = (level: number, applicability = true): ProgressData => ({
  level,
  result: "",
  description: "",
  applicability,
});

function makeBaselineAssessment(
  overrides: Partial<Assessment> = {},
): Assessment {
  return {
    id: "baseline-1",
    name: "Baseline",
    dataVersion: "2.0.0",
    progress: {
      "G.strategy-and-vision": mkProgress(2),
      "M.risk-management": mkProgress(3),
    },
    enabledExtensions: [],
    assessmentName: "",
    assessorName: "",
    useCaseDescription: "",
    sourceStructure: { byKey: {} },
    meta: { createdAt: "", updatedAt: "" },
    ...overrides,
  };
}

describe("alignBaseline", () => {
  const target = yaml.load(TARGET_YAML) as AssessmentData;

  it("passes through same-version baselines unchanged", () => {
    const baseline = makeBaselineAssessment({
      requirementProgress: {
        "G.strategy-and-vision.org-sponsor-support": {
          level: 3,
          applicability: true,
          notes: "",
          evidence: "",
        },
      },
      actionPlans: {
        categories: {
          "G.strategy-and-vision": { targetLevel: 4 },
        },
      },
    });

    const result = alignBaseline(baseline, target);

    expect(result.aligned).toBe(false);
    expect(result.unmappedNames).toEqual([]);
    expect(result.progress).toBe(baseline.progress);
    expect(result.requirementProgress).toBe(baseline.requirementProgress);
    expect(result.actionPlans).toBe(baseline.actionPlans);
  });

  it("treats a baseline with no version stamp as 1.0.0 for the same-version check", () => {
    // currentData.version undefined defaults to "1.0.0" per the brief's
    // load-bearing detail: baseline.dataVersion === (currentData.version ?? "1.0.0")
    const oneZeroTarget = { ...target, version: undefined };
    const baseline = makeBaselineAssessment({ dataVersion: "1.0.0" });

    const result = alignBaseline(baseline, oneZeroTarget);

    expect(result.aligned).toBe(false);
    expect(result.progress).toBe(baseline.progress);
  });

  it("remaps a baseline from a different version using its sourceStructure", () => {
    const legacySnapshot: StructureSnapshot = {
      byKey: {
        "G.1": { moduleId: "G", categoryName: "Strategy and Vision" },
        "G.1.1": {
          moduleId: "G",
          categoryName: "Strategy and Vision",
          requirementName: "Organizational sponsor and support",
        },
      },
    };
    const baseline = makeBaselineAssessment({
      dataVersion: "1.0.0",
      progress: {
        "G.1": mkProgress(3),
        "G.1.1": mkProgress(2),
      },
      sourceStructure: legacySnapshot,
    });

    const result = alignBaseline(baseline, target);

    expect(result.aligned).toBe(true);
    expect(Object.keys(result.progress)).toEqual(
      expect.arrayContaining(["G.strategy-and-vision"]),
    );
    expect(result.progress["G.strategy-and-vision"]).toEqual(
      baseline.progress["G.1"],
    );
    // G.1.1's sourceStructure snapshot carries a requirementName, so migrate()
    // maps it to the requirement-scoped progress key (1.0.0 stored requirement
    // ratings in `progress`, not `requirementProgress`).
    expect(
      result.progress["G.strategy-and-vision.org-sponsor-support"],
    ).toEqual(baseline.progress["G.1.1"]);
  });

  it("short-circuits to an empty alignment when sourceStructure.byKey is missing", () => {
    const baseline = makeBaselineAssessment({
      dataVersion: "1.0.0",
      sourceStructure: { byKey: {} },
    });

    const result = alignBaseline(baseline, target);

    expect(result).toEqual({
      progress: {},
      requirementProgress: {},
      actionPlans: undefined,
      unmappedNames: ["(baseline has no alignable structure)"],
      aligned: true,
    });
  });

  it("short-circuits to an empty alignment when sourceStructure is undefined", () => {
    const baseline = makeBaselineAssessment({
      dataVersion: "1.0.0",
      sourceStructure: undefined as unknown as StructureSnapshot,
    });

    const result = alignBaseline(baseline, target);

    expect(result.progress).toEqual({});
    expect(result.unmappedNames).toEqual([
      "(baseline has no alignable structure)",
    ]);
    expect(result.aligned).toBe(true);
  });
});

describe("buildComparison", () => {
  const target = yaml.load(TARGET_YAML) as AssessmentData;

  it("computes overall/module/category deltas with direction", () => {
    // current > baseline in G.strategy-and-vision (up), < in M.risk-management
    // (down); add a third category with equal levels (same).
    const currentProgress: Record<string, ProgressData> = {
      "G.strategy-and-vision": mkProgress(4),
      "M.risk-management": mkProgress(1),
    };
    const baselineProgress: Record<string, ProgressData> = {
      "G.strategy-and-vision": mkProgress(2),
      "M.risk-management": mkProgress(3),
    };

    const result = buildComparison({
      modules: target.modules,
      currentProgress,
      currentRequirementProgress: undefined,
      baselineProgress,
      baselineRequirementProgress: undefined,
    });

    const gCat = result.categories.find(
      (c) => c.key === "G.strategy-and-vision",
    );
    const mCat = result.categories.find((c) => c.key === "M.risk-management");
    expect(gCat?.d).toEqual({
      current: 4,
      baseline: 2,
      delta: 2,
      direction: "up",
    });
    expect(mCat?.d).toEqual({
      current: 1,
      baseline: 3,
      delta: -2,
      direction: "down",
    });

    expect(result.modules).toHaveLength(2);
    const gModule = result.modules.find((m) => m.moduleId === "G");
    expect(gModule?.d.direction).toBe("up");

    expect(result.overall.direction).not.toBe(undefined);
  });

  it("reports 'same' direction when current equals baseline", () => {
    const progress: Record<string, ProgressData> = {
      "G.strategy-and-vision": mkProgress(3),
      "M.risk-management": mkProgress(3),
    };

    const result = buildComparison({
      modules: target.modules,
      currentProgress: progress,
      currentRequirementProgress: undefined,
      baselineProgress: progress,
      baselineRequirementProgress: undefined,
    });

    for (const cat of result.categories) {
      expect(cat.d.direction).toBe("same");
      expect(cat.d.delta).toBe(0);
    }
    expect(result.overall.direction).toBe("same");
  });
});

describe("buildActionPlanReconciliation", () => {
  const target = yaml.load(TARGET_YAML) as AssessmentData;

  const comparison = buildComparison({
    modules: target.modules,
    currentProgress: {
      "G.strategy-and-vision": mkProgress(4),
      "M.risk-management": mkProgress(2),
    },
    currentRequirementProgress: undefined,
    baselineProgress: {
      "G.strategy-and-vision": mkProgress(2),
      "M.risk-management": mkProgress(3),
    },
    baselineRequirementProgress: undefined,
  });

  it("returns an empty array when there are no aligned action plans", () => {
    expect(buildActionPlanReconciliation(undefined, comparison)).toEqual([]);
    expect(
      buildActionPlanReconciliation({ categories: {} }, comparison),
    ).toEqual([]);
  });

  it("classifies met, exceeded, and not-met targets", () => {
    const rows = buildActionPlanReconciliation(
      {
        categories: {
          "G.strategy-and-vision": { targetLevel: 4 }, // achieved 4 -> met
          "M.risk-management": { targetLevel: 5 }, // achieved 2 -> not-met
        },
      },
      comparison,
    );

    const gRow = rows.find((r) => r.key === "G.strategy-and-vision");
    const mRow = rows.find((r) => r.key === "M.risk-management");
    expect(gRow).toEqual({
      key: "G.strategy-and-vision",
      categoryName: "Strategy and Vision",
      targetLevel: 4,
      achieved: 4,
      status: "met",
    });
    expect(mRow).toMatchObject({
      targetLevel: 5,
      achieved: 2,
      status: "not-met",
    });
  });

  it("classifies exceeded when achieved is above target", () => {
    const rows = buildActionPlanReconciliation(
      {
        categories: {
          "G.strategy-and-vision": { targetLevel: 3 }, // achieved 4 -> exceeded
        },
      },
      comparison,
    );
    expect(rows[0]).toMatchObject({ status: "exceeded", achieved: 4 });
  });

  it("skips a plan whose key isn't present in the comparison", () => {
    const rows = buildActionPlanReconciliation(
      {
        categories: {
          "X.does-not-exist": { targetLevel: 2 },
        },
      },
      comparison,
    );
    expect(rows).toEqual([]);
  });
});
