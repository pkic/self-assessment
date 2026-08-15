import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import { parseEvidenceModel } from "./model";
import { calculateGatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import type { EvidenceAssessmentRecord } from "./types";

const model = parseEvidenceModel(getBundledAssessmentModelYaml("pqcmm")!);
const methodology = {
  strategy: "cumulative-gates",
  parameters: {
    baselineLevel: 0,
    maximumLevel: 5,
    passingStatuses: ["met"],
    evidenceRequiredFromLevel: 1,
  },
};

const record = (): Pick<
  EvidenceAssessmentRecord,
  "criterionProgress" | "questionProgress" | "evidenceFiles"
> => ({ criterionProgress: {}, questionProgress: {}, evidenceFiles: [] });

const setLevel = (
  target: ReturnType<typeof record>,
  level: number,
  status: string,
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
    expect(
      calculateGatedMaturityScore(model, record(), methodology).achievedLevel,
    ).toBeNull();
  });

  it("establishes Level 0 from its two self-declared criteria without evidence", () => {
    const assessment = record();
    setLevel(assessment, 0, "met", false);
    const score = calculateGatedMaturityScore(model, assessment, methodology);
    expect(score.achievedLevel).toBe(0);
    expect(score.levelResults[0]).toMatchObject({ level: 0, met: true });
  });

  it("requires evidence for every positive-level criterion marked met", () => {
    const assessment = record();
    setLevel(assessment, 1, "met", false);
    const score = calculateGatedMaturityScore(model, assessment, methodology);
    expect(score.achievedLevel).toBeNull();
    expect(score.levelResults[1].blockers).toEqual(
      expect.arrayContaining([expect.stringMatching(/evidence is required/)]),
    );
  });

  it("does not count dangling evidence ids as evidence", () => {
    const assessment = record();
    setLevel(assessment, 1, "met", false);
    for (const progress of Object.values(assessment.criterionProgress)) {
      progress.evidenceIds = ["missing-file"];
    }
    expect(
      calculateGatedMaturityScore(model, assessment, methodology).achievedLevel,
    ).toBeNull();
  });

  it("counts a reference only when the evidence file is present", () => {
    const assessment = record();
    setLevel(assessment, 1, "met", false);
    for (const progress of Object.values(assessment.criterionProgress)) {
      progress.evidenceIds = ["evidence-1"];
    }
    assessment.evidenceFiles = [
      {
        id: "evidence-1",
        name: "evidence.txt",
        mediaType: "text/plain",
        size: 0,
        sha256: "0".repeat(64),
        addedAt: "2026-08-15T00:00:00.000Z",
        dataBase64: "",
      },
    ];
    expect(
      calculateGatedMaturityScore(model, assessment, methodology).achievedLevel,
    ).toBe(1);
  });

  it("does not skip an unmet lower positive level", () => {
    const assessment = record();
    setLevel(assessment, 2, "met");
    expect(
      calculateGatedMaturityScore(model, assessment, methodology).achievedLevel,
    ).toBeNull();
  });

  it("returns the highest consecutive level whose criteria are all evidenced", () => {
    const assessment = record();
    for (let level = 1; level <= 4; level += 1) {
      setLevel(assessment, level, "met");
    }
    setLevel(assessment, 5, "partial");
    const score = calculateGatedMaturityScore(model, assessment, methodology);
    expect(score.achievedLevel).toBe(4);
    expect(score.levelResults.find((result) => result.level === 5)?.met).toBe(
      false,
    );
  });
});
