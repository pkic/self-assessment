import type { GatedMaturityScore } from "../methodologies/cumulativeGates";

export type MaturityGateStatus =
  "established" | "next" | "complete" | "incomplete";

export interface MaturityGateLevel {
  level: number;
  name: string;
  criteriaMet: number;
  criteriaTotal: number;
  completionPercentage: number;
  status: MaturityGateStatus;
  statusLabel: string;
}

const statusLabel = (status: MaturityGateStatus): string => {
  switch (status) {
    case "established":
      return "Established";
    case "next":
      return "Next gate";
    case "complete":
      return "Criteria complete";
    case "incomplete":
      return "Incomplete";
  }
};

export const buildMaturityGateVisualization = (
  score: GatedMaturityScore,
  levels: { number: number; name: string }[],
): MaturityGateLevel[] => {
  const results = new Map(
    score.levelResults.map((result) => [result.level, result]),
  );

  return [...levels]
    .sort((left, right) => left.number - right.number)
    .map((level) => {
      const result = results.get(level.number);
      const established =
        score.achievedLevel !== null && level.number <= score.achievedLevel;
      const status: MaturityGateStatus = established
        ? "established"
        : score.nextLevel === level.number
          ? "next"
          : result?.met
            ? "complete"
            : "incomplete";
      const criteriaMet = result?.criteriaMet ?? 0;
      const criteriaTotal = result?.criteriaTotal ?? 0;
      const completionPercentage =
        criteriaTotal === 0
          ? result?.met
            ? 100
            : 0
          : Math.round((criteriaMet / criteriaTotal) * 100);

      return {
        level: level.number,
        name: level.name,
        criteriaMet,
        criteriaTotal,
        completionPercentage,
        status,
        statusLabel: statusLabel(status),
      };
    });
};
