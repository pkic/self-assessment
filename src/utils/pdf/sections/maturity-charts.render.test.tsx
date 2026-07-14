import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { MaturityCharts } from "./MaturityCharts";
import { CompletenessSection } from "./CompletenessSection";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  fullFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";
import type { SectionComponent } from "./SectionContext";

const wrap = (
  Section: SectionComponent,
  ctx: Parameters<SectionComponent>[0],
) =>
  renderPdfText(
    <Document>
      <Page>{Section(ctx)}</Page>
    </Document>,
  );

describe("MaturityCharts section real render", () => {
  it("renders the heading and the distribution table for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.distribution.groups.length).toBeGreaterThan(0);

    const txt = await wrap(MaturityCharts, ctx);

    expect(txt).toContain("Maturity level distribution");
    expect(txt).toContain("Total");
  });

  it("returns null when the distribution has no category groups", () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const emptyGroupsCtx = {
      ...ctx,
      distribution: { ...ctx.distribution, groups: [] },
    };

    expect(MaturityCharts(emptyGroupsCtx)).toBeNull();
  });
});

describe("CompletenessSection section real render", () => {
  it("renders the heading and the rings for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.reportCompleteness.total).toBeGreaterThan(0);

    const txt = await wrap(CompletenessSection, ctx);

    expect(txt).toContain("Assessment Completeness");
  });

  it("returns null when reportCompleteness.total is 0", () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const zeroCompletenessCtx = {
      ...ctx,
      reportCompleteness: {
        ...ctx.reportCompleteness,
        total: 0,
        assessed: 0,
        perModule: [],
      },
    };

    expect(CompletenessSection(zeroCompletenessCtx)).toBeNull();
  });
});
