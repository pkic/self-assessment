import { SECTION_ORDER, type SectionKey } from "./sections/registry";

// Structural validation of a report's section composition, run by exportToPDF
// immediately before rendering (and by the test suite over every tier preset
// and Custom pick). It cannot inspect the laid-out pages — that is what the
// rendered-quality audit test does — but it guarantees the composition itself
// is coherent: only known sections, no duplicates, canonical order, the cover
// first and the About page last. A violation is a programming error (the tier
// presets are static and the Custom picker derives its list from
// SECTION_ORDER), so exportToPDF fails fast with a clear message instead of
// silently producing a malformed document.
export const validateReportComposition = (sections: SectionKey[]): string[] => {
  const issues: string[] = [];

  if (sections.length === 0) {
    issues.push("composition is empty — nothing to render");
    return issues;
  }

  const unknown = sections.filter((s) => !SECTION_ORDER.includes(s));
  if (unknown.length > 0) {
    issues.push(`unknown section(s): ${unknown.join(", ")}`);
  }

  const seen = new Set<SectionKey>();
  for (const s of sections) {
    if (seen.has(s)) issues.push(`duplicate section: ${s}`);
    seen.add(s);
  }

  const known = sections.filter((s) => SECTION_ORDER.includes(s));
  const indexes = known.map((s) => SECTION_ORDER.indexOf(s));
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] <= indexes[i - 1]) {
      issues.push(
        `sections out of order: "${known[i]}" must come before "${known[i - 1]}"`,
      );
      break;
    }
  }

  if (sections.includes("cover") && sections[0] !== "cover") {
    issues.push('the "cover" section must be first');
  }
  if (sections.includes("about") && sections[sections.length - 1] !== "about") {
    issues.push('the "about" section must be last');
  }

  return issues;
};

// Throwing wrapper used by exportToPDF: aborts the export with an explicit
// error (surfaced via runPdfGeneration's console.error) rather than shipping
// a malformed PDF to the user.
export const assertValidReportComposition = (sections: SectionKey[]): void => {
  const issues = validateReportComposition(sections);
  if (issues.length > 0) {
    throw new Error(
      `Report composition invalid — refusing to render: ${issues.join("; ")}`,
    );
  }
};
