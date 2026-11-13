// Pure view helpers for the evidence assessment screen. They keep display
// decisions out of the component so each one can be tested on its own.
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import { validAssessmentFormat } from "../../assessment-engine/subject-validation";
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
/**
 * Short names for what the scope still needs: each empty required field, each
 * field with an invalid value, and each unmet "at least one of" rule (named by
 * the subject group that holds its fields, when there is one).
 */
export const subjectOutstanding = (
  profile: AssessmentProfileData,
  subject: Record<string, string>,
): string[] => {
  const outstanding = profile.runtime.subjectFields.flatMap((field) => {
    const value = subject[field.key]?.trim() ?? "";
    if (field.required && !value) return [field.label];
    if (!validAssessmentFormat(field.format, value)) {
      return [`a valid ${field.label}`];
    }
    return [];
  });
  for (const rule of profile.runtime.subjectRules ?? []) {
    if (rule.fields.some((field) => subject[field]?.trim())) continue;
    const group = profile.runtime.subjectGroups?.find((candidate) =>
      rule.fields.every((field) => candidate.fields.includes(field)),
    );
    outstanding.push(group?.label ?? rule.message);
  }
  return outstanding;
};

const listNames = (names: string[]): string => {
  if (names.length <= 3) {
    return names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : names.join("");
  }
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
};

export const scopeSummary = (
  profile: AssessmentProfileData,
  subject: Record<string, string>,
): { complete: boolean; summary: string } => {
  const outstanding = subjectOutstanding(profile, subject);
  if (outstanding.length > 0) {
    return {
      complete: false,
      summary: `Still needed: ${listNames(outstanding)}`,
    };
  }
  const leadFields =
    profile.runtime.subjectGroups?.[0]?.fields ??
    profile.runtime.subjectFields.slice(0, 3).map(({ key }) => key);
  const named = leadFields
    .map((key) => subject[key])
    .filter((value): value is string => typeof value === "string" && !!value)
    .join(", ");
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

/**
 * Whether each linked question needs its own recorded finding. In "derived"
 * mode a complete answer is the support, so no finding is asked for.
 */
export const questionFindingsExplicit = (
  profile: AssessmentProfileData,
): boolean =>
  profile.runtime.methodology.parameters?.questionFindingMode !== "derived";

/**
 * Criterion statuses that open the linked questions. When the profile does
 * not say, the questions are always shown.
 */
export const statusOpensQuestions = (
  profile: AssessmentProfileData,
  status: string,
): boolean => {
  const statuses = profile.runtime.criterion?.questionsForStatuses;
  return statuses === undefined || statuses.includes(status);
};
