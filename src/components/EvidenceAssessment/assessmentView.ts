// Pure view helpers for the evidence assessment screen. They keep display
// decisions out of the component so each one can be tested on its own.
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import type { AssessmentProfileData } from "../../assessment-engine/types";

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Why JSON and PDF export are unavailable, or undefined when they are. */
export const exportBlockedReason = (
  cryptographyAvailable: boolean,
  subjectIssues: string[],
): string | undefined => {
  if (!cryptographyAvailable) return "Export requires HTTPS or localhost.";
  return subjectIssues[0];
};

/** One-line summary of the scope card, for its collapsed header. */
export const scopeSummary = (
  profile: AssessmentProfileData,
  subject: Record<string, unknown>,
  subjectIssues: string[],
): { complete: boolean; summary: string } => {
  if (subjectIssues.length > 0) {
    const plural = subjectIssues.length === 1 ? "" : "s";
    return {
      complete: false,
      summary: `${subjectIssues.length} item${plural} to complete before export`,
    };
  }
  const named = profile.runtime.subjectFields
    .slice(0, 3)
    .map((field) => subject[field.key])
    .filter((value): value is string => typeof value === "string" && !!value)
    .join(" · ");
  return { complete: true, summary: named || "Complete" };
};

export const levelStatusLabel = (
  score: GatedMaturityScore,
  levelNumber: number,
): string => {
  if (score.achievedLevel !== null && levelNumber <= score.achievedLevel) {
    return "Established";
  }
  if (score.nextLevel === levelNumber) return "Next gate";
  return "Not yet established";
};

/** First level whose criteria need evidence, from the scoring methodology. */
export const evidenceRequiredFromLevel = (
  profile: AssessmentProfileData,
): number => {
  const value =
    profile.runtime.methodology.parameters?.evidenceRequiredFromLevel;
  return typeof value === "number" ? value : 1;
};

/** The levels either side of the one shown, for Back and Continue. */
export const adjacentLevels = <Level extends { number: number }>(
  levels: Level[],
  levelNumber: number,
): { previous?: Level; next?: Level; maximumLevel: number } => {
  const index = levels.findIndex((item) => item.number === levelNumber);
  return {
    previous: index > 0 ? levels[index - 1] : undefined,
    next: index >= 0 ? levels[index + 1] : undefined,
    maximumLevel: Math.max(...levels.map((item) => item.number)),
  };
};

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

/** Criterion statuses the methodology counts as passing. */
export const passingStatuses = (profile: AssessmentProfileData): string[] =>
  stringList(profile.runtime.methodology.parameters?.passingStatuses);

/** Question findings the methodology counts as supporting a criterion. */
export const passingQuestionFindings = (
  profile: AssessmentProfileData,
): string[] =>
  stringList(profile.runtime.methodology.parameters?.passingQuestionFindings);
