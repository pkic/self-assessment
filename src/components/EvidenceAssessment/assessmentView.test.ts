import { getBundledAssessmentProfileYaml } from "../../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "../../assessment-engine/profile";
import {
  adjacentLevels,
  errorMessage,
  evidenceRequiredFromLevel,
  exportBlockedReason,
  levelStatusLabel,
  scopeSummary,
} from "./assessmentView";
import { plainText } from "./criterionLabel";

const profile = parseAssessmentProfile(
  getBundledAssessmentProfileYaml("pqcmm-self-assessment", "1.1.0")!,
);

describe("assessment view helpers", () => {
  it("explains why export is blocked", () => {
    expect(exportBlockedReason(false, [])).toBe(
      "Export requires HTTPS or localhost.",
    );
    expect(exportBlockedReason(true, ["Vendor is required."])).toBe(
      "Vendor is required.",
    );
    expect(exportBlockedReason(true, [])).toBeUndefined();
  });

  it("summarises scope as outstanding items or the named subject", () => {
    expect(scopeSummary(profile, {})).toEqual({
      complete: false,
      summary:
        "Still needed: Product or service, Product version or release and 2 more",
    });
    expect(
      scopeSummary(profile, {
        productName: "Gateway",
        productVersion: "4.2",
        assessmentDate: "2026-11-12",
      }),
    ).toEqual({
      complete: false,
      summary: "Still needed: Inventory identifier",
    });
    expect(
      scopeSummary(profile, {
        productName: "Gateway",
        productVersion: "4.2",
        vendorName: "Example",
        purl: "pkg:generic/example/gateway@4.2",
        assessmentDate: "2026-11-12",
      }),
    ).toEqual({ complete: true, summary: "Gateway, 4.2, Example" });
  });

  it("labels a level by its gate status", () => {
    const score = { achievedLevel: 1, nextLevel: 2 } as Parameters<
      typeof levelStatusLabel
    >[0];
    expect(levelStatusLabel(score, 0)).toBe("Established");
    expect(levelStatusLabel(score, 2)).toBe("Next gate");
    expect(levelStatusLabel(score, 4)).toBe("Not yet established");
  });

  it("reads the evidence threshold from the methodology", () => {
    expect(evidenceRequiredFromLevel(profile)).toBe(1);
  });

  it("finds the neighbouring levels", () => {
    const levels = [{ number: 0 }, { number: 1 }, { number: 2 }];
    expect(adjacentLevels(levels, 0)).toEqual({
      previous: undefined,
      next: { number: 1 },
      maximumLevel: 2,
    });
    expect(adjacentLevels(levels, 2).previous).toEqual({ number: 1 });
  });

  it("formats unknown errors", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });
});

describe("plainText", () => {
  it("keeps link text, drops targets and Markdown marks", () => {
    expect(
      plainText(
        "See the **model's [design principle](https://pkic.org/x)** and  _more_.",
      ),
    ).toBe("See the model's design principle and more.");
  });

  it("leaves unmatched brackets alone", () => {
    expect(plainText("Array [0] (index)")).toBe("Array [0] (index)");
  });
});
