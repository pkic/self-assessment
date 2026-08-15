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
    passingQuestionFindings: ["supports"],
    evidenceRequiredFromLevel: 1,
  },
};

const record = (): Pick<
  EvidenceAssessmentRecord,
  "criterionProgress" | "questionProgress" | "evidenceFiles"
> => ({ criterionProgress: {}, questionProgress: {}, evidenceFiles: [] });

const answerForField = (type: string): string => {
  if (type === "date") return "2027-06-30";
  if (type === "url") return "https://example.com/evidence";
  if (type === "cpe-2.3") {
    return "cpe:2.3:a:example:gateway:4.2:*:*:*:*:*:*:*";
  }
  if (type === "package-url") return "pkg:generic/example/gateway@4.2";
  if (type === "boolean") return "yes";
  return "Test response";
};

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
    for (const questionId of criterion.assessmentQuestionIds ?? []) {
      const question = definition.assessment.groups
        .flatMap((group) => group.questions)
        .find((candidate) => candidate.id === questionId)!;
      const values = Object.fromEntries(
        (
          question.response?.fields ?? [
            { key: "details", type: "textarea", required: true },
          ]
        )
          .filter((field) => field.required)
          .map((field) => [field.key, answerForField(field.type)]),
      );
      for (const rule of question.response?.rules ?? []) {
        const field = question.response?.fields.find(
          (candidate) => candidate.key === rule.fields[0],
        );
        values[rule.fields[0]] = answerForField(field?.type ?? "text");
      }
      target.questionProgress[questionId] = {
        finding: "supports",
        values,
        evidenceIds: question.response?.evidence?.required
          ? ["question-evidence"]
          : [],
      };
      if (
        question.response?.evidence?.required &&
        !target.evidenceFiles.some(({ id }) => id === "question-evidence")
      ) {
        target.evidenceFiles.push({
          id: "question-evidence",
          name: "question-evidence.json",
          mediaType: "application/json",
          size: 0,
          sha256: "0".repeat(64),
          addedAt: "2026-08-15T00:00:00.000Z",
          dataBase64: "",
        });
      }
    }
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

  it("does not establish a claimed criterion when its linked questions do not support it", () => {
    const assessment = record();
    setLevel(assessment, 1, "met");
    assessment.questionProgress["1.2.1"].finding = "does-not-support";
    const score = calculateGatedMaturityScore(model, assessment, methodology);
    expect(score.achievedLevel).toBeNull();
    expect(score.levelResults[1].blockers).toContainEqual(
      expect.stringMatching(/1\.2\.1.*do not support/),
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

  it("does not count a malformed typed identifier as a complete linked response", () => {
    const assessment = record();
    for (let level = 1; level <= 3; level += 1) {
      setLevel(assessment, level, "met");
    }
    assessment.questionProgress["3.4.4"].values.topLevelCpe = "not-a-cpe";
    const score = calculateGatedMaturityScore(model, assessment, methodology);
    expect(score.achievedLevel).toBe(2);
    expect(score.levelResults[3].blockers).toContainEqual(
      expect.stringMatching(/3\.4\.4.*do not support/),
    );
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
