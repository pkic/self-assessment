import type { EvidenceFile } from "../types";
import { registerScoringStrategy, scoreWithStrategy } from "../scoring";
import {
  countQuestionFindings,
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
  }[];
}

export interface CumulativeGateParameters extends Record<string, unknown> {
  baselineLevel?: number;
  minimumLevel?: number;
  maximumLevel?: number;
  passingStatuses?: string[];
  evidenceRequiredFromLevel?: number;
  passingQuestionFindings?: string[];
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
  let achievedPositiveLevel = baselineLevel;
  let criteriaMet = 0;
  let criteriaTotal = 0;

  const levelResults = orderedLevels.map((level) => {
    const blockers: string[] = [];
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
          !passingQuestionFindings.has(
            record.questionProgress[questionId]?.finding ?? "not-assessed",
          ) || !responseComplete(questionId),
      );
      const questionsPass = questionBlockers.length === 0;
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
    questionFindingCounts: countQuestionFindings(
      assessmentQuestions,
      record.questionProgress,
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
