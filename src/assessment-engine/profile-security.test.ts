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
});
