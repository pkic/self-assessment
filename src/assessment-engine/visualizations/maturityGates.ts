import type { GatedMaturityScore } from "../methodologies/cumulativeGates";

export type MaturityGateStatus =
  "established" | "next" | "complete" | "incomplete";

export interface OutstandingCriterion {
  criterionId: string;
  reason: string;
}

export interface MaturityGateLevel {
  level: number;
  name: string;
  criteriaMet: number;
  criteriaTotal: number;
  completionPercentage: number;
  status: MaturityGateStatus;
  statusLabel: string;
  /**
   * Maturity colour slot (1 to 5, matching the --pkimm-maturity-level-N
   * tokens), or 0 for a baseline level that has no maturity colour.
   */
  colorIndex: number;
  /** Criteria that still keep this level from being established. */
  outstanding: OutstandingCriterion[];
}

/**
 * Maps a level onto the five maturity colour tokens. Models with up to five
 * positive levels use the level number directly; longer scales are spread
 * evenly across the five colours. Level 0 and below stay neutral.
 */
export const levelColorIndex = (
  level: number,
  maximumLevel: number,
): number => {
  if (level < 1) return 0;
  if (maximumLevel <= 5) return Math.min(level, 5);
  return Math.min(5, 1 + Math.round(((level - 1) * 4) / (maximumLevel - 1)));
};

const parseBlocker = (blocker: string): OutstandingCriterion => {
  const separator = blocker.indexOf(": ");
  if (separator < 0) return { criterionId: blocker, reason: "" };
  return {
    criterionId: blocker.slice(0, separator),
    reason: blocker.slice(separator + 2),
  };
};

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

  const ordered = [...levels].sort((left, right) => left.number - right.number);
  const maximumLevel = ordered[ordered.length - 1]?.number ?? 0;

  return ordered.map((level) => {
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
      colorIndex: levelColorIndex(level.number, maximumLevel),
      outstanding: (result?.blockers ?? []).map(parseBlocker),
    };
  });
};
