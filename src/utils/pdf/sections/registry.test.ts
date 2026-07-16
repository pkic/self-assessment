import {
  SECTION_ORDER,
  ATTESTATION_SECTIONS,
  ASSESSMENT_SECTIONS,
  DETAILED_SECTIONS,
  TIER_SECTIONS,
  SECTION_REGISTRY,
  resolveSections,
} from "./registry";
import type { SectionKey } from "./SectionContext";

const isSubseq = (a: SectionKey[], b: SectionKey[]): boolean => {
  let i = 0;
  for (const x of b) if (x === a[i]) i++;
  return i === a.length;
};

describe("section registry tier arrays", () => {
  it("tiers are additive ordered subsequences", () => {
    expect(isSubseq(ATTESTATION_SECTIONS, ASSESSMENT_SECTIONS)).toBe(true);
    expect(isSubseq(ASSESSMENT_SECTIONS, DETAILED_SECTIONS)).toBe(true);
  });

  it("resolveSections orders a custom pick by SECTION_ORDER", () => {
    expect(resolveSections("custom", ["about", "cover", "timeline"])).toEqual([
      "cover",
      "timeline",
      "about",
    ]);
  });

  it("resolveSections ignores unknown/duplicate keys in a custom pick", () => {
    expect(
      resolveSections("custom", [
        "about",
        "about",
        "cover",
        "not-a-real-key" as SectionKey,
      ]),
    ).toEqual(["cover", "about"]);
  });

  it("resolveSections returns the tier preset for a named tier", () => {
    expect(resolveSections("detailed")).toEqual(DETAILED_SECTIONS);
    expect(resolveSections("assessment")).toEqual(ASSESSMENT_SECTIONS);
    expect(resolveSections("attestation")).toEqual(ATTESTATION_SECTIONS);
  });

  it("every tier preset starts with cover and ends with about", () => {
    for (const tier of [
      ATTESTATION_SECTIONS,
      ASSESSMENT_SECTIONS,
      DETAILED_SECTIONS,
    ]) {
      expect(tier[0]).toBe("cover");
      expect(tier[tier.length - 1]).toBe("about");
    }
  });

  it("TIER_SECTIONS maps each named tier to its preset array", () => {
    expect(TIER_SECTIONS.attestation).toBe(ATTESTATION_SECTIONS);
    expect(TIER_SECTIONS.assessment).toBe(ASSESSMENT_SECTIONS);
    expect(TIER_SECTIONS.detailed).toBe(DETAILED_SECTIONS);
  });

  it("SECTION_ORDER lists every key exactly once", () => {
    expect(new Set(SECTION_ORDER).size).toBe(SECTION_ORDER.length);
  });

  it("SECTION_REGISTRY has a component for every SectionKey in SECTION_ORDER", () => {
    for (const key of SECTION_ORDER) {
      expect(typeof SECTION_REGISTRY[key]).toBe("function");
    }
  });

  // Guards against a future SectionKey being added to SECTION_REGISTRY but
  // omitted from SECTION_ORDER (which would silently drop it from every tier
  // array and from the Custom picker, since resolveSections/TIER_SECTIONS
  // are all built from SECTION_ORDER).
  it("SECTION_ORDER and SECTION_REGISTRY cover exactly the same set of keys", () => {
    expect(new Set(SECTION_ORDER)).toEqual(
      new Set(Object.keys(SECTION_REGISTRY)),
    );
  });
});
