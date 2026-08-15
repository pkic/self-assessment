import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import { getBundledAssessmentProfileYaml } from "../../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "../../assessment-engine/profile";
import { parseEvidenceModel } from "./model";
import {
  emptyQuestionProgress,
  questionResponseIssues,
} from "./questionResponse";
import type { AssessmentEvidenceFile } from "./types";

const model = parseEvidenceModel(getBundledAssessmentModelYaml("pqcmm")!);
const profile = parseAssessmentProfile(
  getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
);
const question = (id: string) => {
  for (const level of model.levels) {
    for (const group of level.assessment.groups) {
      const found = group.questions.find((candidate) => candidate.id === id);
      if (found) return { question: found, kind: group.kind };
    }
  }
  throw new Error(`Question not found: ${id}`);
};

const evidence = (mediaType = "application/json"): AssessmentEvidenceFile => ({
  id: "evidence-1",
  name: "sbom.json",
  mediaType,
  size: 2,
  sha256: "0".repeat(64),
  addedAt: "2026-08-15T00:00:00.000Z",
  dataBase64: "e30=",
});

describe("typed assessment question responses", () => {
  it("accepts a real calendar date and rejects impossible dates", () => {
    const target = question("0.2.1");
    expect(
      questionResponseIssues(
        target.question,
        target.kind,
        profile,
        {
          ...emptyQuestionProgress(),
          values: { targetDate: "2027-02-28" },
        },
        [],
      ),
    ).toEqual([]);
    expect(
      questionResponseIssues(
        target.question,
        target.kind,
        profile,
        {
          ...emptyQuestionProgress(),
          values: { targetDate: "2027-02-30" },
        },
        [],
      ),
    ).toContain("Target date for Level 1 must be a valid date.");
  });

  it("validates CPE and pURL independently and requires the named SBOM", () => {
    const target = question("3.4.4");
    const invalid = questionResponseIssues(
      target.question,
      target.kind,
      profile,
      {
        finding: "supports",
        values: {
          topLevelCpe: "not-a-cpe",
          topLevelPurl: "https://example.com/package",
          sampledComponents: "Five components sampled.",
        },
        evidenceIds: [],
      },
      [],
    );
    expect(invalid).toEqual(
      expect.arrayContaining([
        "Top-level product CPE 2.3 name must be a valid CPE 2.3 name.",
        "Top-level product package URL (pURL) must be a valid package URL.",
        "SPDX or CycloneDX SBOM is required.",
      ]),
    );

    expect(
      questionResponseIssues(
        target.question,
        target.kind,
        profile,
        {
          finding: "supports",
          values: { sampledComponents: "Five components sampled." },
          evidenceIds: [],
        },
        [],
      ),
    ).toContain(
      "Provide at least one top-level CPE 2.3 name or package URL (pURL).",
    );

    const file = evidence();
    expect(
      questionResponseIssues(
        target.question,
        target.kind,
        profile,
        {
          finding: "supports",
          values: {
            topLevelCpe: "cpe:2.3:a:example:product:1.0.0:*:*:*:*:*:*:*",
            topLevelPurl: "pkg:generic/example-product@1.0.0",
            sampledComponents: "Five components sampled; one gap recorded.",
          },
          evidenceIds: [file.id],
        },
        [file],
      ),
    ).toEqual([]);
  });

  it("rejects a generic file type for a machine-readable SBOM request", () => {
    const target = question("3.4.4");
    const file = evidence("application/pdf");
    expect(
      questionResponseIssues(
        target.question,
        target.kind,
        profile,
        {
          finding: "supports",
          values: { sampledComponents: "Five components sampled." },
          evidenceIds: [file.id],
        },
        [file],
      ),
    ).toContain("SPDX or CycloneDX SBOM contains an unsupported file type.");
  });
});
