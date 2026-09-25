import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import { getBundledAssessmentProfileYaml } from "../../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "../../assessment-engine/profile";
import { parseEvidenceModel } from "./model";
import yaml from "js-yaml";
import type { EvidenceModelData } from "./types";
import legacyModelYaml from "../../public/pqcmm-model-1.0.1.yaml";
import legacyProfileYaml from "../../public/pqcmm-self-assessment-profile-1.0.0.yaml";

describe("PQCMM model data", () => {
  const modelYaml = getBundledAssessmentModelYaml("pqcmm")!;
  const profileYaml = getBundledAssessmentProfileYaml("pqcmm-self-assessment")!;
  it("loads the versioned 1.1.0 model with criterion links and typed questions", () => {
    const model = parseEvidenceModel(modelYaml);
    expect(model.model).toMatchObject({
      id: "pqcmm",
      version: "1.1.0",
      scope: "product-or-service",
    });
    expect(model.levels.map((level) => level.number)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(
      model.levels.reduce(
        (total, level) => total + level.criteria.items.length,
        0,
      ),
    ).toBe(22);
    expect(
      model.levels.reduce(
        (total, level) =>
          total +
          level.assessment.groups.reduce(
            (groupTotal, group) => groupTotal + group.questions.length,
            0,
          ),
        0,
      ),
    ).toBe(72);
    expect(
      model.levels
        .flatMap((level) => level.assessment.groups)
        .flatMap((group) => group.questions)
        .map((question) => question.id),
    ).toEqual(expect.arrayContaining(["0.2.1", "1.2.1", "5.5.4"]));
    expect(model.levels[1].criteria.items[0].assessmentQuestionIds).toEqual([
      "1.2.1",
      "1.2.2",
      "1.2.4",
    ]);
    expect(
      model.levels[0].assessment.groups[0].questions[0].response?.fields[0],
    ).toMatchObject({ key: "targetDate", type: "date", required: true });
  });

  it("continues to parse the released 1.0.1 model and 1.0.0 profile", () => {
    expect(parseEvidenceModel(legacyModelYaml).model.version).toBe("1.0.1");
    expect(
      parseAssessmentProfile(legacyProfileYaml).profile.model.version,
    ).toBe("1.0.1");
  });

  it("names each requested assessment artifact and its accepted formats", () => {
    const model = parseEvidenceModel(modelYaml);
    const questions = new Map(
      model.levels
        .flatMap((level) => level.assessment.groups)
        .flatMap((group) => group.questions)
        .map((question) => [question.id, question]),
    );
    const expectedLabels = {
      "1.5.2": "Implementation validation artifact",
      "2.3.2": "Standards conformance record",
      "2.3.3": "Interoperability test results",
      "3.2.1": "Version-specific cryptographic inventory",
      "3.2.3": "Current and previous cryptographic inventories",
      "3.3.3": "Redacted or anonymized SBOM or CBOM",
      "3.4.1": "SPDX or CycloneDX SBOM for the assessed release",
      "3.4.3": "Current and previous release SBOMs",
      "3.7.1": "HNDL exposure register",
      "4.2.1": "Machine-readable CBOM for the assessed release",
      "5.3.1": "Quantum-safe performance benchmark report",
      "5.4.2": "Analyzed CBOM and cross-reference results",
      "5.5.4": "Third-party cryptographic audit report",
    };
    for (const [questionId, label] of Object.entries(expectedLabels)) {
      const evidence = questions.get(questionId)?.response?.evidence;
      expect(evidence).toMatchObject({ label });
      expect(evidence?.acceptedMediaTypes.length).toBeGreaterThan(0);
    }
  });

  it("does not bind the experience parser to one model-specific scoring label", () => {
    const model = parseEvidenceModel(
      modelYaml.replace(
        "method: cumulative-all-criteria",
        "method: another-source-label",
      ),
    );
    expect(model.scoring.method).toBe("another-source-label");
  });

  it("loads a model-driven self-assessment profile", () => {
    const profile = parseAssessmentProfile(profileYaml);
    expect(profile.profile).toMatchObject({
      id: "pqcmm-self-assessment",
      family: "maturity",
      model: { id: "pqcmm", version: "1.1.0" },
    });
    expect(profile.runtime.subjectFields.map((field) => field.key)).toContain(
      "productName",
    );
    expect(profile.runtime.methodology.strategy).toBe("cumulative-gates");
    expect(profile.assurance.profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "self", availability: "browser" }),
        expect.objectContaining({
          id: "qualified-third-party",
          availability: "external-workflow",
        }),
      ]),
    );
  });

  it("rejects YAML aliases before they can amplify scoring work", () => {
    expect(() =>
      parseEvidenceModel(
        `${modelYaml}\nshared: &shared [one, two]\ncopy: *shared\n`,
      ),
    ).toThrow("aliases or shared object references");
  });

  it("rejects duplicate nested identifiers", () => {
    const parsed = yaml.load(modelYaml) as EvidenceModelData;
    parsed.levels[1].criteria.items[0].id =
      parsed.levels[0].criteria.items[0].id;
    expect(() => parseEvidenceModel(yaml.dump(parsed))).toThrow(
      "does not satisfy",
    );
  });

  it("rejects criterion links to unknown questions", () => {
    const parsed = yaml.load(modelYaml) as EvidenceModelData;
    parsed.levels[1].criteria.items[0].assessmentQuestionIds = ["1.99.99"];
    expect(() => parseEvidenceModel(yaml.dump(parsed))).toThrow(
      "does not satisfy",
    );
  });

  it("rejects replacement patterns for registered CPE and pURL fields", () => {
    const parsed = yaml.load(modelYaml) as EvidenceModelData;
    const identifierQuestion = parsed.levels[3].assessment.groups
      .flatMap((group) => group.questions)
      .find((question) => question.id === "3.4.4")!;
    identifierQuestion.response!.fields[0].pattern = ".*";
    expect(() => parseEvidenceModel(yaml.dump(parsed))).toThrow(
      "does not satisfy",
    );
  });
});
