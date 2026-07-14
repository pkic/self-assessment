import React from "react";
import { PdfDocument } from "./CoreReportDocument";
import { renderPdfText } from "../../test-utils/pdfText";
import {
  emptyFixture,
  fullFixture,
  toSelfProps,
} from "../../test-utils/reportFixtures";

describe("self report real render", () => {
  it("renders an empty assessment without throwing", async () => {
    const txt = await renderPdfText(
      <PdfDocument {...toSelfProps(emptyFixture)} />,
    );
    expect(txt.length).toBeGreaterThan(0);
  });

  it("renders a full assessment with intact (bold) text", async () => {
    const txt = await renderPdfText(
      <PdfDocument {...toSelfProps(fullFixture)} />,
    );
    // title (bold) renders intact — regression guard for the glyph drop.
    expect(txt).toContain("PKI Maturity");
  });

  it("does not render Timeline or PKI Environment sections", async () => {
    const txt = await renderPdfText(
      <PdfDocument {...toSelfProps(fullFixture)} />,
    );
    // The self report never collects timing or PKI-environment data — those
    // sections belong to the full-assessment tiers only.
    expect(txt).not.toContain("Timeline");
    expect(txt).not.toContain("PKI Environment");
  });
});
