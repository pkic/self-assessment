import { calculateOverallMaturityLevel } from "../assessment-engine/methodologies/weightedMaturity";
import { calculateEffectiveCategoryLevel } from "./effectiveLevel";
import type {
  ModuleData,
  ExtensionData,
  ProgressData,
  RequirementProgress,
} from "../types/types";

const rp = (level: number): RequirementProgress => ({
  level,
  applicability: true,
  notes: "",
  evidence: "",
});

const modules: ModuleData[] = [
  {
    id: "G",
    name: "G",
    description: "",
    categories: [
      {
        id: "c",
        weight: 3,
        name: "C",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 3,
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
    ],
  },
];
const progress: Record<string, ProgressData> = {
  "G.c": { level: 2, result: "", description: "", applicability: true },
};
const requirementProgress = { "G.c.r1": rp(4), "G.c.r2": rp(2) };

const extA: ExtensionData = {
  extension: { id: "a", name: "A", version: "1.0.0", description: "" },
  relevance: { modules: [] },
  overlays: {
    modules: [
      {
        id: "G",
        categories: [
          {
            id: "c",
            requirements: [
              { id: "r1", type: "multiplier", multiplier: 3, rationale: "r" },
            ],
          },
        ],
      },
    ],
  },
};
const extB: ExtensionData = {
  extension: { id: "b", name: "B", version: "1.0.0", description: "" },
  relevance: { modules: [] },
  overlays: {
    modules: [
      {
        id: "G",
        categories: [
          {
            id: "c",
            requirements: [
              { id: "r1", type: "override", override: 1, rationale: "r" },
            ],
          },
        ],
      },
    ],
  },
};

describe("scoring invariants", () => {
  it("progress is never mutated by an effective-level computation", () => {
    const before = JSON.stringify(progress);
    calculateEffectiveCategoryLevel(
      "G",
      modules[0].categories[0],
      progress,
      requirementProgress,
      { extension: extA },
    );
    calculateOverallMaturityLevel(
      modules,
      progress,
      [extA],
      ["a"],
      requirementProgress,
    );
    expect(JSON.stringify(progress)).toBe(before);
  });

  it("two conflicting extensions each yield a distinct context level; baseline is fixed", () => {
    const base = calculateEffectiveCategoryLevel(
      "G",
      modules[0].categories[0],
      progress,
      requirementProgress,
    ).raw;
    const a = calculateEffectiveCategoryLevel(
      "G",
      modules[0].categories[0],
      progress,
      requirementProgress,
      { extension: extA },
    ).raw;
    const b = calculateEffectiveCategoryLevel(
      "G",
      modules[0].categories[0],
      progress,
      requirementProgress,
      { extension: extB },
    ).raw;
    // base weights 3,1 → (4*3+2*1)/4 = 3.5
    expect(base).toBeCloseTo(3.5, 6);
    // extA: r1 weight 9 → (4*9+2*1)/10 = 3.8
    expect(a).toBeCloseTo(3.8, 6);
    // extB: r1 weight 1 → (4*1+2*1)/2 = 3.0
    expect(b).toBeCloseTo(3.0, 6);
    expect(a).not.toBeCloseTo(b, 6);
  });
});
