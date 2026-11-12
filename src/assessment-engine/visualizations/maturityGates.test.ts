import type { GatedMaturityScore } from "../methodologies/cumulativeGates";
import {
  buildMaturityGateVisualization,
  levelColorIndex,
} from "./maturityGates";

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

  it("lists the criteria that keep a level from being established", () => {
    const visualization = buildMaturityGateVisualization(
      score({
        levelResults: [
          {
            level: 0,
            met: false,
            criteriaMet: 0,
            criteriaTotal: 2,
            blockers: ["0.1.1: not-assessed", "0.1.2: evidence is required"],
          },
        ],
      }),
      levels.slice(0, 1),
    );

    expect(visualization[0].outstanding).toEqual([
      { criterionId: "0.1.1", reason: "not-assessed" },
      { criterionId: "0.1.2", reason: "evidence is required" },
    ]);
  });
});

describe("levelColorIndex", () => {
  it("keeps the baseline neutral and maps up to five levels directly", () => {
    expect(
      [0, 1, 2, 3, 4, 5].map((level) => levelColorIndex(level, 5)),
    ).toEqual([0, 1, 2, 3, 4, 5]);
    expect(levelColorIndex(3, 3)).toBe(3);
  });

  it("spreads longer scales across the five maturity colours", () => {
    expect(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => levelColorIndex(level, 9)),
    ).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
});
