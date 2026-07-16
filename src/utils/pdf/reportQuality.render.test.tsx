import React from "react";
import { ReportDocument } from "./ReportDocument";
import { resolveSections, type SectionKey } from "./sections/registry";
import { validateReportComposition } from "./validateComposition";
import { renderPdfPageItems, type PdfTextItem } from "../../test-utils/pdfText";
import {
  emptyFixture,
  partialFixture,
  fullFixture,
  longFixture,
  toSectionContext,
  type ReportFixture,
} from "../../test-utils/reportFixtures";

// Real @react-pdf renders of whole multi-page documents — especially the
// Detailed tier against the long "abuse" fixture — take several seconds on
// slower CI runners, past jest's 5s default. Give the audit generous headroom.
jest.setTimeout(60000);

// The rendered-quality audit: every tier preset (and a Custom pick) is
// rendered through the REAL @react-pdf pipeline across empty/partial/full
// data states, and the resulting pages' positioned text runs are checked for
// the layout invariants a professional report must hold — no blank page, no
// section heading stranded at a page bottom with nothing under it, and no
// glyph the embedded Roboto subset would silently mis-map. This is the
// executable counterpart of exportToPDF's structural composition validation:
// the validator guarantees the composition is coherent before rendering;
// this suite guarantees the rendered layout of every shipped composition
// stays clean as sections evolve.

// The fixed footer's text sits around y≈20-35 (PDF user space, origin at the
// page bottom); anything above this band counts as page CONTENT.
const FOOTER_BAND_Y = 45;

// Section headings + significant bold sub-headings. If one of these is
// rendered on a page, some other content run must sit below it on the same
// page (stranded-heading check).
const HEADINGS = [
  "Attestation Statement",
  "Module maturity",
  "Timeline",
  "Scope",
  "Maturity level distribution",
  "Assessment Completeness",
  "PKI Environment",
  "Requirement Assessment",
  "Gap to Next Level",
  "Action Plans",
  "Comparison to Baseline",
  "By module",
  "By category",
  "Action plan reconciliation",
  "References",
  "About PKI Maturity Model",
];

const FORBIDDEN_GLYPHS = /[→▲▼✓−]/;

// Dynamic module headings ("G — Governance", "M — Management", …) are
// headings too for the stranded-heading check — a module heading at a page
// bottom with its first category table on the next page was a real defect
// (the "heading then a blank rest of the page" report).
const MODULE_HEADING = /^[A-Z]{1,2} — .+/;

const isHeading = (s: string): boolean =>
  HEADINGS.includes(s) || MODULE_HEADING.test(s);

const contentItems = (page: PdfTextItem[]): PdfTextItem[] =>
  page.filter((it) => it.y > FOOTER_BAND_Y);

const contentChars = (page: PdfTextItem[]): number =>
  contentItems(page)
    .map((it) => it.str.trim())
    .join("").length;

const auditPages = (
  label: string,
  pages: PdfTextItem[][],
  coverTitle: string | null,
): string[] => {
  const problems: string[] = [];
  pages.forEach((page, idx) => {
    const pageNo = idx + 1;
    const isCover = coverTitle !== null && idx === 0;
    // The cover is exempt from the body-content threshold, but must actually
    // BE a cover — a blank leading page would otherwise pass as one. The
    // title may be split across text runs, so compare whitespace-stripped
    // page text rather than any single item.
    if (isCover) {
      const flat = page
        .map((it) => it.str)
        .join("")
        .replace(/\s+/g, "");
      if (!flat.includes(coverTitle.replace(/\s+/g, ""))) {
        problems.push(
          `${label}: page 1 should be the cover but does not contain the title "${coverTitle}"`,
        );
      }
    }
    // Blank-page check: a page must carry real content above the footer.
    if (!isCover && contentChars(page) < 25) {
      problems.push(
        `${label}: page ${pageNo} is blank/sparse (${contentChars(page)} content chars)`,
      );
    }
    // Stranded-heading check: a heading run near the page bottom with no
    // content run below it means the heading orphaned from its section.
    for (const it of contentItems(page)) {
      if (!isHeading(it.str.trim())) continue;
      const hasContentBelow = contentItems(page).some(
        (other) => other !== it && other.y < it.y - 4,
      );
      if (!hasContentBelow) {
        problems.push(
          `${label}: heading "${it.str.trim()}" stranded at the bottom of page ${pageNo}`,
        );
      }
    }
    // Glyph-safety check on everything the page renders.
    for (const it of page) {
      if (FORBIDDEN_GLYPHS.test(it.str)) {
        problems.push(
          `${label}: page ${pageNo} renders a forbidden glyph in "${it.str}"`,
        );
      }
    }
    // Content-collapse check: @react-pdf v4.5.1 can render a relocating
    // group with zero height, over-printing its rows on top of each other
    // at a page bottom (an unreadable smear). Two multi-word text runs
    // starting at the same x within ~3pt of the same baseline can only be
    // that collapse — legitimate same-line runs sit at different x.
    const texts = contentItems(page).filter(
      (it) => it.str.trim().split(/\s+/).length >= 3,
    );
    for (let a = 0; a < texts.length; a++) {
      for (let b = a + 1; b < texts.length; b++) {
        if (
          Math.abs(texts[a].y - texts[b].y) < 3 &&
          Math.abs(texts[a].x - texts[b].x) < 4
        ) {
          problems.push(
            `${label}: page ${pageNo} has overlapping text (content collapse) — "${texts[
              a
            ].str.slice(0, 40)}" over "${texts[b].str.slice(0, 40)}"`,
          );
        }
      }
    }
  });
  return problems;
};

const TIERS = ["attestation", "assessment", "detailed"] as const;
const FIXTURES: [string, ReportFixture][] = [
  ["empty", emptyFixture],
  ["partial", partialFixture],
  ["full", fullFixture],
  // The abuse fixture: every user-controlled free-text field pushed far past
  // realistic length — proves the layout survives arbitrary input.
  ["long", longFixture],
];

const TITLES: Record<string, string> = {
  attestation: "Attestation Report",
  assessment: "Assessment Report",
  detailed: "Detailed Report",
  custom: "Custom Report",
};

describe("rendered report quality audit", () => {
  for (const tier of TIERS) {
    for (const [state, fixture] of FIXTURES) {
      it(`${tier} × ${state}: valid composition, no blank pages, no stranded headings, glyph-safe`, async () => {
        const sections = resolveSections(tier);
        expect(validateReportComposition(sections)).toEqual([]);

        const ctx = toSectionContext(fixture, {
          reportTitle: TITLES[tier],
          tier,
        });
        const pages = await renderPdfPageItems(
          <ReportDocument ctx={ctx} sections={sections} />,
        );
        expect(pages.length).toBeGreaterThan(0);
        expect(auditPages(`${tier}/${state}`, pages, TITLES[tier])).toEqual([]);
      });
    }
  }

  it("custom (mixed pick) × full: valid composition, no blank pages, no stranded headings, glyph-safe", async () => {
    const pick: SectionKey[] = [
      "cover",
      "attestationStatement",
      "maturityCharts",
      "actionPlans",
      "comparison",
      "references",
      "about",
    ];
    const sections = resolveSections("custom", pick);
    expect(validateReportComposition(sections)).toEqual([]);

    const ctx = toSectionContext(fullFixture, {
      reportTitle: TITLES.custom,
      tier: "custom",
    });
    const pages = await renderPdfPageItems(
      <ReportDocument ctx={ctx} sections={sections} />,
    );
    expect(auditPages("custom/full", pages, TITLES.custom)).toEqual([]);
  });
});
