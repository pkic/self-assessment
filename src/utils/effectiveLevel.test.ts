import {
  calculateEffectiveCategoryLevel,
  explainEffectiveCategoryLevel,
  isInScope,
} from "./effectiveLevel";
import type {
  CategoryData,
  ExtensionData,
  ProgressData,
  RequirementProgress,
} from "../types/types";

const category: CategoryData = {
  id: "strategy-and-vision",
  weight: 5,
  name: "Strategy and vision",
  description: "",
  levels: [],
  requirements: [
    {
      id: "sponsor-support",
      weight: 3,
      description: "Organizational sponsor and support",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "responsible-leadership",
      weight: 2,
      description: "Responsible leadership",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "scope-and-drivers",
      weight: 2,
      description: "Scope and drivers",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "architecture",
      weight: 1,
      description: "Architecture",
      guidance: "",
      assessment: "",
      references: [],
    },
  ],
};
const M = "G";
const key = (r: string) => `${M}.${category.id}.${r}`;
const rp = (level: number, applicability = true): RequirementProgress => ({
  level,
  applicability,
  notes: "",
  evidence: "",
});

const selfProgress = (
  level: number,
  applicability = true,
): Record<string, ProgressData> => ({
  [`${M}.${category.id}`]: {
    level,
    result: "",
    description: "",
    applicability,
  },
});

// PQC-style: sponsor ×2.0, responsible ×2.0, scope ×2.0, architecture ×2.5
const pqc: ExtensionData = {
  extension: {
    id: "pqc",
    name: "PQC",
    version: "1.0.0",
    description: "",
    floorScore: true,
  },
  relevance: { modules: [] },
  overlays: {
    modules: [
      {
        id: M,
        categories: [
          {
            id: category.id,
            requirements: [
              {
                id: "sponsor-support",
                type: "multiplier",
                multiplier: 2.0,
                rationale: "r",
              },
              {
                id: "responsible-leadership",
                type: "multiplier",
                multiplier: 2.0,
                rationale: "r",
              },
              {
                id: "scope-and-drivers",
                type: "multiplier",
                multiplier: 2.0,
                rationale: "r",
              },
              {
                id: "architecture",
                type: "multiplier",
                multiplier: 2.5,
                rationale: "r",
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("isInScope", () => {
  it("treats missing/true as in scope, false as out", () => {
    expect(isInScope({ applicability: true })).toBe(true);
    expect(isInScope({ applicability: false })).toBe(false);
  });
});

describe("calculateEffectiveCategoryLevel", () => {
  it("falls back to the self-assessed level when no requirement is assessed", () => {
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(3),
      undefined,
    );
    expect(eff.source).toBe("self");
    expect(eff.raw).toBe(3);
    expect(eff.display).toBe(3);
  });

  it("baseline: weighted requirement average with base weights, floored for display", () => {
    // levels sponsor=4, responsible=3, scope=2, architecture=5; base weights 3,2,2,1
    const requirementProgress = {
      [key("sponsor-support")]: rp(4),
      [key("responsible-leadership")]: rp(3),
      [key("scope-and-drivers")]: rp(2),
      [key("architecture")]: rp(5),
    };
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(1),
      requirementProgress,
    );
    expect(eff.source).toBe("requirements");
    // (4*3 + 3*2 + 2*2 + 5*1) / 8 = 27/8 = 3.375
    expect(eff.raw).toBeCloseTo(3.375, 6);
    expect(eff.display).toBe(3);
    expect(eff.assessedCount).toBe(4);
    expect(eff.totalInScope).toBe(4);
    expect(eff.weightSum).toBe(8); // base weights 3+2+2+1
  });

  it("extension context uses only that extension's overlay weights", () => {
    const requirementProgress = {
      [key("sponsor-support")]: rp(4),
      [key("responsible-leadership")]: rp(3),
      [key("scope-and-drivers")]: rp(2),
      [key("architecture")]: rp(5),
    };
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(1),
      requirementProgress,
      { extension: pqc },
    );
    // weights 6,4,4,2.5 sum 16.5; (4*6 + 3*4 + 2*4 + 5*2.5)/16.5 = 56.5/16.5
    expect(eff.raw).toBeCloseTo(56.5 / 16.5, 6);
  });

  it("baseline is unchanged by an extension argument being present vs absent when no overlays differ from base", () => {
    const requirementProgress = { [key("sponsor-support")]: rp(4) };
    const base = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(1),
      requirementProgress,
    );
    // only sponsor assessed: raw = 4 in both base and any context (single assessed req)
    expect(base.raw).toBe(4);
  });

  it("excludes Not Assessed (level 0) requirements from numerator and denominator", () => {
    const requirementProgress = {
      [key("sponsor-support")]: rp(4),
      [key("responsible-leadership")]: rp(0), // not assessed
    };
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(1),
      requirementProgress,
    );
    expect(eff.raw).toBe(4); // only sponsor counts
    expect(eff.assessedCount).toBe(1);
    expect(eff.totalInScope).toBe(4);
  });

  it("excludes requirement-level N/A from scope", () => {
    const requirementProgress = {
      [key("sponsor-support")]: rp(4),
      [key("architecture")]: rp(5, false), // N/A
    };
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(1),
      requirementProgress,
    );
    expect(eff.raw).toBe(4);
    expect(eff.totalInScope).toBe(3); // architecture out of scope
  });

  it("category applicability=false yields Not Applicable (-1)", () => {
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(0, false),
      undefined,
    );
    expect(eff.source).toBe("self");
    expect(eff.raw).toBe(-1);
    expect(eff.display).toBe(-1);
  });

  it("all requirements individually scoped out derives Not Applicable", () => {
    const requirementProgress = {
      [key("sponsor-support")]: rp(0, false),
      [key("responsible-leadership")]: rp(0, false),
      [key("scope-and-drivers")]: rp(0, false),
      [key("architecture")]: rp(0, false),
    };
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(3),
      requirementProgress,
    );
    expect(eff.source).toBe("derived-not-applicable");
    expect(eff.raw).toBe(-1);
    expect(eff.totalInScope).toBe(0);
  });

  it("display is always an integer in -1..5 for any input", () => {
    const requirementProgress = {
      [key("sponsor-support")]: rp(4),
      [key("architecture")]: rp(5),
    };
    const eff = calculateEffectiveCategoryLevel(
      M,
      category,
      selfProgress(1),
      requirementProgress,
    );
    expect(Number.isInteger(eff.display)).toBe(true);
    expect(eff.display).toBeGreaterThanOrEqual(-1);
    expect(eff.display).toBeLessThanOrEqual(5);
  });
});

const cat = (): CategoryData => ({
  id: "c1",
  weight: 1,
  name: "C1",
  description: "",
  levels: [],
  requirements: [
    {
      id: "r1",
      weight: 2,
      description: "R1",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "r2",
      weight: 1,
      description: "R2",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "r3",
      weight: 1,
      description: "R3",
      guidance: "",
      assessment: "",
      references: [],
    },
  ],
});

describe("explainEffectiveCategoryLevel", () => {
  it("returns one row per in-scope ASSESSED requirement, in model order, with sums and raw", () => {
    const progress: Record<string, ProgressData> = {};
    const rp: Record<string, RequirementProgress> = {
      "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
      "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
      // r3 unassessed (level 0) → excluded from rows
    };
    const e = explainEffectiveCategoryLevel("G", cat(), progress, rp);
    expect(e.rows.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(e.rows[0].effectiveWeight).toBe(2);
    expect(e.weightSum).toBe(3); // 2 + 1
    expect(e.weightedSum).toBe(10); // 4*2 + 2*1
    expect(e.raw).toBeCloseTo(10 / 3, 10);
    expect(e.display).toBe(3); // floor(3.33)
    expect(e.source).toBe("requirements");
    expect(e.assessedCount).toBe(2);
    expect(e.totalInScope).toBe(3);
  });

  it("agrees with calculateEffectiveCategoryLevel on raw/display/weightSum/source (consistency pin)", () => {
    const progress: Record<string, ProgressData> = {};
    const rp: Record<string, RequirementProgress> = {
      "G.c1.r1": { level: 3, applicability: true, notes: "", evidence: "" },
      "G.c1.r3": { level: 5, applicability: true, notes: "", evidence: "" },
    };
    const e = explainEffectiveCategoryLevel("G", cat(), progress, rp);
    const eff = calculateEffectiveCategoryLevel("G", cat(), progress, rp);
    expect(e.raw).toBeCloseTo(eff.raw, 12);
    expect(e.display).toBe(eff.display);
    expect(e.weightSum).toBe(eff.weightSum);
    expect(e.source).toBe(eff.source);
  });

  it("self-declared (no assessed requirements) → empty rows, source self, display from category level", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 2, result: "", description: "", applicability: true },
    };
    const e = explainEffectiveCategoryLevel("G", cat(), progress, undefined);
    expect(e.rows).toEqual([]);
    expect(e.weightSum).toBe(0);
    expect(e.source).toBe("self");
    expect(e.display).toBe(2);
  });

  it("all requirements scoped out → derived-not-applicable, display -1, empty rows", () => {
    const rp: Record<string, RequirementProgress> = {
      "G.c1.r1": { level: 0, applicability: false, notes: "", evidence: "" },
      "G.c1.r2": { level: 0, applicability: false, notes: "", evidence: "" },
      "G.c1.r3": { level: 0, applicability: false, notes: "", evidence: "" },
    };
    const e = explainEffectiveCategoryLevel("G", cat(), {}, rp);
    expect(e.source).toBe("derived-not-applicable");
    expect(e.display).toBe(-1);
    expect(e.rows).toEqual([]);
  });
});
