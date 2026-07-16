import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { RequirementDetails } from "./RequirementDetails";
import { GapToNext } from "./GapToNext";
import { ComparisonToBaseline } from "./ComparisonToBaseline";
import { LevelPill } from "../LevelPill";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  emptyFixture,
  fullFixture,
  partialFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";
import type { SectionContext } from "./SectionContext";

const wrap = (el: React.ReactElement | null) =>
  renderPdfText(
    <Document>
      <Page>{el}</Page>
    </Document>,
  );

// Forbidden glyphs: the embedded Roboto subset can silently mis-map an arrow,
// triangle, or checkmark in a PDF text run — the comparison's deltas are
// drawn as Svg/Polygon triangles instead of any of these characters.
const FORBIDDEN_GLYPHS = /[→▲▼✓−]/;

// Walks the (unrendered) React element tree a section function returns,
// collecting every element whose `type` is `LevelPill` — mirrors
// CoreReportDocument.dom.test.tsx's findElementsByType. Because the tree is
// never actually rendered, nested custom components (TableCell, LevelPill
// itself) are never invoked, so this finds a `<LevelPill>` nested inside a
// `<TableCell plain>` without needing to mock any @react-pdf primitive.
const findLevelPills = (
  node: unknown,
): React.ReactElement<{ level: number; variant?: string }>[] => {
  const found: React.ReactElement<{ level: number; variant?: string }>[] = [];
  const visit = (n: unknown): void => {
    if (n === null || n === undefined || typeof n !== "object") return;
    if (Array.isArray(n)) return void n.forEach(visit);
    if (!React.isValidElement(n)) return;
    const el = n as React.ReactElement<Record<string, unknown>>;
    if (el.type === LevelPill) {
      found.push(el as React.ReactElement<{ level: number; variant?: string }>);
    }
    if (el.props && el.props.children) visit(el.props.children);
  };
  visit(node);
  return found;
};

describe("RequirementDetails section real render", () => {
  it("renders the heading and a requirement description for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    const txt = await wrap(RequirementDetails(ctx));

    expect(txt).toContain("Requirement Assessment");
    expect(ctx.requirementDetailRows.length).toBeGreaterThan(0);
    const firstRow = ctx.requirementDetailRows[0].categories[0].rows[0];
    expect(txt).toContain(firstRow.requirementDescription);
    // Result column now renders a LevelPill (widened 12% -> 18%) instead of
    // plain text — the pill's label still equals the row's level name.
    expect(txt).toContain(firstRow.resultLabel);
  });

  it("renders the applied-filter note when ctx.requirementFilter is set", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
      requirementFilter: { text: "policy", statuses: new Set(["flagged"]) },
    });
    const txt = await wrap(RequirementDetails(ctx));

    expect(txt).toContain("Showing requirements matching");
  });

  it("returns null when there are no requirement detail rows", () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    // emptyFixture has no requirement progress but still carries every
    // in-scope requirement (level 0) — force the empty case explicitly so
    // this test is not coupled to that fixture's current shape.
    const emptyCtx: SectionContext = { ...ctx, requirementDetailRows: [] };
    expect(RequirementDetails(emptyCtx)).toBeNull();
  });
});

describe("GapToNext section real render", () => {
  it("renders the heading and next-level context for a partially-assessed category", async () => {
    const ctx = toSectionContext(partialFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.gapRows.length).toBeGreaterThan(0);
    const txt = await wrap(GapToNext(ctx));

    expect(txt).toContain("Gap to Next Level");
    expect(txt).toContain("Next");
  });

  // Regression guard: the limiting-requirement table's level column renders a
  // number-variant LevelPill (a colored number), not plain "Level N" text —
  // consistent with every other maturity-level cell in the report.
  it("renders each limiting requirement's level as a number-variant LevelPill, not plain text", () => {
    const ctx = toSectionContext(partialFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    const rowWithLimiting = ctx.gapRows.find(
      (r) => r.limitingRequirements.length > 0,
    );
    expect(rowWithLimiting).toBeDefined();

    const pills = findLevelPills(GapToNext(ctx)).filter(
      (p) => p.props.variant === "number",
    );
    // Two pills (Current/Next) per gap row, plus one per limiting requirement.
    const expectedLimitingCount = ctx.gapRows.reduce(
      (sum, r) => sum + r.limitingRequirements.length,
      0,
    );
    expect(pills.length).toBe(ctx.gapRows.length * 2 + expectedLimitingCount);

    const pillLevels = pills.map((p) => p.props.level);
    rowWithLimiting!.limitingRequirements.forEach((req) => {
      expect(pillLevels).toContain(req.level);
    });
  });

  it("returns null when there are no gap rows", () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.gapRows).toEqual([]);
    expect(GapToNext(ctx)).toBeNull();
  });
});

describe("ComparisonToBaseline section real render", () => {
  it("renders the heading, the baseline identity banner, and the legend with no forbidden glyphs", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.comparison).not.toBeNull();
    expect(ctx.comparisonBaselineName).toBe("Q1 Baseline 2026");
    expect(ctx.comparisonBaselineDate).toBe("2026-01-15");
    const txt = await wrap(ComparisonToBaseline(ctx));

    expect(txt).toContain("Comparison to Baseline");
    expect(txt).toContain("Comparing against baseline:");
    expect(txt).toContain(ctx.comparisonBaselineName as string);
    expect(txt).toContain(ctx.comparisonBaselineDate as string);
    expect(txt).toContain("Improved");
    expect(txt).toContain("Declined");
    expect(txt).not.toMatch(FORBIDDEN_GLYPHS);
  });

  it("returns null when there is no comparison baseline", () => {
    const ctx = toSectionContext(partialFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.comparison).toBeNull();
    expect(ComparisonToBaseline(ctx)).toBeNull();
  });
});
