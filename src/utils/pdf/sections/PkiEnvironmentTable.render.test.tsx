import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { PkiEnvironmentTable } from "./PkiEnvironmentTable";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  emptyFixture,
  fullFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";

const wrap = (ctx: Parameters<typeof PkiEnvironmentTable>[0]) =>
  renderPdfText(
    <Document>
      <Page>{PkiEnvironmentTable(ctx)}</Page>
    </Document>,
  );

describe("PkiEnvironmentTable section real render", () => {
  it("renders the heading and every filled field, including an unclipped chunk of a long value", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const txt = await wrap(ctx);

    expect(txt).toContain("PKI Environment");
    expect(txt).toContain("Components");
    expect(txt).toContain("High-level design");
    expect(txt).toContain(
      "an offline air-gapped root CA held in a hardware security module",
    );
  });

  it("returns null when no PKI environment field is filled", () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.pkiEnvironment).toEqual({});
    expect(PkiEnvironmentTable(ctx)).toBeNull();
  });
});
