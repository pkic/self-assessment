import {
  buildReportScores,
  buildReportCompleteness,
  buildReportData,
  computeCategoryGrainCounts,
  buildLevelDistribution,
  buildScopeExclusions,
  buildScopeCoverage,
  buildScopeCoverageLine,
  buildRequirementDetailRows,
  buildGapToNextLevel,
  buildActionPlanRows,
} from "./reportData";
import type {
  ModuleData,
  ProgressData,
  ExtensionData,
  RequirementProgress,
  ActionPlans,
} from "../types/types";
import {
  calculateBlendedLevel,
  calculateWeightedMaturityScore,
} from "../assessment-engine/methodologies/weightedMaturity";
import { calculateEffectiveCategoryLevel } from "./effectiveLevel";
import type { RequirementFilterState } from "./requirementFilter";
import LevelResult from "../enums/LevelResult";

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "c1",
        weight: 3,
        name: "C1",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "r1",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
      {
        id: "c2",
        weight: 2,
        name: "C2",
        description: "",
        levels: [],
        requirements: [],
      },
    ],
  },
];
const progress: Record<string, ProgressData> = {
  "G.c1": { level: 4, result: "Managed", description: "", applicability: true },
  "G.c2": {
    level: 2,
    result: "Foundational",
    description: "",
    applicability: true,
  },
};

describe("buildReportScores (core mode)", () => {
  it("returns baseline overall and per-module levels, nulls for extension fields", () => {
    const s = buildReportScores(modules, progress, null);
    // overall = floor((4*3 + 2*2)/(3+2)) = floor(16/5=3.2) = 3
    expect(s.overall).toBe(3);
    expect(s.modules).toEqual([
      { moduleId: "G", module: "Governance", level: 3 },
    ]);
    expect(s.extension).toBeNull();
    expect(s.floor).toBeNull();
    expect(s.weighted).toBeNull();
  });

  it("without requirementProgress: unchanged, byte-identical self-declared scores", () => {
    // Same fixture as above, called explicitly with no 4th arg — proves the
    // new optional param does not alter quick-assessment (self-declared) behavior.
    const s = buildReportScores(modules, progress, null);
    expect(s.overall).toBe(3);
    expect(s.modules).toEqual([
      { moduleId: "G", module: "Governance", level: 3 },
    ]);
    expect(s.extension).toBeNull();
    expect(s.floor).toBeNull();
    expect(s.weighted).toBeNull();
  });

  it("uses the same profile rounding policy as the primary scoring strategy", () => {
    const methodology = {
      strategy: "weighted-average",
      version: "1.0.0",
      parameters: {
        minimumLevel: 0,
        maximumLevel: 5,
        rounding: "ceil",
        categoryWeightField: "weight",
        requirementWeightField: "weight",
        excludeNotApplicable: true,
      },
    };
    const report = buildReportScores(
      modules,
      progress,
      null,
      undefined,
      methodology,
    );
    const primary = calculateWeightedMaturityScore(
      { modules },
      { progress },
      methodology,
    );
    expect(report.overall).toBe(4);
    expect(report.modules[0].level).toBe(primary.moduleLevels[0].level);
    expect(report.overall).toBe(primary.achievedLevel);
  });
});

describe("buildReportScores (full mode, requirementProgress)", () => {
  // Mirrors the fixture in maturityCalculations.fullmode.test.ts: a single
  // module/category with requirements whose weighted levels floor to a
  // DIFFERENT value than the self-declared category level.
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  const fullModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "sv",
          weight: 5,
          name: "Strategy and vision",
          description: "",
          levels: [],
          requirements: [
            {
              id: "sponsor",
              weight: 3,
              description: "sponsor",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "lead",
              weight: 2,
              description: "lead",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "scope",
              weight: 2,
              description: "scope",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "arch",
              weight: 1,
              description: "arch",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];

  // self-declared category level is 1; requirement-derived level floors to 3.
  const fullProgress: Record<string, ProgressData> = {
    "G.sv": { level: 1, result: "", description: "", applicability: true },
  };

  const requirementProgress: Record<string, RequirementProgress> = {
    "G.sv.sponsor": rp(4),
    "G.sv.lead": rp(3),
    "G.sv.scope": rp(2),
    "G.sv.arch": rp(5),
  };

  it("with requirementProgress: overall and per-module level reflect the requirement-derived level", () => {
    // raw_C = (4*3 + 3*2 + 2*2 + 5*1) / (3+2+2+1) = 27/8 = 3.375 -> floor 3
    // single category -> module level and overall both floor to 3.
    const s = buildReportScores(
      fullModules,
      fullProgress,
      null,
      requirementProgress,
    );
    expect(s.overall).toBe(3);
    expect(s.modules).toEqual([
      { moduleId: "G", module: "Governance", level: 3 },
    ]);
  });

  it("without requirementProgress: falls back to the self-declared category level (1)", () => {
    const s = buildReportScores(fullModules, fullProgress, null);
    expect(s.overall).toBe(1);
    expect(s.modules).toEqual([
      { moduleId: "G", module: "Governance", level: 1 },
    ]);
  });
});

describe("buildReportCompleteness", () => {
  it("counts applicable categories and how many are assessed", () => {
    const c = buildReportCompleteness(modules, progress);
    expect(c.total).toBe(2);
    expect(c.assessed).toBe(2);
    expect(c.notAssessed).toBe(0);
    expect(c.isIncomplete).toBe(false);
    expect(c.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 2,
      assessed: 2,
      pct: 100,
    });
  });

  it("excludes Not Applicable categories from total (N/A keeps its prior level in data)", () => {
    // Real N/A shape: applicability false, level RETAINED (not -1), result "Not Applicable".
    const p2: Record<string, ProgressData> = {
      "G.c1": {
        level: 0,
        result: "Not Assessed",
        description: "",
        applicability: true,
      },
      "G.c2": {
        level: 2,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    };
    const c = buildReportCompleteness(modules, p2);
    expect(c.total).toBe(1); // c2 is N/A → excluded from total
    expect(c.assessed).toBe(0); // c1 is applicable but level 0
    expect(c.notAssessed).toBe(1); // c1 (applicable, level 0)
    expect(c.isIncomplete).toBe(true);
    expect(c.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 1,
      assessed: 0,
      pct: 0,
    });
  });
});

describe("buildReportCompleteness / computeCategoryGrainCounts (category grain)", () => {
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  it("quick assessment (no requirementProgress) is byte-identical to category-grain counting", () => {
    // Same fixture/assertions as the pre-existing "counts applicable
    // categories" test above — proves computeCategoryGrainCounts and the
    // refactored buildReportCompleteness didn't change quick-mode behavior.
    const c = buildReportCompleteness(modules, progress);
    expect(c.total).toBe(2);
    expect(c.assessed).toBe(2);
    expect(c.notAssessed).toBe(0);
    expect(c.isIncomplete).toBe(false);
    expect(c.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 2,
      assessed: 2,
      pct: 100,
    });

    const counts = computeCategoryGrainCounts(modules, progress);
    expect(counts.total).toBe(2);
    expect(counts.assessed).toBe(2);
    expect(counts.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 2,
      assessed: 2,
    });
  });

  it("quick assessment with an explicit empty requirementProgress is still category-grain (G.c1 has 1 requirement but is NOT counted at requirement grain)", () => {
    // G.c1 in the shared `modules` fixture carries one requirement. Passing
    // an empty requirementProgress map (rather than omitting the arg
    // entirely) must still fall back to source "self" per category, NOT
    // computeCompleteness's requirements-length-based grain — otherwise a
    // quick assessment would report 1 requirement / 0 assessed for c1
    // instead of 1 category / 1 assessed.
    const c = buildReportCompleteness(modules, progress, {});
    expect(c.total).toBe(2);
    expect(c.assessed).toBe(2);
    expect(c.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 2,
      assessed: 2,
      pct: 100,
    });
  });

  it("full assessment counts each category once (category grain); requirement completeness is a separate figure", () => {
    const fullModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "full",
            weight: 5,
            name: "Full category",
            description: "",
            levels: [],
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "r1",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r2",
                weight: 1,
                description: "r2",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r3",
                weight: 1,
                description: "r3",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r4",
                weight: 1,
                description: "r4",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
          {
            id: "self",
            weight: 3,
            name: "Self category",
            description: "",
            levels: [],
            requirements: [],
          },
        ],
      },
    ];
    const fullProgress: Record<string, ProgressData> = {
      "G.self": {
        level: 3,
        result: "Foundational",
        description: "",
        applicability: true,
      },
    };
    const requirementProgress: Record<string, RequirementProgress> = {
      "G.full.r1": rp(4),
      "G.full.r2": rp(3),
      // r3, r4 left unrated (level 0 / absent) — 2 of 4 rated.
    };

    // Sanity: confirm the fixture actually exercises the "requirements" branch.
    const eff = calculateEffectiveCategoryLevel(
      "G",
      fullModules[0].categories[0],
      fullProgress,
      requirementProgress,
    );
    expect(eff.source).toBe("requirements");
    expect(eff.totalInScope).toBe(4);
    expect(eff.assessedCount).toBe(2);

    const counts = computeCategoryGrainCounts(
      fullModules,
      fullProgress,
      requirementProgress,
    );
    // Both categories are applicable and assessed (effective level > 0), so
    // each counts once at category grain regardless of whether its level
    // came from requirement ratings ("full") or a self-declared level
    // ("self"). total 2, assessed 2.
    expect(counts.total).toBe(2);
    expect(counts.assessed).toBe(2);
    expect(counts.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 2,
      assessed: 2,
    });

    const c = buildReportCompleteness(
      fullModules,
      fullProgress,
      requirementProgress,
    );
    expect(c.total).toBe(2);
    expect(c.assessed).toBe(2);
    expect(c.notAssessed).toBe(0);
    expect(c.isIncomplete).toBe(false);
    expect(c.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 2,
      assessed: 2,
      pct: 100,
    });
    // Requirement-level completeness is reported separately, at requirement
    // grain: 2 of the "full" category's 4 in-scope requirements are rated.
    // The "self" category declares no requirements, so it contributes none.
    expect(c.requirements).toEqual({ assessed: 2, totalInScope: 4 });
  });

  it("derived Not Applicable (all requirements scoped out) contributes 0/0, excluded from total and assessed", () => {
    const naModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "na",
            weight: 5,
            name: "Scoped-out category",
            description: "",
            levels: [],
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "r1",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r2",
                weight: 1,
                description: "r2",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
          {
            id: "self",
            weight: 3,
            name: "Self category",
            description: "",
            levels: [],
            requirements: [],
          },
        ],
      },
    ];
    const naProgress: Record<string, ProgressData> = {
      "G.self": {
        level: 2,
        result: "Foundational",
        description: "",
        applicability: true,
      },
    };
    const scopedOutRequirementProgress: Record<string, RequirementProgress> = {
      "G.na.r1": rp(0, false),
      "G.na.r2": rp(0, false),
    };

    const eff = calculateEffectiveCategoryLevel(
      "G",
      naModules[0].categories[0],
      naProgress,
      scopedOutRequirementProgress,
    );
    expect(eff.source).toBe("derived-not-applicable");
    expect(eff.display).toBe(-1);

    const counts = computeCategoryGrainCounts(
      naModules,
      naProgress,
      scopedOutRequirementProgress,
    );
    // "na" contributes 0/0 (excluded); "self" contributes 1/1.
    expect(counts.total).toBe(1);
    expect(counts.assessed).toBe(1);
    expect(counts.perModule[0]).toEqual({
      moduleId: "G",
      module: "Governance",
      total: 1,
      assessed: 1,
    });

    const c = buildReportCompleteness(
      naModules,
      naProgress,
      scopedOutRequirementProgress,
    );
    expect(c.total).toBe(1);
    expect(c.assessed).toBe(1);
    expect(c.notAssessed).toBe(0);
    expect(c.isIncomplete).toBe(false);
    // Every requirement of "na" is scoped out and "self" declares none, so
    // the separate requirement-completeness figure is empty.
    expect(c.requirements).toEqual({ assessed: 0, totalInScope: 0 });
  });

  it("reports category counts and requirement counts as two independent figures", () => {
    // Regression for the '23 / 30 categories' report: a model of two applicable
    // categories must never report more 'categories' than it has. The category
    // figure counts categories (2); the requirement figure counts in-scope
    // requirements (4) — they are not blended into one number.
    const mixedModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "full",
            weight: 5,
            name: "Full category",
            description: "",
            levels: [],
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "r1",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r2",
                weight: 1,
                description: "r2",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r3",
                weight: 1,
                description: "r3",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r4",
                weight: 1,
                description: "r4",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
          {
            id: "quick",
            weight: 3,
            name: "Quick category",
            description: "",
            levels: [],
            requirements: [],
          },
        ],
      },
    ];
    const mixedProgress: Record<string, ProgressData> = {
      "G.quick": {
        level: 2,
        result: "Foundational",
        description: "",
        applicability: true,
      },
    };
    const mixedRequirementProgress: Record<string, RequirementProgress> = {
      "G.full.r1": rp(4),
      "G.full.r2": rp(3),
      // r3, r4 unrated.
    };

    const c = buildReportCompleteness(
      mixedModules,
      mixedProgress,
      mixedRequirementProgress,
    );
    // Two applicable categories, both assessed → 2 / 2 categories.
    expect(c.total).toBe(2);
    expect(c.assessed).toBe(2);
    // Four in-scope requirements, two rated → 2 / 4 requirements.
    expect(c.requirements).toEqual({ assessed: 2, totalInScope: 4 });
  });
});

describe("buildReportData core detailRows", () => {
  const progress: Record<string, ProgressData> = {
    "G.c1": {
      level: 4,
      result: "Managed",
      description: "d1",
      applicability: true,
    },
    "G.c2": {
      level: 2,
      result: "Foundational",
      description: "d2",
      applicability: true,
    },
  };
  it("core mode: stored view, no relevance/overlays, weight uncollapsed", () => {
    const rd = buildReportData({ modules, progress });
    expect(rd.mode).toBe("core");
    const c1 = rd.detailRows.find((r) => r.key === "G.c1")!;
    expect(c1.storedResult).toBe("Managed");
    expect(c1.storedColorKey).toBe(4);
    expect(c1.description).toBe("d1");
    expect(c1.weightBase).toBe(3);
    expect(c1.weightEffective).toBe(3);
    expect(c1.weightChanged).toBe(false);
    expect(c1.hasRelevance).toBe(false);
    expect(c1.blendedLevelNum).toBe(4); // = stored in core mode
    expect(c1.blendedLabel).toBe("Managed");
    expect(rd.relevanceRows).toEqual([]);
    expect(rd.overlayRows).toEqual([]);
  });

  it("core mode: a Not Applicable category keeps its retained level color and stored 'Not Applicable' text", () => {
    // Real N/A shape: level retained (3), applicability false, result "Not Applicable".
    const p: Record<string, ProgressData> = {
      "G.c1": {
        level: 3,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
      "G.c2": {
        level: 2,
        result: "Foundational",
        description: "",
        applicability: true,
      },
    };
    const c1 = buildReportData({ modules, progress: p }).detailRows.find(
      (r) => r.key === "G.c1",
    )!;
    expect(c1.storedColorKey).toBe(3); // retained level color — NOT -1
    expect(c1.storedResult).toBe("Not Applicable");
  });

  it("quick assessment: a legacy-style stored result string is kept verbatim, NOT recomputed from LevelResult", () => {
    // G.c1 has one requirement (r1) in the shared `modules` fixture, but no
    // requirementProgress is supplied anywhere in this test — so
    // calculateEffectiveCategoryLevel falls back to source "self" and
    // buildDetailRows must preserve the exact stored strings untouched.
    // The stored result string deliberately does NOT match LevelResult[4]
    // ("4 - Managed") to prove the row isn't silently recomputed.
    const p: Record<string, ProgressData> = {
      "G.c1": {
        level: 4,
        result: "Legacy Level Four",
        description: "d1",
        applicability: true,
      },
      "G.c2": {
        level: 2,
        result: "Foundational",
        description: "d2",
        applicability: true,
      },
    };
    const c1 = buildReportData({ modules, progress: p }).detailRows.find(
      (r) => r.key === "G.c1",
    )!;
    expect(c1.storedResult).toBe("Legacy Level Four");
    expect(c1.storedColorKey).toBe(4);
    expect(c1.storedResult).not.toBe(LevelResult[4]);
  });

  it("populates notes from progress[coreKey].notes; a category without notes is undefined", () => {
    const p: Record<string, ProgressData> = {
      "G.c1": {
        level: 4,
        result: "Managed",
        description: "d1",
        applicability: true,
        notes: "n1",
      },
      "G.c2": {
        level: 2,
        result: "Foundational",
        description: "d2",
        applicability: true,
      },
    };
    const rd = buildReportData({ modules, progress: p });
    const c1 = rd.detailRows.find((r) => r.key === "G.c1")!;
    const c2 = rd.detailRows.find((r) => r.key === "G.c2")!;
    expect(c1.notes).toBe("n1");
    expect(c2.notes).toBeUndefined();
  });
});

describe("buildReportData detailRows with requirementProgress (full assessment)", () => {
  // Mirrors the fixture used for buildReportScores full-mode tests: a single
  // module/category with requirements whose weighted levels floor to a
  // DIFFERENT value than the self-declared category level, proving the
  // detail row switches to the requirement-derived level/label.
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  const fullModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "sv",
          weight: 5,
          name: "Strategy and vision",
          description: "",
          levels: [],
          requirements: [
            {
              id: "sponsor",
              weight: 3,
              description: "sponsor",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "lead",
              weight: 2,
              description: "lead",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "scope",
              weight: 2,
              description: "scope",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "arch",
              weight: 1,
              description: "arch",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];

  // self-declared category level is 1; requirement-derived level floors to 3.
  const fullProgress: Record<string, ProgressData> = {
    "G.sv": {
      level: 1,
      result: "1 - Initial",
      description: "",
      applicability: true,
    },
  };

  const requirementProgress: Record<string, RequirementProgress> = {
    "G.sv.sponsor": rp(4),
    "G.sv.lead": rp(3),
    "G.sv.scope": rp(2),
    "G.sv.arch": rp(5),
  };

  it("full assessment: detail row shows the requirement-derived level and label, not the stored self-declared one", () => {
    // eff.display hand-computed: raw = (4*3 + 3*2 + 2*2 + 5*1) / 8 = 27/8 = 3.375 -> floor 3
    const eff = calculateEffectiveCategoryLevel(
      "G",
      fullModules[0].categories[0],
      fullProgress,
      requirementProgress,
    );
    expect(eff.source).toBe("requirements");
    expect(eff.display).toBe(3);

    const rd = buildReportData({
      modules: fullModules,
      progress: fullProgress,
      requirementProgress,
    });
    const sv = rd.detailRows.find((r) => r.key === "G.sv")!;
    expect(sv.storedColorKey).toBe(eff.display);
    expect(sv.storedResult).toBe(LevelResult[eff.display]);
    // Sanity: this differs from the stored self-declared level (1).
    expect(sv.storedColorKey).not.toBe(fullProgress["G.sv"].level);
  });

  it("derived Not Applicable: all requirements scoped out -> detail row is -1 / 'Not Applicable'", () => {
    const scopedOutProgress: Record<string, RequirementProgress> = {
      "G.sv.sponsor": rp(0, false),
      "G.sv.lead": rp(0, false),
      "G.sv.scope": rp(0, false),
      "G.sv.arch": rp(0, false),
    };
    const eff = calculateEffectiveCategoryLevel(
      "G",
      fullModules[0].categories[0],
      fullProgress,
      scopedOutProgress,
    );
    expect(eff.source).toBe("derived-not-applicable");
    expect(eff.display).toBe(-1);

    const rd = buildReportData({
      modules: fullModules,
      progress: fullProgress,
      requirementProgress: scopedOutProgress,
    });
    const sv = rd.detailRows.find((r) => r.key === "G.sv")!;
    expect(sv.storedColorKey).toBe(-1);
    expect(sv.storedResult).toBe(LevelResult[-1]);
  });
});

describe("buildReportData extension mode", () => {
  const extId = "ext1";
  const ext: ExtensionData = {
    extension: {
      id: extId,
      name: "Ext One",
      version: "1.0.0",
      description: "",
    },
    relevance: {
      modules: [
        {
          id: "G",
          categories: [
            {
              id: "c1",
              weight: 2,
              guidance: "",
              assessment: "",
              references: [],
              levels: [],
            },
          ],
        },
      ],
    },
    overlays: {
      modules: [
        {
          id: "G",
          categories: [
            {
              id: "c1",
              type: "multiplier",
              multiplier: 2,
              rationale: "test",
              requirements: [
                {
                  id: "r1",
                  type: "multiplier",
                  multiplier: 2,
                  rationale: "test",
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const relLevel = 3;
  const progress: Record<string, ProgressData> = {
    "G.c1": {
      level: 4,
      result: "Managed",
      description: "d1",
      applicability: true,
    },
    "G.c2": {
      level: 2,
      result: "Foundational",
      description: "d2",
      applicability: true,
    },
    [`${extId}.G.c1`]: {
      level: relLevel,
      result: "Advanced",
      description: "",
      applicability: true,
    },
  };

  it("produces blended detail rows, overlay rows, and relevance rows for extension mode", () => {
    const rd = buildReportData({
      modules,
      progress,
      activeExtension: ext,
    });
    expect(rd.mode).toBe("extension");

    const c1 = rd.detailRows.find((r) => r.key === "G.c1")!;
    const c2 = rd.detailRows.find((r) => r.key === "G.c2")!;

    expect(c1.hasRelevance).toBe(true);
    expect(c1.weightChanged).toBe(true);
    const blended = calculateBlendedLevel(
      "G",
      modules[0].categories[0],
      ext,
      progress,
    );
    const expectedLevelNum = blended === -1 ? -1 : Math.floor(blended);
    expect(c1.blendedLevelNum).toBe(expectedLevelNum);
    expect(c1.blendedLabel).toBe(LevelResult[expectedLevelNum]);

    expect(c2.hasRelevance).toBe(false);
    expect(c2.storedResult).toBe(progress["G.c2"].result);
    expect(c2.storedColorKey).toBe(progress["G.c2"].level);

    expect(rd.overlayRows.length).toBe(1);
    expect(rd.overlayRows[0].key).toBe("G.c1");

    expect(rd.relevanceRows.length).toBe(1);
    expect(rd.relevanceRows[0].key).toBe(`${extId}.G.c1`);
    expect(rd.relevanceRows[0].label).toBe(LevelResult[relLevel]);
    expect(rd.relevanceRows[0].colorKey).toBe(relLevel);
    expect(rd.relevanceRows[0].category).toBe("C1");
  });

  it("carries category-grain notes/evidence onto the relevance row", () => {
    const withText: Record<string, ProgressData> = {
      ...progress,
      [`${extId}.G.c1`]: {
        level: relLevel,
        result: "Advanced",
        description: "",
        applicability: true,
        notes: "N",
        evidence: "E",
      },
    };
    const rd = buildReportData({
      modules,
      progress: withText,
      activeExtension: ext,
    });
    const row = rd.relevanceRows.find((r) => r.key === `${extId}.G.c1`)!;
    expect(row.notes).toBe("N");
    expect(row.evidence).toBe("E");
  });

  it("relevance row without a progress entry has empty notes/evidence", () => {
    const noEntry: Record<string, ProgressData> = {
      "G.c1": progress["G.c1"],
      "G.c2": progress["G.c2"],
    };
    const rd = buildReportData({
      modules,
      progress: noEntry,
      activeExtension: ext,
    });
    const row = rd.relevanceRows.find((r) => r.key === `${extId}.G.c1`)!;
    expect(row.notes).toBe("");
    expect(row.evidence).toBe("");
  });

  it("blended detail row is Not Applicable when the core category is marked not applicable", () => {
    // Real N/A shape: applicability false, level retained (not necessarily -1).
    const p: Record<string, ProgressData> = {
      ...progress,
      "G.c1": {
        level: 4,
        result: "Not Applicable",
        description: "d1",
        applicability: false,
      },
    };
    const rd = buildReportData({
      modules,
      progress: p,
      activeExtension: ext,
    });
    const c1 = rd.detailRows.find((r) => r.key === "G.c1")!;
    expect(c1.hasRelevance).toBe(true); // extension declares relevance for c1
    expect(c1.blendedLevelNum).toBe(-1);
    expect(c1.blendedLabel).toBe(LevelResult[-1]);
  });
});

describe("buildReportData scores threading (requirementProgress reaches buildReportScores)", () => {
  // Pins the buildReportData -> buildReportScores call: requirementProgress
  // must reach the scores builder too, not just detailRows/completeness.
  // Same fixture as the buildReportScores full-mode describe above: a single
  // module/category whose requirement-derived level (3) differs from its
  // self-declared category level (1).
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  const fullModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "sv",
          weight: 5,
          name: "Strategy and vision",
          description: "",
          levels: [],
          requirements: [
            {
              id: "sponsor",
              weight: 3,
              description: "sponsor",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "lead",
              weight: 2,
              description: "lead",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "scope",
              weight: 2,
              description: "scope",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "arch",
              weight: 1,
              description: "arch",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];

  const fullProgress: Record<string, ProgressData> = {
    "G.sv": {
      level: 1,
      result: "1 - Initial",
      description: "",
      applicability: true,
    },
  };

  const requirementProgress: Record<string, RequirementProgress> = {
    "G.sv.sponsor": rp(4),
    "G.sv.lead": rp(3),
    "G.sv.scope": rp(2),
    "G.sv.arch": rp(5),
  };

  it("scores.overall reflects the requirement-derived level, not the self-declared one", () => {
    // raw = (4*3 + 3*2 + 2*2 + 5*1) / 8 = 27/8 = 3.375 -> floor 3.
    // Self-declared category level is 1 — if buildReportData's call to
    // buildReportScores dropped requirementProgress (the L387 gap), this
    // would come back 1 instead of 3, even though detailRows/completeness
    // already reflect the requirement data.
    const rd = buildReportData({
      modules: fullModules,
      progress: fullProgress,
      requirementProgress,
    });
    expect(rd.scores.overall).toBe(3);
    expect(rd.scores.modules).toEqual([
      { moduleId: "G", module: "Governance", level: 3 },
    ]);
    // detailRows and completeness were already requirement-aware pre-fix;
    // scores must now be consistent with them.
    const sv = rd.detailRows.find((r) => r.key === "G.sv")!;
    expect(sv.storedColorKey).toBe(3);
    // completeness counts categories at category grain: one applicable,
    // assessed category → 1 / 1. Requirement-level completeness (all four
    // requirements rated) is the separate requirements figure.
    expect(rd.completeness.assessed).toBe(1);
    expect(rd.completeness.total).toBe(1);
    expect(rd.completeness.requirements).toEqual({
      assessed: 4,
      totalInScope: 4,
    });
  });

  it("omitting requirementProgress reproduces the self-declared-only output exactly", () => {
    const rd = buildReportData({
      modules: fullModules,
      progress: fullProgress,
    });
    expect(rd.scores.overall).toBe(1);
    expect(rd.scores.modules).toEqual([
      { moduleId: "G", module: "Governance", level: 1 },
    ]);
  });
});

describe("buildLevelDistribution", () => {
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  // One module, one category with 3 requirements: one scoped out (N/A), one
  // unrated in-scope (Not Assessed), one rated at level 3.
  const distModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "c1",
          weight: 3,
          name: "Category One",
          description: "",
          levels: [],
          requirements: [
            {
              id: "r1",
              weight: 1,
              description: "r1",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r2",
              weight: 1,
              description: "r2",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r3",
              weight: 1,
              description: "r3",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];

  const distProgress: Record<string, ProgressData> = {
    "G.c1": { level: 0, result: "", description: "", applicability: true },
  };

  const distRequirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": rp(3),
    "G.c1.r2": rp(0),
    "G.c1.r3": rp(0, false),
  };

  it("counts requirements by effective status", () => {
    const dist = buildLevelDistribution({
      modules: distModules,
      progress: distProgress,
      requirementProgress: distRequirementProgress,
    });
    expect(dist.grain).toBe("requirement");
    const g = dist.groups[0];
    expect(g.rows[0].levels[2]).toBe(1); // one requirement at level 3
    expect(g.rows[0].notAssessed).toBe(1); // one unrated in-scope requirement
    expect(g.rows[0].notApplicable).toBe(1); // one scoped-out requirement
    expect(g.rows[0].totalApplicable).toBe(
      g.rows[0].notAssessed + g.rows[0].levels.reduce((a, b) => a + b, 0),
    );
    expect(dist.total.notApplicable).toBe(g.subtotal.notApplicable); // single module ⇒ total == subtotal
  });

  it("category with all requirements scoped out ⇒ all N/A (derived)", () => {
    const allScopedOut: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(0, false),
      "G.c1.r2": rp(0, false),
      "G.c1.r3": rp(0, false),
    };
    const dist = buildLevelDistribution({
      modules: distModules,
      progress: distProgress,
      requirementProgress: allScopedOut,
    });
    expect(dist.groups[0].rows[0].totalApplicable).toBe(0);
    expect(dist.groups[0].rows[0].notApplicable).toBe(
      distModules[0].categories[0].requirements!.length,
    );
  });

  it("category toggled applicability:false ⇒ all its requirements N/A", () => {
    const catNAProgress: Record<string, ProgressData> = {
      "G.c1": {
        level: 2,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    };
    const dist = buildLevelDistribution({
      modules: distModules,
      progress: catNAProgress,
      requirementProgress: distRequirementProgress,
    });
    expect(dist.groups[0].rows[0].notApplicable).toBe(3);
    expect(dist.groups[0].rows[0].totalApplicable).toBe(0);
  });

  it("module subtotal and overall total arithmetic", () => {
    const dist = buildLevelDistribution({
      modules: distModules,
      progress: distProgress,
      requirementProgress: distRequirementProgress,
    });
    const g = dist.groups[0];
    expect(g.subtotal.notApplicable).toBe(g.rows[0].notApplicable);
    expect(g.subtotal.notAssessed).toBe(g.rows[0].notAssessed);
    expect(g.subtotal.levels).toEqual(g.rows[0].levels);
    expect(g.subtotal.totalApplicable).toBe(g.rows[0].totalApplicable);
    expect(dist.total.notApplicable).toBe(g.subtotal.notApplicable);
    expect(dist.total.notAssessed).toBe(g.subtotal.notAssessed);
    expect(dist.total.levels).toEqual(g.subtotal.levels);
    expect(dist.total.totalApplicable).toBe(g.subtotal.totalApplicable);
  });

  it("maps each requirement level to its own bucket (1..5)", () => {
    const dist = buildLevelDistribution({
      modules: distModules,
      progress: distProgress,
      requirementProgress: {
        "G.c1.r1": rp(1),
        "G.c1.r2": rp(5),
        "G.c1.r3": rp(3),
      },
    });
    const row = dist.groups[0].rows[0];
    expect(row.levels).toEqual([1, 0, 1, 0, 1]); // L1, L3, L5 each once
    expect(row.notAssessed).toBe(0);
    expect(row.notApplicable).toBe(0);
    expect(row.totalApplicable).toBe(3);
  });

  it("sums subtotals across multiple modules into the overall total", () => {
    const twoModules: ModuleData[] = [
      distModules[0],
      {
        id: "M",
        name: "Management",
        description: "",
        categories: [
          {
            id: "c1",
            weight: 1,
            name: "M-Cat",
            description: "",
            levels: [],
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "m-r1",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r2",
                weight: 1,
                description: "m-r2",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
        ],
      },
    ];
    const dist = buildLevelDistribution({
      modules: twoModules,
      progress: distProgress,
      requirementProgress: {
        "G.c1.r1": rp(3),
        "G.c1.r2": rp(0),
        "G.c1.r3": rp(0, false),
        "M.c1.r1": rp(2),
        "M.c1.r2": rp(2),
      },
    });
    expect(dist.groups).toHaveLength(2);
    // Overall total must aggregate BOTH modules, not just the first.
    expect(dist.total.levels[1]).toBe(2); // two L2 requirements in module M
    expect(dist.total.levels[2]).toBe(1); // one L3 requirement in module G
    expect(dist.total.notAssessed).toBe(1); // G.c1.r2
    expect(dist.total.notApplicable).toBe(1); // G.c1.r3
    expect(dist.total.totalApplicable).toBe(
      dist.groups[0].subtotal.totalApplicable +
        dist.groups[1].subtotal.totalApplicable,
    );
  });

  it("empty requirementProgress ⇒ category grain by effective level", () => {
    const selfLevels: Record<string, ProgressData> = {
      "G.c1": {
        level: 3,
        result: "Managed",
        description: "",
        applicability: true,
      },
    };
    const dist = buildLevelDistribution({
      modules: distModules,
      progress: selfLevels,
      requirementProgress: {},
    });
    expect(dist.grain).toBe("category");
    // each category contributes a count of 1 in exactly one bucket
    const r = dist.groups[0].rows[0];
    expect(
      r.notApplicable + r.notAssessed + r.levels.reduce((a, b) => a + b, 0),
    ).toBe(1);
    expect(r.levels[2]).toBe(1); // self-declared level 3
  });
});

describe("buildScopeExclusions / buildScopeCoverage / buildScopeCoverageLine", () => {
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  // One module, two categories:
  // - "c1" (2 requirements): "r1" in scope, "r2" scoped out individually
  //   (requirement-scope exclusion) — c1 itself stays in scope since r1 is in.
  // - "c2" (no requirements): explicitly toggled not-applicable at the
  //   category level (category-scope exclusion, derived:false).
  const scopeModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "c1",
          weight: 3,
          name: "Category One",
          description: "",
          levels: [],
          requirements: [
            {
              id: "r1",
              weight: 1,
              description: "First requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r2",
              weight: 1,
              description: "Second requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
        {
          id: "c2",
          weight: 2,
          name: "Category Two",
          description: "",
          levels: [],
          requirements: [],
        },
      ],
    },
  ];

  const scopeProgress: Record<string, ProgressData> = {
    "G.c1": {
      level: 3,
      result: "Managed",
      description: "",
      applicability: true,
    },
    "G.c2": {
      level: 0,
      result: "Not Applicable",
      description: "",
      applicability: false,
      applicabilityReason: "legacy PKI, out of scope",
    },
  };

  const scopeRequirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": rp(3),
    "G.c1.r2": { ...rp(0, false), applicabilityReason: "vendor-managed" },
  };

  it("lists excluded categories and requirements with reasons", () => {
    const ex = buildScopeExclusions({
      modules: scopeModules,
      progress: scopeProgress,
      requirementProgress: scopeRequirementProgress,
    });

    const cat = ex.find((e) => e.scope === "category");
    expect(cat?.key).toBe("G.c2");
    expect(cat?.categoryName).toBe("Category Two");
    expect(cat?.moduleId).toBe("G");
    expect(cat?.reason).toBe("legacy PKI, out of scope");
    expect(cat?.derived).toBe(false); // explicitly toggled, not derived

    const req = ex.find((e) => e.scope === "requirement");
    expect(req?.key).toBe("G.c1.r2");
    expect(req?.requirementName).toBe("Second requirement"); // description, not id
    expect(req?.reason).toBe("vendor-managed");
    expect(req?.derived).toBe(false);

    // c1 itself is NOT listed as a category exclusion (r1 keeps it in scope).
    expect(ex.some((e) => e.scope === "category" && e.key === "G.c1")).toBe(
      false,
    );
  });

  it("a category whose requirements are ALL scoped out is flagged derived:true, and its requirements are not separately listed", () => {
    const allScopedOut: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(0, false),
      "G.c1.r2": rp(0, false),
    };
    const ex = buildScopeExclusions({
      modules: scopeModules,
      progress: scopeProgress,
      requirementProgress: allScopedOut,
    });

    const catExclusions = ex.filter((e) => e.scope === "category");
    const c1Exclusion = catExclusions.find((e) => e.key === "G.c1");
    expect(c1Exclusion?.derived).toBe(true);

    // The explicitly-toggled c2 is still derived:false — proves the two
    // code paths (derived vs explicit) are independently exercised.
    const c2Exclusion = catExclusions.find((e) => e.key === "G.c2");
    expect(c2Exclusion?.derived).toBe(false);

    // Requirements under the derived-N/A category are not individually listed.
    expect(
      ex.some((e) => e.scope === "requirement" && e.key.startsWith("G.c1.")),
    ).toBe(false);
  });

  it("an explicitly-toggled category is derived:false even when it happens to have zero requirements", () => {
    const ex = buildScopeExclusions({
      modules: scopeModules,
      progress: scopeProgress,
      requirementProgress: scopeRequirementProgress,
    });
    const cat = ex.find((e) => e.scope === "category" && e.key === "G.c2");
    expect(cat?.derived).toBe(false);
  });

  it("buildScopeCoverage counts in-scope categories and requirements", () => {
    const cov = buildScopeCoverage({
      modules: scopeModules,
      progress: scopeProgress,
      requirementProgress: scopeRequirementProgress,
    });
    // Categories: c1 in scope (r1 keeps it in), c2 explicitly out -> 1 of 2.
    expect(cov.categoriesInScope).toBe(1);
    expect(cov.categoriesTotal).toBe(2);
    // Requirements: only c1 has requirements (2 total); r1 in, r2 out -> 1 of 2.
    expect(cov.requirementsInScope).toBe(1);
    expect(cov.requirementsTotal).toBe(2);
  });

  it("buildScopeCoverage: a category-level N/A toggle scopes out all of its requirements too", () => {
    // c1 toggled not-applicable at the category level, even though r1 itself
    // is individually in-scope — the category toggle should still win.
    const catNAProgress: Record<string, ProgressData> = {
      ...scopeProgress,
      "G.c1": {
        level: 3,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    };
    const cov = buildScopeCoverage({
      modules: scopeModules,
      progress: catNAProgress,
      requirementProgress: scopeRequirementProgress,
    });
    expect(cov.categoriesInScope).toBe(0);
    expect(cov.requirementsInScope).toBe(0);
    expect(cov.requirementsTotal).toBe(2);
  });

  it("buildScopeCoverageLine formats the summary sentence", () => {
    const cov = buildScopeCoverage({
      modules: scopeModules,
      progress: scopeProgress,
      requirementProgress: scopeRequirementProgress,
    });
    const line = buildScopeCoverageLine(4, cov);
    expect(line).toBe(
      "Level 4 — 1 of 2 categories, 1 of 2 requirements in scope; 1 excluded — see detailed report",
    );
    expect(line).toMatch(
      /^Level 4 — \d+ of \d+ categories, \d+ of \d+ requirements in scope; \d+ excluded/,
    );
  });
});

describe("buildRequirementDetailRows", () => {
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  // One module, two categories:
  // - "c1" (3 requirements): r1 rated, r2 unrated (level 0, in scope), r3
  //   scoped out individually — proves in-scope inclusion (incl. level 0)
  //   and individual requirement exclusion side by side.
  // - "c2" (no requirements): plain self-declared category, included as a
  //   sanity check that a requirement-less category contributes no rows
  //   without throwing.
  const detailModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "c1",
          weight: 3,
          name: "Category One",
          description: "",
          levels: [],
          requirements: [
            {
              id: "r1",
              weight: 1,
              description: "First requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r2",
              weight: 1,
              description: "Second requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r3",
              weight: 1,
              description: "Third requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
        {
          id: "c2",
          weight: 2,
          name: "Category Two",
          description: "",
          levels: [],
          requirements: [],
        },
      ],
    },
  ];

  const detailProgress: Record<string, ProgressData> = {
    "G.c1": { level: 0, result: "", description: "", applicability: true },
    "G.c2": { level: 0, result: "", description: "", applicability: true },
  };

  const detailRequirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": {
      ...rp(3),
      notes: "n1",
      evidence: "e1",
      completed: true,
      flagged: true,
    },
    "G.c1.r2": rp(0),
    "G.c1.r3": rp(0, false),
  };

  it("includes in-scope requirements with level/resultLabel/notes/evidence/completed/flagged", () => {
    const groups = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
    });
    expect(groups).toHaveLength(1);
    const gGroup = groups[0];
    expect(gGroup.moduleId).toBe("G");
    expect(gGroup.module).toBe("Governance");
    expect(gGroup.categories).toHaveLength(1); // c2 has no rows, omitted
    const c1 = gGroup.categories[0];
    expect(c1.categoryKey).toBe("G.c1");
    expect(c1.categoryName).toBe("Category One");
    // r3 is scoped out -> only r1, r2 remain.
    expect(c1.rows.map((r) => r.requirementKey)).toEqual([
      "G.c1.r1",
      "G.c1.r2",
    ]);

    const r1 = c1.rows.find((r) => r.requirementKey === "G.c1.r1")!;
    expect(r1.moduleId).toBe("G");
    expect(r1.module).toBe("Governance");
    expect(r1.categoryKey).toBe("G.c1");
    expect(r1.categoryName).toBe("Category One");
    expect(r1.requirementDescription).toBe("First requirement");
    expect(r1.level).toBe(3);
    expect(r1.resultLabel).toBe(LevelResult[3]);
    expect(r1.notes).toBe("n1");
    expect(r1.evidence).toBe("e1");
    expect(r1.completed).toBe(true);
    expect(r1.flagged).toBe(true);
  });

  it("a level-0 in-scope requirement appears as 'Not Assessed' with default notes/evidence/completed/flagged", () => {
    const groups = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
    });
    const c1 = groups[0].categories.find((c) => c.categoryKey === "G.c1")!;
    const r2 = c1.rows.find((r) => r.requirementKey === "G.c1.r2")!;
    expect(r2.level).toBe(0);
    expect(r2.resultLabel).toBe("Not Assessed");
    expect(r2.notes).toBe("");
    expect(r2.evidence).toBe("");
    expect(r2.completed).toBe(false);
    expect(r2.flagged).toBe(false);
  });

  it("excludes a requirement scoped out individually (applicability: false)", () => {
    const groups = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
    });
    const c1 = groups[0].categories.find((c) => c.categoryKey === "G.c1")!;
    expect(c1.rows.some((r) => r.requirementKey === "G.c1.r3")).toBe(false);
  });

  it("a category toggled explicitly Not Applicable contributes no rows", () => {
    const naProgress: Record<string, ProgressData> = {
      ...detailProgress,
      "G.c1": {
        level: 3,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    };
    const groups = buildRequirementDetailRows({
      modules: detailModules,
      progress: naProgress,
      requirementProgress: detailRequirementProgress,
    });
    // c1 excluded entirely; c2 has no requirements -> no rows either ->
    // module itself is omitted since it has zero non-empty categories.
    expect(groups).toHaveLength(0);
  });

  it("a derived Not Applicable category (every requirement scoped out) contributes no rows", () => {
    const allScopedOut: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(0, false),
      "G.c1.r2": rp(0, false),
      "G.c1.r3": rp(0, false),
    };
    const groups = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: allScopedOut,
    });
    expect(groups).toHaveLength(0);
  });

  it("groups rows module -> category -> rows, omitting empty categories/modules", () => {
    const twoModules: ModuleData[] = [
      detailModules[0],
      {
        id: "M",
        name: "Management",
        description: "",
        categories: [
          {
            id: "empty",
            weight: 1,
            name: "Empty Category",
            description: "",
            levels: [],
            requirements: [],
          },
        ],
      },
    ];
    const groups = buildRequirementDetailRows({
      modules: twoModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
    });
    // Module M has only an empty (no-requirement) category -> no rows -> the
    // whole module is omitted from the output.
    expect(groups).toHaveLength(1);
    expect(groups[0].moduleId).toBe("G");
    expect(groups.some((g) => g.moduleId === "M")).toBe(false);
  });

  it("returns every in-scope row when no filter is passed (unchanged)", () => {
    const withNoFilter = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
    });
    const withEmptyFilter = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
      filter: { text: "", statuses: new Set() },
    });
    expect(withEmptyFilter).toEqual(withNoFilter);
  });

  it("keeps only rows whose requirement matches the status filter", () => {
    const flaggedOnly: RequirementFilterState = {
      text: "",
      statuses: new Set(["flagged"]),
    };
    const filtered = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
      filter: flaggedOnly,
    });
    const rows = filtered.flatMap((m) => m.categories.flatMap((c) => c.rows));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.flagged)).toBe(true);
  });

  it("drops a category entirely when the filter matches none of its requirements", () => {
    const noMatches: RequirementFilterState = {
      text: "nonexistent-text-xyz",
      statuses: new Set(),
    };
    const filtered = buildRequirementDetailRows({
      modules: detailModules,
      progress: detailProgress,
      requirementProgress: detailRequirementProgress,
      filter: noMatches,
    });
    expect(filtered).toHaveLength(0);
  });
});

describe("buildGapToNextLevel", () => {
  const rp = (level: number, applicability = true): RequirementProgress => ({
    level,
    applicability,
    notes: "",
    evidence: "",
  });

  // One module, one category with requirement-derived effective level 2:
  // r1=2, r2=1 (weights 1,1) -> raw = (2+1)/2 = 1.5 -> floor 2? No: floor(1.5)=1.
  // We want an effective display of exactly 2, so pick weights/levels that
  // floor cleanly to 2: r1=2 (w=1), r2=2 (w=1), r3=0 (unrated, in scope),
  // r4=3 (w=1) excluded by using only assessed requirements in the average.
  // raw = (2*1 + 2*1 + 3*1) / (1+1+1) = 7/3 = 2.33 -> floor 2.
  const gapModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "c1",
          weight: 3,
          name: "Category One",
          description: "",
          levels: [
            { number: 1, name: "Initial", description: "Initial criteria" },
            { number: 2, name: "Foundational", description: "L2 criteria" },
            { number: 3, name: "Defined", description: "L3 criteria" },
            { number: 4, name: "Managed", description: "L4 criteria" },
            { number: 5, name: "Optimized", description: "L5 criteria" },
          ],
          requirements: [
            {
              id: "r1",
              weight: 1,
              description: "First requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r2",
              weight: 1,
              description: "Second requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r3",
              weight: 1,
              description: "Third requirement (not assessed)",
              guidance: "",
              assessment: "",
              references: [],
            },
            {
              id: "r4",
              weight: 1,
              description: "Fourth requirement (above current level)",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];

  const gapProgress: Record<string, ProgressData> = {
    "G.c1": { level: 0, result: "", description: "", applicability: true },
  };

  // r1=2, r2=2, r4=3 assessed (avg weighted = (2+2+3)/3 = 2.33 -> floor 2);
  // r3 left unrated (level 0, in scope) — must NOT appear as limiting.
  const gapRequirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": rp(2),
    "G.c1.r2": rp(2),
    "G.c1.r3": rp(0),
    "G.c1.r4": rp(3),
  };

  it("sanity: fixture actually produces effective level 2 via requirements", () => {
    const eff = calculateEffectiveCategoryLevel(
      "G",
      gapModules[0].categories[0],
      gapProgress,
      gapRequirementProgress,
    );
    expect(eff.source).toBe("requirements");
    expect(eff.display).toBe(2);
  });

  it("includes a category at effective level 2 with currentLevel/nextLevel/name/criteria and limitingRequirements", () => {
    const rows = buildGapToNextLevel({
      modules: gapModules,
      progress: gapProgress,
      requirementProgress: gapRequirementProgress,
    });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.categoryKey).toBe("G.c1");
    expect(row.module).toBe("Governance");
    expect(row.categoryName).toBe("Category One");
    expect(row.currentLevel).toBe(2);
    expect(row.nextLevel).toBe(3);
    expect(row.nextLevelName).toBe("Defined");
    expect(row.nextLevelCriteria).toBe("L3 criteria");

    // limitingRequirements: rated requirements with 0 < level <= currentLevel(2).
    // r1 (level 2) and r2 (level 2) qualify; r3 (level 0, Not Assessed) must
    // NOT be listed; r4 (level 3, above currentLevel) must NOT be listed.
    const keys = row.limitingRequirements.map((r) => r.requirementKey).sort();
    expect(keys).toEqual(["G.c1.r1", "G.c1.r2"]);
    expect(
      row.limitingRequirements.some((r) => r.requirementKey === "G.c1.r3"),
    ).toBe(false);
    expect(
      row.limitingRequirements.some((r) => r.requirementKey === "G.c1.r4"),
    ).toBe(false);

    const r1 = row.limitingRequirements.find(
      (r) => r.requirementKey === "G.c1.r1",
    )!;
    expect(r1.description).toBe("First requirement");
    expect(r1.level).toBe(2);
  });

  it("a level-0 (Not-Assessed) in-scope requirement is never limiting, even when currentLevel is high enough to include level 0", () => {
    // Isolate the level-0 exclusion: only r3 (unrated) plus enough assessed
    // requirements to keep the category at "requirements" source.
    const rows = buildGapToNextLevel({
      modules: gapModules,
      progress: gapProgress,
      requirementProgress: gapRequirementProgress,
    });
    const row = rows.find((r) => r.categoryKey === "G.c1")!;
    expect(
      row.limitingRequirements.some((r) => r.requirementKey === "G.c1.r3"),
    ).toBe(false);
  });

  it("lists in-scope unassessed (level-0) requirements in unassessedRequirements, disjoint from limiting", () => {
    const rows = buildGapToNextLevel({
      modules: gapModules,
      progress: gapProgress,
      requirementProgress: gapRequirementProgress,
    });
    const row = rows.find((r) => r.categoryKey === "G.c1")!;
    // r3 (level 0, in scope) is the completeness gap → in unassessedRequirements.
    const unassessedKeys = row.unassessedRequirements
      .map((r) => r.requirementKey)
      .sort();
    expect(unassessedKeys).toEqual(["G.c1.r3"]);
    // Rated requirements never appear here (they are limiting or above-level).
    for (const rated of ["G.c1.r1", "G.c1.r2", "G.c1.r4"]) {
      expect(
        row.unassessedRequirements.some((r) => r.requirementKey === rated),
      ).toBe(false);
    }
    // Disjoint from limitingRequirements.
    const limitingKeys = new Set(
      row.limitingRequirements.map((r) => r.requirementKey),
    );
    expect(
      row.unassessedRequirements.some((r) =>
        limitingKeys.has(r.requirementKey),
      ),
    ).toBe(false);
    expect(row.unassessedRequirements[0].description).toBe(
      "Third requirement (not assessed)",
    );
  });

  it("excludes a category at effective level 0 (Not Assessed)", () => {
    const zeroModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "c0",
            weight: 1,
            name: "Zero Category",
            description: "",
            levels: gapModules[0].categories[0].levels,
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "Unrated requirement",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
        ],
      },
    ];
    const zeroProgress: Record<string, ProgressData> = {
      "G.c0": { level: 0, result: "", description: "", applicability: true },
    };
    const zeroRequirementProgress: Record<string, RequirementProgress> = {
      "G.c0.r1": rp(0),
    };
    const eff = calculateEffectiveCategoryLevel(
      "G",
      zeroModules[0].categories[0],
      zeroProgress,
      zeroRequirementProgress,
    );
    expect(eff.display).toBe(0);

    const rows = buildGapToNextLevel({
      modules: zeroModules,
      progress: zeroProgress,
      requirementProgress: zeroRequirementProgress,
    });
    expect(rows).toHaveLength(0);
  });

  it("excludes a category at effective level -1 (Not Applicable)", () => {
    const naModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "cna",
            weight: 1,
            name: "NA Category",
            description: "",
            levels: gapModules[0].categories[0].levels,
            requirements: [],
          },
        ],
      },
    ];
    const naProgress: Record<string, ProgressData> = {
      "G.cna": {
        level: 3,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    };
    const rows = buildGapToNextLevel({
      modules: naModules,
      progress: naProgress,
      requirementProgress: {},
    });
    expect(rows).toHaveLength(0);
  });

  it("excludes a category at effective level 5 (top level, no next level to reach)", () => {
    const topModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "ctop",
            weight: 1,
            name: "Top Category",
            description: "",
            levels: gapModules[0].categories[0].levels,
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "Top requirement",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
        ],
      },
    ];
    const topProgress: Record<string, ProgressData> = {
      "G.ctop": { level: 0, result: "", description: "", applicability: true },
    };
    const topRequirementProgress: Record<string, RequirementProgress> = {
      "G.ctop.r1": rp(5),
    };
    const eff = calculateEffectiveCategoryLevel(
      "G",
      topModules[0].categories[0],
      topProgress,
      topRequirementProgress,
    );
    expect(eff.display).toBe(5);

    const rows = buildGapToNextLevel({
      modules: topModules,
      progress: topProgress,
      requirementProgress: topRequirementProgress,
    });
    expect(rows).toHaveLength(0);
  });

  it("excludes a self-only category (no requirement-derived data)", () => {
    const selfModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "cself",
            weight: 1,
            name: "Self Category",
            description: "",
            levels: gapModules[0].categories[0].levels,
            requirements: [],
          },
        ],
      },
    ];
    const selfProgress: Record<string, ProgressData> = {
      "G.cself": {
        level: 2,
        result: "Foundational",
        description: "",
        applicability: true,
      },
    };
    const eff = calculateEffectiveCategoryLevel(
      "G",
      selfModules[0].categories[0],
      selfProgress,
      {},
    );
    expect(eff.source).toBe("self");

    const rows = buildGapToNextLevel({
      modules: selfModules,
      progress: selfProgress,
      requirementProgress: {},
    });
    expect(rows).toHaveLength(0);
  });

  it("returns [] for empty modules input", () => {
    const rows = buildGapToNextLevel({
      modules: [],
      progress: {},
      requirementProgress: {},
    });
    expect(rows).toEqual([]);
  });

  it("nextLevelName/nextLevelCriteria default to empty string when the next level is missing from category.levels", () => {
    const noLevelModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "cnolvl",
            weight: 1,
            name: "No Level Data Category",
            description: "",
            levels: [], // no LevelData entries at all
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "req",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
        ],
      },
    ];
    const noLevelProgress: Record<string, ProgressData> = {
      "G.cnolvl": {
        level: 0,
        result: "",
        description: "",
        applicability: true,
      },
    };
    const noLevelRequirementProgress: Record<string, RequirementProgress> = {
      "G.cnolvl.r1": rp(2),
    };
    const rows = buildGapToNextLevel({
      modules: noLevelModules,
      progress: noLevelProgress,
      requirementProgress: noLevelRequirementProgress,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].currentLevel).toBe(2);
    expect(rows[0].nextLevel).toBe(3);
    expect(rows[0].nextLevelName).toBe("");
    expect(rows[0].nextLevelCriteria).toBe("");
  });

  it("aggregates rows across multiple modules and categories in module -> category order", () => {
    const levels = gapModules[0].categories[0].levels;
    const multiModules: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "c1",
            weight: 1,
            name: "G Category",
            description: "",
            levels,
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "g-req",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
        ],
      },
      {
        id: "M",
        name: "Management",
        description: "",
        categories: [
          {
            id: "c1",
            weight: 1,
            name: "M Category",
            description: "",
            levels,
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "m-req",
                guidance: "",
                assessment: "",
                references: [],
              },
            ],
          },
        ],
      },
    ];
    const multiProgress: Record<string, ProgressData> = {
      "G.c1": { level: 0, result: "", description: "", applicability: true },
      "M.c1": { level: 0, result: "", description: "", applicability: true },
    };
    const multiRequirementProgress: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(2),
      "M.c1.r1": rp(3),
    };
    const rows = buildGapToNextLevel({
      modules: multiModules,
      progress: multiProgress,
      requirementProgress: multiRequirementProgress,
    });
    expect(rows.map((r) => r.categoryKey)).toEqual(["G.c1", "M.c1"]);
    expect(rows[0].currentLevel).toBe(2);
    expect(rows[1].currentLevel).toBe(3);
  });
});

describe("buildActionPlanRows", () => {
  const apModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "c1",
          weight: 3,
          name: "Category One",
          description: "",
          levels: [],
          requirements: [
            {
              id: "r1",
              weight: 1,
              description: "First requirement",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];

  const apProgress: Record<string, ProgressData> = {
    "G.c1": { level: 0, result: "", description: "", applicability: true },
  };

  const apRequirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": {
      level: 2,
      applicability: true,
      notes: "",
      evidence: "",
    },
  };

  it("returns [] when there are no action plans", () => {
    expect(
      buildActionPlanRows({
        modules: apModules,
        progress: apProgress,
        requirementProgress: apRequirementProgress,
        actionPlans: undefined,
      }),
    ).toEqual([]);
  });

  it("emits one row per planned in-scope category, module-ordered, with fields", () => {
    const m0 = apModules[0];
    const c0 = m0.categories[0];
    const key = `${m0.id}.${c0.id}`;
    const rows = buildActionPlanRows({
      modules: apModules,
      progress: apProgress,
      requirementProgress: apRequirementProgress,
      actionPlans: {
        categories: {
          [key]: { targetLevel: 4, objectives: "Do the thing" },
        },
      } as unknown as ActionPlans,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryKey).toBe(key);
    expect(rows[0].module).toBe(m0.name);
    expect(rows[0].categoryName).toBe(c0.name);
    expect(rows[0].targetLevel).toBe(4);
    expect(rows[0].objectives).toEqual(["Do the thing"]);
    expect(typeof rows[0].currentLevel).toBe("number");
  });

  it("excludes a plan whose category is Not Applicable", () => {
    const m0 = apModules[0];
    const c0 = m0.categories[0];
    const key = `${m0.id}.${c0.id}`;
    const naProgress = {
      ...apProgress,
      [key]: { ...(apProgress[key] ?? {}), applicability: false },
    };
    const rows = buildActionPlanRows({
      modules: apModules,
      progress: naProgress,
      requirementProgress: apRequirementProgress,
      actionPlans: { categories: { [key]: { targetLevel: 3 } } },
    });
    expect(rows).toEqual([]);
  });

  it("maps the new shape and resolves responsiblePocId to the POC name", () => {
    const m0 = apModules[0];
    const c0 = m0.categories[0];
    const key = `${m0.id}.${c0.id}`;
    const rows = buildActionPlanRows({
      modules: apModules,
      progress: apProgress,
      requirementProgress: apRequirementProgress,
      actionPlans: {
        categories: {
          [key]: {
            targetLevel: 3,
            objectives: [{ id: "o1", text: "Formalise" }],
            outputs: [{ id: "p1", text: "Runbook" }],
            tasks: [{ itemId: "t1", label: "Inventory", done: true }],
            responsiblePocId: "poc1",
            targetDate: "2026-09-30",
          },
        },
      },
      pocs: [{ id: "poc1", name: "Jane Doe", role: "CISO" }],
    });
    expect(rows[0].objectives).toEqual(["Formalise"]);
    expect(rows[0].outputs).toEqual(["Runbook"]);
    expect(rows[0].tasks).toEqual([{ label: "Inventory", done: true }]);
    expect(rows[0].responsibility).toBe("Jane Doe");
    expect(rows[0].targetDate).toBe("2026-09-30");
  });

  it("falls back to free-text responsibility when responsiblePocId doesn't resolve", () => {
    const m0 = apModules[0];
    const c0 = m0.categories[0];
    const key = `${m0.id}.${c0.id}`;
    const rows = buildActionPlanRows({
      modules: apModules,
      progress: apProgress,
      requirementProgress: apRequirementProgress,
      actionPlans: {
        categories: {
          [key]: { targetLevel: 3, responsibility: "Security team" },
        },
      },
      pocs: [],
    });
    expect(rows[0].responsibility).toBe("Security team");
  });

  it("filters blank objectives/outputs/tasks items so the PDF never renders empty bullets", () => {
    const m0 = apModules[0];
    const c0 = m0.categories[0];
    const key = `${m0.id}.${c0.id}`;
    const rows = buildActionPlanRows({
      modules: apModules,
      progress: apProgress,
      requirementProgress: apRequirementProgress,
      actionPlans: {
        categories: {
          [key]: {
            targetLevel: 3,
            objectives: [
              { id: "o1", text: "" },
              { id: "o2", text: "   " },
            ],
            outputs: [{ id: "p1", text: "" }],
            tasks: [{ itemId: "t1", label: "", done: false }],
          },
        },
      },
    });
    expect(rows[0].objectives).toEqual([]);
    expect(rows[0].outputs).toEqual([]);
    expect(rows[0].tasks).toEqual([]);
  });
});
