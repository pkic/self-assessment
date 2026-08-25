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

const maturityGateStatus = (
  score: GatedMaturityScore,
  level: number,
  levelMet: boolean,
): MaturityGateStatus => {
  if (score.achievedLevel !== null && level <= score.achievedLevel) {
    return "established";
  }
  if (score.nextLevel === level) return "next";
  if (levelMet) return "complete";
  return "incomplete";
};

const completionPercentage = (
  criteriaMet: number,
  criteriaTotal: number,
  levelMet: boolean,
): number => {
  if (criteriaTotal === 0) return levelMet ? 100 : 0;
  return Math.round((criteriaMet / criteriaTotal) * 100);
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
      const levelMet = result?.met ?? false;
      const status = maturityGateStatus(score, level.number, levelMet);
      const criteriaMet = result?.criteriaMet ?? 0;
      const criteriaTotal = result?.criteriaTotal ?? 0;

      return {
        level: level.number,
        name: level.name,
        criteriaMet,
        criteriaTotal,
        completionPercentage: completionPercentage(
          criteriaMet,
          criteriaTotal,
          levelMet,
        ),
        status,
        statusLabel: statusLabel(status),
      };
    });
};
