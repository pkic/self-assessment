import { computeCompleteness } from "./effectiveLevel";
import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../types/types";

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "c1",
        weight: 1,
        name: "C1",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 1,
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
        ],
      },
    ],
  },
];
const rp = (level: number, applicability = true): RequirementProgress => ({
  level,
  applicability,
  notes: "",
  evidence: "",
});
const noCat: Record<string, ProgressData> = {};

describe("computeCompleteness", () => {
  it("counts in-scope requirements with level > 0", () => {
    const c = computeCompleteness(modules, noCat, {
      "G.c1.r1": rp(3),
      "G.c1.r2": rp(0),
    });
    expect(c).toEqual({ assessed: 1, totalInScope: 2, complete: false });
  });

  it("is complete when every in-scope requirement is assessed", () => {
    const c = computeCompleteness(modules, noCat, {
      "G.c1.r1": rp(3),
      "G.c1.r2": rp(2),
    });
    expect(c).toEqual({ assessed: 2, totalInScope: 2, complete: true });
  });

  it("excludes requirement-level N/A from the denominator", () => {
    const c = computeCompleteness(modules, noCat, {
      "G.c1.r1": rp(3),
      "G.c1.r2": rp(0, false),
    });
    expect(c).toEqual({ assessed: 1, totalInScope: 1, complete: true });
  });

  it("excludes a Not-Applicable category entirely", () => {
    const catNA: Record<string, ProgressData> = {
      "G.c1": {
        level: -1,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    };
    const c = computeCompleteness(modules, catNA, { "G.c1.r1": rp(3) });
    expect(c).toEqual({ assessed: 0, totalInScope: 0, complete: false });
  });

  it("the completed flag does not affect the count", () => {
    const c = computeCompleteness(modules, noCat, {
      "G.c1.r1": { ...rp(0), completed: true },
      "G.c1.r2": rp(2),
    });
    expect(c.assessed).toBe(1); // completed-but-unassessed does not count as assessed
  });
});
