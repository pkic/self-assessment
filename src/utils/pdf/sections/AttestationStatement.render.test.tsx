import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { AttestationStatement } from "./AttestationStatement";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  emptyFixture,
  fullFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";

const wrap = (ctx: Parameters<typeof AttestationStatement>[0]) =>
  renderPdfText(
    <Document>
      <Page>{AttestationStatement(ctx)}</Page>
    </Document>,
  );

describe("AttestationStatement section real render", () => {
  it("renders the maturity level, identity, and coverage line for a full assessment, without any PKI environment or detailed scope content", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Attestation Report",
      tier: "attestation",
    });
    const txt = await wrap(ctx);

    expect(txt).toContain(`PKI Maturity Level: ${ctx.overallMaturityLevel}`);
    expect(txt).toContain("External"); // assessorPosition: "external"
    expect(txt).toContain("Formal"); // assessmentType: "formal"
    expect(txt).toContain("Medium confidence"); // mapAssessmentType("formal").confidence
    expect(txt).toContain("in scope"); // buildScopeCoverageLine substring
    expect(txt).toContain(ctx.assessmentName);
    expect(txt).toContain(ctx.organizationName);
    expect(txt).toContain(ctx.assessorCompany);
    expect(txt).toContain(`PKI Maturity Model ${ctx.dataVersion}`);

    expect(txt).not.toContain("PKI Environment");
    expect(txt).not.toContain("High-level design");
    expect(txt).not.toContain("Components");
  });

  it("renders 'Not specified' identity fallbacks for an empty assessment, without throwing", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Attestation Report",
      tier: "attestation",
    });
    const txt = await wrap(ctx);

    expect(txt).toContain("Not specified");
    expect(txt).not.toContain("PKI Environment");
  });
});
