import yaml from "js-yaml";
import { getBundledAssessmentProfileYaml } from "../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "./profile";
import type { AssessmentProfileData } from "./types";

const mutateProfile = (
  id: "pkimm-self-assessment" | "pqcmm-self-assessment",
  mutate: (profile: AssessmentProfileData) => void,
): string => {
  const parsed = yaml.load(
    getBundledAssessmentProfileYaml(id)!,
  ) as AssessmentProfileData;
  mutate(parsed);
  return yaml.dump(parsed);
};

describe("assessment profile trust boundaries", () => {
  it("accepts both bundled browser profiles", () => {
    expect(() =>
      parseAssessmentProfile(
        getBundledAssessmentProfileYaml("pkimm-self-assessment")!,
      ),
    ).not.toThrow();
    expect(() =>
      parseAssessmentProfile(
        getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
      ),
    ).not.toThrow();
  });

  it("rejects a browser profile that claims certification", () => {
    const source = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.assurance.profiles[0].certification = true;
    });
    expect(() => parseAssessmentProfile(source)).toThrow(
      "Browser assurance profiles cannot claim",
    );
  });

  it("rejects weighted parameters that can inflate an unassessed result", () => {
    const source = mutateProfile("pkimm-self-assessment", (profile) => {
      profile.runtime.methodology.parameters.minimumLevel = 5;
    });
    expect(() => parseAssessmentProfile(source)).toThrow(
      "Weighted maturity parameters must use levels 0-5",
    );
  });

  it("rejects cumulative-gate parameters that bypass the evidence policy", () => {
    const source = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.runtime.methodology.parameters.evidenceRequiredFromLevel = 99;
    });
    expect(() => parseAssessmentProfile(source)).toThrow(
      "Cumulative gate parameters must match",
    );
  });

  it("rejects duplicate subject fields and unknown rule references", () => {
    const duplicate = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.runtime.subjectFields[1].key =
        profile.runtime.subjectFields[0].key;
    });
    expect(() => parseAssessmentProfile(duplicate)).toThrow(
      "Assessment subject field keys must be unique",
    );

    const unknown = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.runtime.subjectRules![0].fields = [
        profile.runtime.subjectRules![0].fields[0],
        "notDeclared",
      ];
    });
    expect(() => parseAssessmentProfile(unknown)).toThrow(
      "Subject rule references unknown field",
    );
  });

  it("rejects unsafe subject convenience references", () => {
    const unknownDefault = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.runtime.subjectFields.find(
        ({ key }) => key === "assessorOrganization",
      )!.defaultFrom = "notDeclared";
    });
    expect(() => parseAssessmentProfile(unknownDefault)).toThrow(
      "defaults from unknown field",
    );

    const unknownSuggestionSource = mutateProfile(
      "pqcmm-self-assessment",
      (profile) => {
        profile.runtime.subjectFields.find(
          ({ key }) => key === "cpe",
        )!.suggestion!.vendorField = "notDeclared";
      },
    );
    expect(() => parseAssessmentProfile(unknownSuggestionSource)).toThrow(
      "suggestion references unknown field",
    );
  });

  it("rejects a non-passing default baseline status", () => {
    const source = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.runtime.methodology.parameters.defaultBaselineStatus =
        "not-assessed";
    });
    expect(() => parseAssessmentProfile(source)).toThrow(
      "Cumulative gate parameters must match",
    );
  });

  it("rejects evidence policies with unknown statuses or validators", () => {
    const unknownStatus = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.runtime.criterion!.evidence.requiredForStatuses = ["unknown"];
      profile.runtime.methodology.parameters.passingStatuses = ["unknown"];
      profile.runtime.methodology.parameters.defaultBaselineStatus = "unknown";
    });
    expect(() => parseAssessmentProfile(unknownStatus)).toThrow(
      "Evidence policy references unknown criterion status",
    );

    const missingValidator = mutateProfile(
      "pqcmm-self-assessment",
      (profile) => {
        profile.runtime.criterion!.evidence.validators = [
          "sha256-integrity",
          "untrusted-validator",
        ];
      },
    );
    expect(() => parseAssessmentProfile(missingValidator)).toThrow(
      "Evidence validators must be",
    );
  });

  it("rejects duplicate PDF signature field names", () => {
    const source = mutateProfile("pqcmm-self-assessment", (profile) => {
      profile.report.signing!.fields[1].name =
        profile.report.signing!.fields[0].name;
    });
    expect(() => parseAssessmentProfile(source)).toThrow(
      "PDF signature field names must be unique",
    );
  });
});
