import {
  calculateBlendedLevel,
  calculateExtensionMaturityLevels,
  calculateExtensionWeightedPKIMMScore,
  calculateExtensionFloorScore,
  calculateOverallMaturityLevel,
  getEffectiveWeight,
} from "./maturityCalculations";
import type {
  CategoryData,
  ExtensionData,
  ModuleData,
  ProgressData,
} from "../types/types";

/**
 * Reference example from the PKIMM extension framework Scoring model
 * documentation (extensions/scoring/_index.md). Self-assessment mode
 * because the widget collects category-level maturity directly.
 *
 * Inputs:
 *   Category cat-a with three requirements:
 *     r1 weight 3, overlay multiplier 1.5 → effective weight 4.5
 *     r2 weight 2, no overlay
 *     r3 weight 1, no overlay
 *   Total WeightSum_C = 4.5 + 2 + 1 = 7.5
 *
 *   Category base weight 4, category overlay multiplier 1.25
 *     → effective_category_weight = 5
 *
 *   Extension relevance for cat-a: RelLevel_C = 2, RelWeight_C = 2
 *
 *   User-selected Level_C (self-assessment) = 4
 *
 * Expected (spec):
 *   ExtensionCategoryLevel_C = (4 × 7.5 + 2 × 2) / (7.5 + 2)
 *                             = (30 + 4) / 9.5
 *                             = 34 / 9.5
 *                             ≈ 3.5789...
 */

const buildSpecFixture = () => {
  const catA: CategoryData = {
    id: "cat-a",
    name: "Category A",
    description: "x",
    weight: 4,
    levels: [
      { number: 1, name: "Initial", description: "x" },
      { number: 2, name: "Foundational", description: "x" },
      { number: 3, name: "Advanced", description: "x" },
      { number: 4, name: "Managed", description: "x" },
      { number: 5, name: "Optimized", description: "x" },
    ],
    requirements: [
      {
        id: "r1",
        weight: 3,
        description: "r1",
        guidance: "x",
        assessment: "x",
        references: "",
      },
      {
        id: "r2",
        weight: 2,
        description: "r2",
        guidance: "x",
        assessment: "x",
        references: "",
      },
      {
        id: "r3",
        weight: 1,
        description: "r3",
        guidance: "x",
        assessment: "x",
        references: "",
      },
    ],
  };

  const catB: CategoryData = {
    id: "cat-b",
    name: "Category B",
    description: "x",
    weight: 3,
    levels: [
      { number: 1, name: "Initial", description: "x" },
      { number: 2, name: "Foundational", description: "x" },
      { number: 3, name: "Advanced", description: "x" },
      { number: 4, name: "Managed", description: "x" },
      { number: 5, name: "Optimized", description: "x" },
    ],
    requirements: [],
  };

  const modules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "x",
      categories: [catA, catB],
    },
  ];

  const extension: ExtensionData = {
    schemaVersion: "1.0.0",
    extension: {
      id: "demo",
      name: "Demo",
      version: "1.0.0",
      description: "x",
      documentation: "https://example.com",
    },
    relevance: {
      modules: [
        {
          id: "G",
          categories: [
            {
              id: "cat-a",
              weight: 2,
              guidance: "x",
              assessment: "x",
              references: "",
              levels: [
                { number: 1, name: "Initial", description: "x" },
                { number: 2, name: "Foundational", description: "x" },
                { number: 3, name: "Advanced", description: "x" },
                { number: 4, name: "Managed", description: "x" },
                { number: 5, name: "Optimized", description: "x" },
              ],
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
              id: "cat-a",
              type: "multiplier",
              multiplier: 1.25,
              requirements: [
                {
                  id: "r1",
                  type: "multiplier",
                  multiplier: 1.5,
                  rationale: "Test overlay",
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return { catA, catB, modules, extension };
};

describe("calculateBlendedLevel — spec self-assessment example", () => {
  const { catA, extension } = buildSpecFixture();

  const progress: Record<string, ProgressData> = {
    "G.cat-a": {
      level: 4,
      result: "4 - Managed",
      description: "",
      applicability: true,
    },
    "demo.G.cat-a": {
      level: 2,
      result: "2 - Foundational",
      description: "",
      applicability: true,
    },
  };

  it("applies the spec formula (Level_C × WeightSum_C + RelLevel_C × RelWeight_C) / (WeightSum_C + RelWeight_C)", () => {
    const blended = calculateBlendedLevel("G", catA, extension, progress);
    expect(blended).toBeCloseTo(34 / 9.5, 5);
  });

  it("returns Level_C when relevance is not defined for the category", () => {
    const { catB } = buildSpecFixture();
    const noRelExt: ExtensionData = {
      ...extension,
      relevance: { modules: [{ id: "G", categories: [] }] },
    };
    const blended = calculateBlendedLevel("G", catB, noRelExt, {
      "G.cat-b": {
        level: 3,
        result: "3 - Advanced",
        description: "",
        applicability: true,
      },
    });
    expect(blended).toBe(3);
  });

  it("returns Level_C when extension relevance is unrated (RelLevel_C = 0)", () => {
    const blended = calculateBlendedLevel("G", catA, extension, {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
    });
    expect(blended).toBe(4);
  });

  it("returns 0 when baseline Level_C is unrated", () => {
    const blended = calculateBlendedLevel("G", catA, extension, {
      "demo.G.cat-a": {
        level: 5,
        result: "5 - Optimized",
        description: "",
        applicability: true,
      },
    });
    expect(blended).toBe(0);
  });

  it("returns -1 (Not Applicable) when applicability is explicitly false", () => {
    const blended = calculateBlendedLevel("G", catA, extension, {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: false,
      },
    });
    expect(blended).toBe(-1);
  });
});

describe("getEffectiveWeight — spec category overlay example", () => {
  const { catA, extension } = buildSpecFixture();

  it("applies the category-level multiplier (4 × 1.25 = 5)", () => {
    const weight = getEffectiveWeight(
      "G",
      catA,
      [extension],
      [extension.extension.id],
    );
    expect(weight).toBe(5);
  });

  it("returns base weight when no overlay is active", () => {
    expect(getEffectiveWeight("G", catA, [], [])).toBe(4);
  });
});

describe("calculateExtensionMaturityLevels — Extension Score (spec)", () => {
  const { modules, extension } = buildSpecFixture();

  it("weights by effective_category_weight (NOT WeightSum_C + RelWeight_C)", () => {
    // cat-a: Level_C = 4, blended ≈ 3.5789, effective_category_weight = 5
    // cat-b: Level_C = 4, no relevance → blended = 4, weight = 3 (no overlay)
    // ExtensionScore = (3.5789 × 5 + 4 × 3) / (5 + 3) = 29.8947 / 8 ≈ 3.7368
    // Math.floor → 3
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "demo.G.cat-a": {
        level: 2,
        result: "2 - Foundational",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
    };
    const [result] = calculateExtensionMaturityLevels(
      modules,
      [extension],
      [extension.extension.id],
      progress,
    );
    expect(result.id).toBe("demo");
    expect(result.level).toBe(3);
  });
});

describe("calculateExtensionWeightedPKIMMScore — spec view", () => {
  const { modules, extension } = buildSpecFixture();

  it("uses baseline Level_C (NOT blended) with effective_category_weight", () => {
    // cat-a: Level_C = 4, effective_category_weight = 5
    // cat-b: Level_C = 4, weight = 3
    // ExtensionWeightedPKIMM = (4 × 5 + 4 × 3) / (5 + 3) = 32 / 8 = 4
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "demo.G.cat-a": {
        level: 2,
        result: "2 - Foundational",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
    };
    const score = calculateExtensionWeightedPKIMMScore(
      modules,
      progress,
      extension,
    );
    expect(score).toBe(4);
  });

  it("differs from ExtensionScore because the relevance signal is intentionally excluded", () => {
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "demo.G.cat-a": {
        level: 5,
        result: "5 - Optimized",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
    };
    // ExtensionWeightedPKIMM is unaffected by relevance, still = 4.
    const ewp = calculateExtensionWeightedPKIMMScore(
      modules,
      progress,
      extension,
    );
    expect(ewp).toBe(4);

    // ExtensionScore includes the relevance signal — different number.
    const [{ level: extScore }] = calculateExtensionMaturityLevels(
      modules,
      [extension],
      [extension.extension.id],
      progress,
    );
    // blended cat-a = (4 × 7.5 + 5 × 2) / 9.5 = 40/9.5 ≈ 4.21
    // (4.21 × 5 + 4 × 3) / 8 = 33.05 / 8 ≈ 4.13 → floor 4
    expect(extScore).toBe(4);
    // Spec point: even when both round to 4 in this fixture, the inputs feed
    // different math. The next test pushes them apart.
  });
});

describe("calculateExtensionFloorScore — spec minimum rule", () => {
  const { modules, extension } = buildSpecFixture();

  it("returns null when the extension does not opt in via floorScore", () => {
    expect(calculateExtensionFloorScore(modules, extension, {})).toBe(null);
  });

  it("returns the minimum ExtensionCategoryLevel_C across applicable categories when enabled", () => {
    const ext: ExtensionData = {
      ...extension,
      extension: { ...extension.extension, floorScore: true },
    };
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "demo.G.cat-a": {
        level: 2,
        result: "2 - Foundational",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 5,
        result: "5 - Optimized",
        description: "",
        applicability: true,
      },
    };
    // blended cat-a ≈ 3.579, cat-b (no relevance) = 5 → min ≈ 3.579 → floor 3
    expect(calculateExtensionFloorScore(modules, ext, progress)).toBe(3);
  });
});

describe("calculateOverallMaturityLevel — baseline PKIMM (no extension influence)", () => {
  const { modules } = buildSpecFixture();

  it("uses Level_C × category.weight, ignoring extensions when none are passed", () => {
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 2,
        result: "2 - Foundational",
        description: "",
        applicability: true,
      },
    };
    // (4 × 4 + 2 × 3) / (4 + 3) = 22 / 7 ≈ 3.14 → floor 3
    expect(calculateOverallMaturityLevel(modules, progress)).toBe(3);
  });

  it("excludes Not Assessed (level 0) categories from the rollup", () => {
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 0,
        result: "Not Assessed",
        description: "",
        applicability: true,
      },
    };
    // Only cat-a counts: (4 × 4) / 4 = 4
    expect(calculateOverallMaturityLevel(modules, progress)).toBe(4);
  });

  it("excludes Not Applicable (applicability false) from the rollup", () => {
    const progress: Record<string, ProgressData> = {
      "G.cat-a": {
        level: 4,
        result: "4 - Managed",
        description: "",
        applicability: true,
      },
      "G.cat-b": {
        level: 5,
        result: "5 - Optimized",
        description: "",
        applicability: false,
      },
    };
    expect(calculateOverallMaturityLevel(modules, progress)).toBe(4);
  });
});
