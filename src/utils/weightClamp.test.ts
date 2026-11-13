import {
  getEffectiveWeight,
  getWeightSum,
} from "../assessment-engine/methodologies/weightedMaturity";
import type { CategoryData, ExtensionData } from "../types/types";

const cat: CategoryData = {
  id: "c",
  weight: 2,
  name: "C",
  description: "",
  levels: [],
  requirements: [],
};

const extWith = (
  categoryOverlay: Partial<{
    type: "multiplier" | "addition" | "override";
    multiplier: number;
    addition: number;
    override: number;
  }>,
): ExtensionData => ({
  extension: { id: "x", name: "X", version: "1.0.0", description: "" },
  relevance: { modules: [] },
  overlays: {
    modules: [
      {
        id: "M",
        categories: [{ id: "c", rationale: "r", ...categoryOverlay }],
      },
    ],
  },
});

describe("getEffectiveWeight clamping", () => {
  it("never returns a negative weight for a large negative addition", () => {
    const w = getEffectiveWeight(
      "M",
      cat,
      [extWith({ type: "addition", addition: -5 })],
      ["x"],
    );
    expect(w).toBe(0);
  });

  it("override to zero yields zero (exclusion), not negative", () => {
    const w = getEffectiveWeight(
      "M",
      cat,
      [extWith({ type: "override", override: 0 })],
      ["x"],
    );
    expect(w).toBe(0);
  });

  it("a normal multiplier still applies", () => {
    const w = getEffectiveWeight(
      "M",
      cat,
      [extWith({ type: "multiplier", multiplier: 2 })],
      ["x"],
    );
    expect(w).toBe(4);
  });
});

describe("getWeightSum clamping", () => {
  const catWithReqs: CategoryData = {
    id: "c",
    weight: 2,
    name: "C",
    description: "",
    levels: [],
    requirements: [
      {
        id: "r1",
        weight: 3,
        description: "",
        guidance: "",
        assessment: "",
        references: [],
      },
      {
        id: "r2",
        weight: 1,
        description: "",
        guidance: "",
        assessment: "",
        references: [],
      },
    ],
  };
  const reqExt = (addition: number): ExtensionData => ({
    extension: { id: "x", name: "X", version: "1.0.0", description: "" },
    relevance: { modules: [] },
    overlays: {
      modules: [
        {
          id: "M",
          categories: [
            {
              id: "c",
              rationale: "r",
              requirements: [
                { id: "r1", type: "addition", addition, rationale: "r" },
              ],
            },
          ],
        },
      ],
    },
  });

  it("clamps a requirement's effective weight at zero before differencing", () => {
    // base sum = 3 + 1 = 4; r1 addition -5 → effective r1 weight max(0, -2) = 0;
    // delta = 0 - 3 = -3 → sum = 4 - 3 = 1 (NOT 4 + (-2-3) = -1)
    expect(getWeightSum("M", catWithReqs, [reqExt(-5)], ["x"])).toBe(1);
  });

  it("a normal positive addition still applies", () => {
    // r1 addition +2 → effective 5; delta +2 → sum 6
    expect(getWeightSum("M", catWithReqs, [reqExt(2)], ["x"])).toBe(6);
  });
});
