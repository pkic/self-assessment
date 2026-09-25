import { getBundledAssessmentProfileYaml } from "../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "./profile";
import { assessmentSubjectIssues } from "./subject-validation";

const profile = parseAssessmentProfile(
  getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
);
const requiredScope = {
  productName: "Example product",
  productVersion: "1.0.0",
  assessmentDate: "2026-08-15",
};

describe("assessment subject validation", () => {
  it("requires a CPE or pURL when the profile declares an at-least-one rule", () => {
    expect(assessmentSubjectIssues(profile, requiredScope)).toContainEqual(
      expect.stringContaining("CPE 2.3 name or package URL"),
    );
  });

  it("accepts either identifier independently", () => {
    expect(
      assessmentSubjectIssues(profile, {
        ...requiredScope,
        cpe: "cpe:2.3:a:example:product:1.0.0:*:*:*:*:*:*:*",
      }),
    ).toEqual([]);
    expect(
      assessmentSubjectIssues(profile, {
        ...requiredScope,
        purl: "pkg:maven/org.example/product@1.0.0",
      }),
    ).toEqual([]);
  });

  it("counts only unescaped CPE separators", () => {
    expect(
      assessmentSubjectIssues(profile, {
        ...requiredScope,
        cpe: "cpe:2.3:a:example:prod\\:uct:1.0.0:*:*:*:*:*:*:*",
      }),
    ).toEqual([]);
    expect(
      assessmentSubjectIssues(profile, {
        ...requiredScope,
        cpe: "cpe:2.3:a:example:product:1.0.0:*:*:*:*:*:*",
      }),
    ).toContainEqual(expect.stringContaining("not a valid cpe-2.3"));
  });

  it("rejects package URLs without a type, name, or with whitespace", () => {
    for (const purl of ["pkg:/product", "pkg:maven/", "pkg:maven/a b"]) {
      expect(
        assessmentSubjectIssues(profile, { ...requiredScope, purl }),
      ).toContainEqual(expect.stringContaining("not a valid package-url"));
    }
  });
});
