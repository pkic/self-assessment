import { BUNDLED_PQCMM_MODEL_YAML } from "../defaults/pqcmmBundledData";
import { parsePqcmmModel } from "./model";
import { calculatePqcmmScore } from "./scoring";
import type { PqcmmCriterionStatus, PqcmmAssessmentRecord } from "./types";

const model = parsePqcmmModel(BUNDLED_PQCMM_MODEL_YAML);

const record = (): Pick<
  PqcmmAssessmentRecord,
  "criterionProgress" | "questionProgress" | "evidenceFiles"
> => ({ criterionProgress: {}, questionProgress: {}, evidenceFiles: [] });

const setLevel = (
  target: ReturnType<typeof record>,
  level: number,
  status: PqcmmCriterionStatus,
  withEvidence = true,
) => {
  const definition = model.levels.find((item) => item.number === level)!;
  for (const criterion of definition.criteria.items) {
    target.criterionProgress[criterion.id] = {
      status,
      evidenceStatement: withEvidence ? `Evidence for ${criterion.id}` : "",
      notes: "",
      evidenceIds: [],
    };
  }
};

describe("PQCMM cumulative gate scoring", () => {
  it("does not establish a level until Level 0 or a positive gate is met", () => {
    expect(calculatePqcmmScore(model, record()).achievedLevel).toBeNull();
  });

  it("establishes Level 0 from its two self-declared criteria without evidence", () => {
    const assessment = record();
    setLevel(assessment, 0, "met", false);
    const score = calculatePqcmmScore(model, assessment);
    expect(score.achievedLevel).toBe(0);
    expect(score.levelResults[0]).toMatchObject({ level: 0, met: true });
  });

  it("requires evidence for every positive-level criterion marked met", () => {
    const assessment = record();
    setLevel(assessment, 1, "met", false);
    const score = calculatePqcmmScore(model, assessment);
    expect(score.achievedLevel).toBeNull();
    expect(score.levelResults[1].blockers).toEqual(
      expect.arrayContaining([expect.stringMatching(/evidence is required/)]),
    );
  });

  it("does not skip an unmet lower positive level", () => {
    const assessment = record();
    setLevel(assessment, 2, "met");
    expect(calculatePqcmmScore(model, assessment).achievedLevel).toBeNull();
  });

  it("returns the highest consecutive level whose criteria are all evidenced", () => {
    const assessment = record();
    for (let level = 1; level <= 4; level += 1) {
      setLevel(assessment, level, "met");
    }
    setLevel(assessment, 5, "partial");
    const score = calculatePqcmmScore(model, assessment);
    expect(score.achievedLevel).toBe(4);
    expect(score.levelResults.find((result) => result.level === 5)?.met).toBe(
      false,
    );
  });
});
