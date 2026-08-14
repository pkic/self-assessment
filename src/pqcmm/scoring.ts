import type {
  PqcmmAssessmentRecord,
  PqcmmCriterionProgress,
  PqcmmModelData,
  PqcmmScore,
} from "./types";

export const emptyCriterionProgress = (): PqcmmCriterionProgress => ({
  status: "not-assessed",
  evidenceStatement: "",
  notes: "",
  evidenceIds: [],
});

export const criterionHasEvidence = (
  progress: PqcmmCriterionProgress | undefined,
): boolean =>
  Boolean(
    progress &&
    (progress.evidenceStatement.trim().length > 0 ||
      progress.evidenceIds.length > 0),
  );

export const criterionEstablishesLevel = (
  progress: PqcmmCriterionProgress | undefined,
): boolean => progress?.status === "met" && criterionHasEvidence(progress);

export const calculatePqcmmScore = (
  model: PqcmmModelData,
  record: Pick<
    PqcmmAssessmentRecord,
    "criterionProgress" | "questionProgress" | "evidenceFiles"
  >,
): PqcmmScore => {
  const positiveLevels = model.levels
    .filter((level) => level.number > 0)
    .sort((a, b) => a.number - b.number);
  let achievedPositiveLevel = 0;
  let criteriaMet = 0;
  let criteriaTotal = 0;

  const baseline = model.levels.find((level) => level.number === 0);
  const baselineBlockers =
    baseline?.criteria.items
      .filter(
        (criterion) => record.criterionProgress[criterion.id]?.status !== "met",
      )
      .map(
        (criterion) =>
          `${criterion.id}: ${record.criterionProgress[criterion.id]?.status ?? "not-assessed"}`,
      ) ?? [];
  const baselineResult = {
    level: 0,
    met: Boolean(baseline && baselineBlockers.length === 0),
    criteriaMet:
      (baseline?.criteria.items.length ?? 0) - baselineBlockers.length,
    criteriaTotal: baseline?.criteria.items.length ?? 0,
    blockers: baselineBlockers,
  };
  criteriaMet += baselineResult.criteriaMet;
  criteriaTotal += baselineResult.criteriaTotal;

  const positiveResults = positiveLevels.map((level) => {
    const blockers: string[] = [];
    let levelMet = 0;
    for (const criterion of level.criteria.items) {
      criteriaTotal += 1;
      const progress = record.criterionProgress[criterion.id];
      if (criterionEstablishesLevel(progress)) {
        criteriaMet += 1;
        levelMet += 1;
      } else if (progress?.status === "met") {
        blockers.push(`${criterion.id}: evidence is required`);
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

  for (const result of positiveResults) {
    if (!result.met || result.level !== achievedPositiveLevel + 1) break;
    achievedPositiveLevel = result.level;
  }
  const achievedLevel =
    achievedPositiveLevel > 0
      ? achievedPositiveLevel
      : baselineResult.met
        ? 0
        : null;

  const questions = model.levels.flatMap((level) =>
    level.assessment.groups.flatMap((group) => group.questions),
  );
  const questionsAnswered = questions.filter(
    (question) =>
      record.questionProgress[question.id]?.answer.trim().length > 0,
  ).length;

  return {
    achievedLevel,
    nextLevel:
      achievedLevel === null
        ? 0
        : achievedLevel < model.scoring.maximumLevel
          ? achievedLevel + 1
          : null,
    criteriaMet,
    criteriaTotal,
    questionsAnswered,
    questionsTotal: questions.length,
    evidenceFiles: record.evidenceFiles.length,
    levelResults: [baselineResult, ...positiveResults],
  };
};
