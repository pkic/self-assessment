import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ReferencesAppendix } from "./ReferencesAppendix";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  emptyFixture,
  fullFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";

const wrap = (ctx: Parameters<typeof ReferencesAppendix>[0]) =>
  renderPdfText(
    <Document>
      <Page>{ReferencesAppendix(ctx)}</Page>
    </Document>,
  );

describe("ReferencesAppendix section real render", () => {
  it("renders the heading and every reference title for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const txt = await wrap(ctx);

    expect(txt).toContain("References");
    expect(ctx.references.length).toBeGreaterThan(0);
    expect(txt).toContain(ctx.references[0].title);
  });

  it("returns null when there are no references", () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.references).toEqual([]);
    expect(ReferencesAppendix(ctx)).toBeNull();
  });

  it("does not set `break` on its own root — ReportDocument owns the page break", () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const el = ReferencesAppendix(ctx);
    expect(el).not.toBeNull();
    const props = (el as React.ReactElement<{ break?: boolean }>).props;
    expect(props.break).toBeUndefined();
  });
});
