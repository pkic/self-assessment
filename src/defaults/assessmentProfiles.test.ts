import {
  BUNDLED_PROFILES,
  getBundledAssessmentProfileYaml,
  resolveBundledProfile,
} from "./assessmentProfiles";
import { getBundledAssessmentModelYaml } from "./assessmentModels";
import { parseAssessmentProfile } from "../assessment-engine/profile";

// npm test fetches with MODEL_DRAFTS=1, so the PQCMM 1.1.0 draft is bundled
// here; release builds leave it out.
describe("bundled assessment profiles", () => {
  it("defaults to PKIMM, which follows any PKIMM version", () => {
    const profile = resolveBundledProfile({});
    expect(profile?.id).toBe("pkimm-self-assessment");
    expect(resolveBundledProfile({ modelVersion: "2.0.0" })).toBe(profile);
  });

  it("picks the latest PQCMM release, never the draft", () => {
    const profile = resolveBundledProfile({ model: "pqcmm" });
    expect(profile).toMatchObject({ version: "1.0.1", draft: false });
    expect(resolveBundledProfile({ profile: "pqcmm-self-assessment" })).toBe(
      profile,
    );
  });

  it("loads the draft when its version is asked for", () => {
    expect(
      resolveBundledProfile({ model: "pqcmm", modelVersion: "1.1.0" }),
    ).toMatchObject({ version: "1.1.0", draft: true });
  });

  it("falls back to the latest release for an unknown version", () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(
      resolveBundledProfile({ model: "pqcmm", modelVersion: "9.9.9" })?.version,
    ).toBe("1.0.1");
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("no bundled model version 9.9.9"),
    );
    error.mockRestore();
  });

  it("returns nothing for an unknown profile or model", () => {
    expect(resolveBundledProfile({ profile: "nope" })).toBeNull();
    expect(resolveBundledProfile({ model: "nope" })).toBeNull();
    expect(getBundledAssessmentProfileYaml("nope")).toBeNull();
  });

  it("bundles a parseable model for every profile", () => {
    for (const entry of BUNDLED_PROFILES) {
      const profile = parseAssessmentProfile(entry.yaml);
      expect(profile.profile.id).toBe(entry.id);
      expect(
        getBundledAssessmentModelYaml(entry.modelId, entry.version),
      ).toBeDefined();
    }
  });

  it("finds a model by id and version, defaulting to the latest release", () => {
    expect(getBundledAssessmentModelYaml("pqcmm")).toBe(
      getBundledAssessmentModelYaml("pqcmm", "1.0.1"),
    );
    expect(getBundledAssessmentModelYaml("pqcmm", "1.1.0")).toContain("1.1.0");
    expect(getBundledAssessmentModelYaml("pqcmm", "9.9.9")).toBeUndefined();
  });
});
