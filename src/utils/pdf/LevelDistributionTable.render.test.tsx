import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { LevelDistributionTable } from "./LevelDistributionTable";
import { buildLevelDistribution } from "../reportData";
import { renderPdfText } from "../../test-utils/pdfText";
import { partialFixture } from "../../test-utils/reportFixtures";

// Real-render regression: this table was migrated onto the shared Table
// primitive (real bundled bold font for "Total"/"Subtotal" instead of the
// StyleSheet-only boldText, plus the closed-bottom border fix). Rendering
// through the actual pdfkit backend + text extraction catches a bold-glyph
// drop that a mocked-@react-pdf element-tree test would miss.
describe("LevelDistributionTable real render", () => {
  it("renders module/category/subtotal/total rows with intact bold text", async () => {
    const distribution = buildLevelDistribution({
      modules: partialFixture.modules,
      progress: partialFixture.progress,
      requirementProgress: partialFixture.requirementProgress ?? {},
    });

    const txt = await renderPdfText(
      <Document>
        <Page>
          <LevelDistributionTable distribution={distribution} />
        </Page>
      </Document>,
    );

    expect(txt).toContain("Category");
    expect(txt).toContain("Total");
    expect(txt).toContain("Subtotal");
    expect(txt).toContain(distribution.groups[0].module);
  });
});
