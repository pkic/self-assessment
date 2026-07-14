import React from "react";
import ReactPDF, { Document, Page } from "@react-pdf/renderer";
import { CompletenessRings } from "./CompletenessRings";
import { buildReportCompleteness } from "../../reportData";
import { fullFixture } from "../../../test-utils/reportFixtures";

// Real-render regression: unlike the element-tree tests that mock @react-pdf,
// this renders through the actual pdfkit backend, which validates SVG dash
// arrays. A 0% ring must NOT emit `strokeDasharray="0 <c>"` — pdfkit rejects a
// zero dash length ("lengths must be numeric and greater than zero"), and that
// throw aborts the whole Assessment/Detailed PDF (symptom: report never
// downloads for a fresh/partly-assessed assessment).
const renderDoc = (completeness: {
  assessed: number;
  total: number;
  perModule: { module: string; assessed: number; total: number }[];
}) =>
  ReactPDF.renderToBuffer(
    <Document>
      <Page>
        <CompletenessRings completeness={completeness} />
      </Page>
    </Document>,
  );

describe("CompletenessRings real render", () => {
  it("renders an all-zero (nothing assessed) completeness without throwing", async () => {
    const buf = await renderDoc({
      assessed: 0,
      total: 16,
      perModule: [
        { module: "Governance", assessed: 0, total: 5 },
        { module: "Management", assessed: 0, total: 4 },
      ],
    });
    expect(buf.length).toBeGreaterThan(0);
  });

  it("renders a mix of 0%, partial and 100% rings without throwing", async () => {
    const buf = await renderDoc({
      assessed: 3,
      total: 16,
      perModule: [
        { module: "Governance", assessed: 5, total: 5 }, // 100%
        { module: "Management", assessed: 2, total: 4 }, // 50%
        { module: "Operations", assessed: 0, total: 3 }, // 0%
      ],
    });
    expect(buf.length).toBeGreaterThan(0);
  });

  it("renders the fullFixture's (fully assessed) completeness without throwing", async () => {
    const reportCompleteness = buildReportCompleteness(
      fullFixture.modules,
      fullFixture.progress,
      fullFixture.requirementProgress,
    );
    const buf = await renderDoc({
      assessed: reportCompleteness.assessed,
      total: reportCompleteness.total,
      perModule: reportCompleteness.perModule.map((m) => ({
        module: m.module,
        assessed: m.assessed,
        total: m.total,
      })),
    });
    expect(buf.length).toBeGreaterThan(0);
  });
});
