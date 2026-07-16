import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ScopeOverview } from "./ScopeOverview";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  emptyFixture,
  partialFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";

const wrap = (ctx: Parameters<typeof ScopeOverview>[0]) =>
  renderPdfText(
    <Document>
      <Page>{ScopeOverview(ctx)}</Page>
    </Document>,
  );

describe("ScopeOverview section real render", () => {
  it("renders the coverage statement and an excluded-items table for a partially-scoped assessment", async () => {
    const ctx = toSectionContext(partialFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.exclusions.length).toBeGreaterThan(0);

    const txt = await wrap(ctx);

    expect(txt).toContain("Scope");
    expect(txt).toContain("categories");
    expect(txt).toContain("requirements");
    expect(txt).toContain(`${ctx.coverage.categoriesInScope}`);
    expect(txt).toContain(`${ctx.coverage.categoriesTotal}`);
    expect(txt).toContain(`${ctx.coverage.requirementsInScope}`);
    expect(txt).toContain(`${ctx.coverage.requirementsTotal}`);

    const excluded = ctx.exclusions[0];
    expect(txt).toContain(excluded.categoryName);
    expect(excluded.reason).not.toBe("");
    expect(txt).toContain(excluded.reason);
  });

  it("renders an 'all in scope' line instead of a table when nothing is excluded", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.exclusions.length).toBe(0);

    const txt = await wrap(ctx);

    expect(txt).toContain("Scope");
    expect(txt).toContain("in scope");
    expect(txt).toContain("All categories and requirements are in scope.");
    expect(txt).not.toContain("Reason");
  });
});
