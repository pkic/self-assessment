import type { GatedMaturityScore } from "../methodologies/cumulativeGates";
import { buildMaturityGateVisualization } from "./maturityGates";

const levels = [
  { number: 0, name: "Baseline" },
  { number: 1, name: "Initiated" },
  { number: 2, name: "Managed" },
];

const score = (overrides: Partial<GatedMaturityScore>): GatedMaturityScore => ({
  achievedLevel: null,
  nextLevel: 0,
  criteriaMet: 0,
  criteriaTotal: 6,
  questionsAnswered: 0,
  questionsTotal: 3,
  questionFindingCounts: {},
  evidenceFiles: 0,
  levelResults: [
    {
      level: 0,
      met: false,
      criteriaMet: 0,
      criteriaTotal: 2,
      blockers: ["L0"],
    },
    {
      level: 1,
      met: false,
      criteriaMet: 0,
      criteriaTotal: 2,
      blockers: ["L1"],
    },
    {
      level: 2,
      met: false,
      criteriaMet: 0,
      criteriaTotal: 2,
      blockers: ["L2"],
    },
  ],
  ...overrides,
});

describe("buildMaturityGateVisualization", () => {
  it("marks established levels and the next cumulative gate", () => {
    const visualization = buildMaturityGateVisualization(
      score({
        achievedLevel: 1,
        nextLevel: 2,
        levelResults: [
          {
            level: 0,
            met: true,
            criteriaMet: 2,
            criteriaTotal: 2,
            blockers: [],
          },
          {
            level: 1,
            met: true,
            criteriaMet: 2,
            criteriaTotal: 2,
            blockers: [],
          },
          {
            level: 2,
            met: false,
            criteriaMet: 1,
            criteriaTotal: 2,
            blockers: ["L2"],
          },
        ],
      }),
      levels,
    );

    expect(visualization.map((level) => level.status)).toEqual([
      "established",
      "established",
      "next",
    ]);
    expect(visualization[2]).toMatchObject({
      completionPercentage: 50,
      statusLabel: "Next gate",
    });
  });

  it("does not present an out-of-sequence complete gate as established", () => {
    const visualization = buildMaturityGateVisualization(
      score({
        achievedLevel: 0,
        nextLevel: 1,
        levelResults: [
          {
            level: 0,
            met: true,
            criteriaMet: 2,
            criteriaTotal: 2,
            blockers: [],
          },
          {
            level: 1,
            met: false,
            criteriaMet: 1,
            criteriaTotal: 2,
            blockers: ["L1"],
          },
          {
            level: 2,
            met: true,
            criteriaMet: 2,
            criteriaTotal: 2,
            blockers: [],
          },
        ],
      }),
      levels,
    );

    expect(visualization[1].status).toBe("next");
    expect(visualization[2]).toMatchObject({
      status: "complete",
      statusLabel: "Criteria complete",
    });
  });
});
