import { validateReportComposition } from "./validateComposition";
import {
  ATTESTATION_SECTIONS,
  ASSESSMENT_SECTIONS,
  DETAILED_SECTIONS,
  SECTION_ORDER,
  resolveSections,
  type SectionKey,
} from "./sections/registry";

describe("validateReportComposition", () => {
  it("accepts every tier preset", () => {
    expect(validateReportComposition(ATTESTATION_SECTIONS)).toEqual([]);
    expect(validateReportComposition(ASSESSMENT_SECTIONS)).toEqual([]);
    expect(validateReportComposition(DETAILED_SECTIONS)).toEqual([]);
    expect(validateReportComposition(SECTION_ORDER)).toEqual([]);
  });

  it("accepts any Custom pick resolved through resolveSections", () => {
    expect(
      validateReportComposition(
        resolveSections("custom", ["about", "cover", "gapToNext"]),
      ),
    ).toEqual([]);
    expect(validateReportComposition(resolveSections("custom", []))).toEqual([
      "composition is empty — nothing to render",
    ]);
  });

  it("flags duplicates", () => {
    expect(
      validateReportComposition(["cover", "timeline", "timeline", "about"]),
    ).toContain("duplicate section: timeline");
  });

  it("flags out-of-order sections", () => {
    const issues = validateReportComposition([
      "cover",
      "references",
      "gapToNext",
      "about",
    ]);
    expect(issues.some((i) => i.includes("out of order"))).toBe(true);
  });

  it("flags an unknown section", () => {
    expect(
      validateReportComposition(["cover", "bogus" as SectionKey, "about"]),
    ).toContain("unknown section(s): bogus");
  });

  it("requires cover first and about last when present", () => {
    expect(validateReportComposition(["timeline", "cover", "about"])).toContain(
      'the "cover" section must be first',
    );
    expect(
      // "about" then "timeline" is also out of order; the position rule
      // must be reported regardless.
      validateReportComposition(["about", "timeline"]),
    ).toContain('the "about" section must be last');
  });
});
