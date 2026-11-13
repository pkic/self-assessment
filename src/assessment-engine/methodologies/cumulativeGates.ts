import type { EvidenceFile } from "../types";
import { registerScoringStrategy, scoreWithStrategy } from "../scoring";
import { NON_SUPPORTING_FINDING } from "../question-values";
import {
  countQuestionFindings,
  questionAnswerDoesNotSupport,
  questionResponseComplete,
  type GatedQuestion,
  type GatedQuestionProgress,
} from "./questionGates";

export interface GatedCriterionProgress {
  status: string;
  evidenceStatement: string;
  notes: string;
  evidenceIds: string[];
}

export interface GatedMaturityModel {
  scoring: { minimumLevel: number; maximumLevel: number };
  levels: {
    number: number;
    criteria: { items: { id: string; assessmentQuestionIds?: string[] }[] };
    assessment: {
      groups: {
        kind?: "assessment" | "intake";
        questions: GatedQuestion[];
      }[];
    };
  }[];
}

export interface GatedMaturityRecord {
  criterionProgress: Record<string, GatedCriterionProgress>;
  questionProgress: Record<string, GatedQuestionProgress>;
  evidenceFiles: EvidenceFile[];
}

/**
 * How one criterion stands against its gate. Each part is reported separately
 * so a screen or report can say exactly what is still missing.
 */
export interface GatedCriterionResult {
  id: string;
  /** The criterion counts towards its level. */
  met: boolean;
  /** Its status is a passing one (for example "met"). */
  statusPasses: boolean;
  /** Whether this level asks for evidence at all. */
  evidenceRequired: boolean;
  evidencePasses: boolean;
  /** Linked assessment questions, and those that currently support it. */
  questionIds: string[];
  supportingQuestionIds: string[];
}

export interface GatedMaturityScore {
  achievedLevel: number | null;
  nextLevel: number | null;
  criteriaMet: number;
  criteriaTotal: number;
  questionsAnswered: number;
  questionsTotal: number;
  questionFindingCounts: Record<string, number>;
  evidenceFiles: number;
  levelResults: {
    level: number;
    met: boolean;
    criteriaMet: number;
    criteriaTotal: number;
    blockers: string[];
    /** Per-criterion detail; absent only in hand-built scores. */
    criteria?: GatedCriterionResult[];
  }[];
}

export interface CumulativeGateParameters extends Record<string, unknown> {
  baselineLevel?: number;
  minimumLevel?: number;
  maximumLevel?: number;
  passingStatuses?: string[];
  evidenceRequiredFromLevel?: number;
  passingQuestionFindings?: string[];
  /**
   * How a linked question supports its criterion. "explicit" (the default)
   * needs a recorded finding in passingQuestionFindings plus a complete
   * answer; "derived" counts any complete answer as support, for profiles
   * where the person answering is also the one drawing the conclusion.
   */
  questionFindingMode?: "explicit" | "derived";
}

export const emptyCriterionProgress = (): GatedCriterionProgress => ({
  status: "not-assessed",
  evidenceStatement: "",
  notes: "",
  evidenceIds: [],
});

export const criterionHasEvidence = (
  progress: GatedCriterionProgress | undefined,
  evidenceFiles: Pick<EvidenceFile, "id">[] = [],
): boolean =>
  Boolean(
    progress &&
    (progress.evidenceStatement.trim().length > 0 ||
      progress.evidenceIds.some((id) =>
        evidenceFiles.some((file) => file.id === id),
      )),
  );

const cumulativeGates = (
  model: GatedMaturityModel,
  record: GatedMaturityRecord,
  parameters: CumulativeGateParameters,
): GatedMaturityScore => {
  const baselineLevel = parameters.baselineLevel ?? model.scoring.minimumLevel;
  const maximumLevel = parameters.maximumLevel ?? model.scoring.maximumLevel;
  const evidenceRequiredFromLevel = parameters.evidenceRequiredFromLevel ?? 1;
  const passingStatuses = new Set(parameters.passingStatuses ?? ["met"]);
  const passingQuestionFindings = new Set(
    parameters.passingQuestionFindings ?? [],
  );
  const derivedFindings = parameters.questionFindingMode === "derived";
  const orderedLevels = [...model.levels].sort((a, b) => a.number - b.number);
  const questions = orderedLevels.flatMap((level) =>
    level.assessment.groups.flatMap((group) => group.questions),
  );
  const assessmentQuestions = orderedLevels.flatMap((level) =>
    level.assessment.groups
      .filter((group) => group.kind !== "intake")
      .flatMap((group) => group.questions),
  );
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const responseComplete = (questionId: string): boolean => {
    const question = questionsById.get(questionId);
    const progress = record.questionProgress[questionId];
    return questionResponseComplete(question, progress, record.evidenceFiles);
  };
  // A complete answer the model marks as non-supporting (a failed test, a
  // missing capability) is recorded but cannot carry its criterion.
  const answerDoesNotSupport = (questionId: string): boolean =>
    questionAnswerDoesNotSupport(
      questionsById.get(questionId),
      record.questionProgress[questionId],
    );
  let achievedPositiveLevel = baselineLevel;
  let criteriaMet = 0;
  let criteriaTotal = 0;

  const levelResults = orderedLevels.map((level) => {
    const blockers: string[] = [];
    const criteria: GatedCriterionResult[] = [];
    let levelMet = 0;
    for (const criterion of level.criteria.items) {
      criteriaTotal += 1;
      const progress = record.criterionProgress[criterion.id];
      const statusPasses = Boolean(
        progress && passingStatuses.has(progress.status),
      );
      const needsEvidence = level.number >= evidenceRequiredFromLevel;
      const evidencePasses =
        !needsEvidence || criterionHasEvidence(progress, record.evidenceFiles);
      const questionBlockers = (criterion.assessmentQuestionIds ?? []).filter(
        (questionId) =>
          !responseComplete(questionId) ||
          (derivedFindings && answerDoesNotSupport(questionId)) ||
          (!derivedFindings &&
            !passingQuestionFindings.has(
              record.questionProgress[questionId]?.finding ?? "not-assessed",
            )),
      );
      const questionsPass = questionBlockers.length === 0;
      const questionIds = criterion.assessmentQuestionIds ?? [];
      criteria.push({
        id: criterion.id,
        met: statusPasses && evidencePasses && questionsPass,
        statusPasses,
        evidenceRequired: needsEvidence,
        evidencePasses,
        questionIds,
        supportingQuestionIds: questionIds.filter(
          (questionId) => !questionBlockers.includes(questionId),
        ),
      });
      if (statusPasses && evidencePasses && questionsPass) {
        criteriaMet += 1;
        levelMet += 1;
      } else if (statusPasses && !evidencePasses) {
        blockers.push(`${criterion.id}: evidence is required`);
      } else if (statusPasses && !questionsPass) {
        blockers.push(
          `${criterion.id}: assessment questions ${questionBlockers.join(", ")} do not support the criterion`,
        );
      } else {
        blockers.push(`${criterion.id}: ${progress?.status ?? "not-assessed"}`);
      }
    }
    return {
      level: level.number,
      met: blockers.length === 0,
      criteriaMet: levelMet,
      criteriaTotal: level.criteria.items.length,
      blockers,
      criteria,
    };
  });

  for (const result of levelResults.filter(
    (item) => item.level > baselineLevel,
  )) {
    if (!result.met || result.level !== achievedPositiveLevel + 1) break;
    achievedPositiveLevel = result.level;
  }
  const baselineResult = levelResults.find(
    (item) => item.level === baselineLevel,
  );
  let achievedLevel: number | null = null;
  if (achievedPositiveLevel > baselineLevel) {
    achievedLevel = achievedPositiveLevel;
  } else if (baselineResult?.met) {
    achievedLevel = baselineLevel;
  }
  let nextLevel: number | null = baselineLevel;
  if (achievedLevel !== null) {
    nextLevel = achievedLevel < maximumLevel ? achievedLevel + 1 : null;
  }
  return {
    achievedLevel,
    nextLevel,
    criteriaMet,
    criteriaTotal,
    questionsAnswered: questions.filter((question) => {
      const progress = record.questionProgress[question.id];
      return Boolean(progress && responseComplete(question.id));
    }).length,
    questionsTotal: questions.length,
    // Derived findings exist for every answered question (the export writes
    // one for each), so they are counted over the same set as answers.
    questionFindingCounts: countQuestionFindings(
      derivedFindings ? questions : assessmentQuestions,
      record.questionProgress,
      derivedFindings
        ? (questionId) => {
            if (!responseComplete(questionId)) return "not-assessed";
            if (answerDoesNotSupport(questionId)) return NON_SUPPORTING_FINDING;
            return parameters.passingQuestionFindings?.[0] ?? "not-assessed";
          }
        : undefined,
    ),
    evidenceFiles: record.evidenceFiles.length,
    levelResults,
  };
};

registerScoringStrategy(
  "cumulative-gates",
  cumulativeGates as (
    model: GatedMaturityModel,
    record: GatedMaturityRecord,
    parameters: Record<string, unknown>,
  ) => GatedMaturityScore,
);

export const calculateGatedMaturityScore = (
  model: GatedMaturityModel,
  record: GatedMaturityRecord,
  methodology: {
    strategy: string;
    parameters: Record<string, unknown>;
  },
): GatedMaturityScore =>
  scoreWithStrategy(
    methodology.strategy,
    model,
    record,
    methodology.parameters,
  );
