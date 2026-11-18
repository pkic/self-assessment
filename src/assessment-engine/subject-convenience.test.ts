import { parseAssessmentProfile } from "./profile";
import { getBundledAssessmentProfileYaml } from "../defaults/assessmentProfiles";
import {
  suggestedSubjectValue,
  updateSubjectWithDefaults,
} from "./subject-convenience";

const profile = parseAssessmentProfile(
  getBundledAssessmentProfileYaml("pqcmm-self-assessment", "1.1.0")!,
);
const cpeField = profile.runtime.subjectFields.find(
  (field) => field.format === "cpe-2.3",
)!;

describe("assessment subject conveniences", () => {
  it("suggests a valid application CPE from configured source fields", () => {
    expect(
      suggestedSubjectValue(cpeField, {
        vendorName: "Example Corp.",
        productName: "Secure Gateway / Cloud",
        productVersion: "2.0",
      }),
    ).toBe("cpe:2.3:a:example_corp:secure_gateway_cloud:2.0:*:*:*:*:*:*:*");
  });

  it("does not suggest a CPE from descriptive text", () => {
    expect(
      suggestedSubjectValue(cpeField, {
        vendorName: "Example",
        productName: "Gateway server (linux-amd64 build, stable channel)",
        productVersion: "4.2",
      }),
    ).toBeNull();
    expect(
      suggestedSubjectValue(cpeField, {
        vendorName: "Example",
        productName: "Gateway",
        productVersion: "4.2 with OpenSSL 3.5",
      }),
    ).toBeNull();
  });

  it("does not guess a CPE until every configured source is present", () => {
    expect(
      suggestedSubjectValue(cpeField, {
        vendorName: "Example",
        productName: "Gateway",
        productVersion: "",
      }),
    ).toBeNull();
  });

  it("handles long punctuation-only source values without a suggestion", () => {
    expect(
      suggestedSubjectValue(cpeField, {
        vendorName: ".-_".repeat(20_000),
        productName: "Gateway",
        productVersion: "2.0",
      }),
    ).toBeNull();
  });

  it("keeps a configured default in sync without replacing manual input", () => {
    const first = updateSubjectWithDefaults(profile, {}, "vendorName", "A");
    expect(first.assessorOrganization).toBe("A");
    const second = updateSubjectWithDefaults(
      profile,
      first,
      "vendorName",
      "Acme",
    );
    expect(second.assessorOrganization).toBe("Acme");
    const manuallyChanged = {
      ...second,
      assessorOrganization: "Independent assessor",
    };
    expect(
      updateSubjectWithDefaults(
        profile,
        manuallyChanged,
        "vendorName",
        "New vendor",
      ).assessorOrganization,
    ).toBe("Independent assessor");
  });
});
