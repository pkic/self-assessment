import {
  calculateOverallMaturityLevel,
  calculateBlendedLevel,
  calculateExtensionWeightedPKIMMScore,
} from "./maturityCalculations";
import type {
  ModuleData,
  ExtensionData,
  ProgressData,
  RequirementProgress,
} from "../types/types";

const rp = (level: number, applicability = true): RequirementProgress => ({
  level,
  applicability,
  notes: "",
  evidence: "",
});

const modules: ModuleData[] = [
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

const requirementProgress: Record<string, RequirementProgress> = {
  "G.sv.sponsor": rp(4),
  "G.sv.lead": rp(3),
  "G.sv.scope": rp(2),
  "G.sv.arch": rp(5),
};
// self-declared category level 1 (should be overridden by requirement data)
const progress: Record<string, ProgressData> = {
  "G.sv": { level: 1, result: "", description: "", applicability: true },
};

const pqc: ExtensionData = {
  extension: {
    id: "pqc",
    name: "PQC",
    version: "1.0.0",
    description: "",
    floorScore: true,
  },
  relevance: {
    modules: [
      {
        id: "G",
        categories: [
          {
            id: "sv",
            weight: 5,
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
            id: "sv",
            requirements: [
              {
                id: "sponsor",
                type: "multiplier",
                multiplier: 2.0,
                rationale: "r",
              },
              {
                id: "lead",
                type: "multiplier",
                multiplier: 2.0,
                rationale: "r",
              },
              {
                id: "scope",
                type: "multiplier",
                multiplier: 2.0,
                rationale: "r",
              },
              {
                id: "arch",
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

describe("full-mode rollups", () => {
  it("overall uses the requirement-derived category level, floored once", () => {
    // raw_C = 27/8 = 3.375; single category → overall floor = 3
    const overall = calculateOverallMaturityLevel(
      modules,
      progress,
      [],
      [],
      requirementProgress,
    );
    expect(overall).toBe(3);
  });

  it("baseline overall ignores an enabled extension's requirement overlays", () => {
    // The baseline rollup is called with [] extensions by the app; this asserts
    // that even if an extension is passed, requirement-overlay weights do not
    // leak into the baseline category level (baseline uses base weights only).
    const baseline = calculateOverallMaturityLevel(
      modules,
      progress,
      [],
      [],
      requirementProgress,
    );
    const withExt = calculateOverallMaturityLevel(
      modules,
      progress,
      [pqc],
      ["pqc"],
      requirementProgress,
    );
    expect(withExt).toBe(baseline); // toggling PQC must not move the baseline score
  });

  it("extension-weighted PKIMM score uses the BASELINE category level and returns a floored integer", () => {
    // Terminal display score → floors. To also prove it uses the baseline (not
    // the extension-context) level, use a fixture where the two floor to
    // DIFFERENT integers: single category, only sponsor+lead assessed, lead ×3.
    const oneCat: ModuleData[] = [
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
            ],
          },
        ],
      },
    ];
    const rpTwo: Record<string, RequirementProgress> = {
      "G.sv.sponsor": rp(2),
      "G.sv.lead": rp(4),
    };
    const prog: Record<string, ProgressData> = {
      "G.sv": { level: 1, result: "", description: "", applicability: true },
    };
    const leadX3: ExtensionData = {
      extension: { id: "pqc", name: "PQC", version: "1.0.0", description: "" },
      relevance: {
        modules: [
          {
            id: "G",
            categories: [
              {
                id: "sv",
                weight: 5,
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
                id: "sv",
                requirements: [
                  {
                    id: "lead",
                    type: "multiplier",
                    multiplier: 3,
                    rationale: "r",
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    // baseline raw_C = (2*3 + 4*2)/5 = 14/5 = 2.8 → floor 2 (single category → weight cancels)
    // extension-context would be (2*3 + 4*6)/9 = 30/9 = 3.33 → floor 3 (wrong)
    expect(
      calculateExtensionWeightedPKIMMScore(oneCat, prog, leadX3, rpTwo),
    ).toBe(2);
  });

  it("blend uses the extension-context (overlay-weighted) category level", () => {
    // raw_C(pqc) = 56.5/16.5; relevance not rated → blend returns raw_C(pqc) (core carries)
    const blended = calculateBlendedLevel(
      "G",
      modules[0].categories[0],
      pqc,
      progress,
      requirementProgress,
    );
    expect(blended).toBeCloseTo(56.5 / 16.5, 6);
  });

  it("a derived-Not-Applicable category (all requirements scoped out) blends to -1, even with rated relevance", () => {
    // Category applicability stays TRUE; every requirement is individually N/A.
    // Extension relevance IS rated → without a guard the formula would emit
    // positive garbage like (-1*w + rel*relW)/(w+relW); it must return -1.
    const allOut: Record<string, RequirementProgress> = {
      "G.sv.sponsor": {
        level: 0,
        applicability: false,
        notes: "",
        evidence: "",
      },
      "G.sv.lead": { level: 0, applicability: false, notes: "", evidence: "" },
      "G.sv.scope": { level: 0, applicability: false, notes: "", evidence: "" },
      "G.sv.arch": { level: 0, applicability: false, notes: "", evidence: "" },
    };
    const ratedRelevance: Record<string, ProgressData> = {
      "G.sv": { level: 1, result: "", description: "", applicability: true },
      "pqc.G.sv": {
        level: 3,
        result: "",
        description: "",
        applicability: true,
      },
    };
    const blended = calculateBlendedLevel(
      "G",
      modules[0].categories[0],
      pqc,
      ratedRelevance,
      allOut,
    );
    expect(blended).toBe(-1);
  });

  it("blend uses the in-scope ASSESSED denominator (not the all-requirements sum) with rated relevance", () => {
    // Assess sponsor/lead/scope; leave arch Not Assessed → it is excluded from
    // BOTH raw_C and WeightSum_C. This distinguishes the correct denominator
    // (14 = 6+4+4) from the wrong all-requirements getWeightSum (16.5).
    const partial: Record<string, RequirementProgress> = {
      "G.sv.sponsor": rp(4),
      "G.sv.lead": rp(3),
      "G.sv.scope": rp(2),
    };
    const ratedRelevance: Record<string, ProgressData> = {
      "G.sv": { level: 1, result: "", description: "", applicability: true },
      "pqc.G.sv": {
        level: 4,
        result: "",
        description: "",
        applicability: true,
      },
    };
    const blended = calculateBlendedLevel(
      "G",
      modules[0].categories[0],
      pqc,
      ratedRelevance,
      partial,
    );
    // raw_C(pqc) = (4*6 + 3*4 + 2*4)/(6+4+4) = 44/14; WeightSum_C = 14; relLevel 4, relWeight 5
    // → (44 + 4*5)/(14 + 5) = 64/19 ≈ 3.368  (NOT (44/14*16.5 + 20)/21.5 ≈ 3.342)
    expect(blended).toBeCloseTo(64 / 19, 6);
  });
});
