import React from "react";
import { Document } from "@react-pdf/renderer";
import { Cover } from "./Cover";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  fullFixture,
  toSectionContext,
  TINY_PNG_DATA_URI,
} from "../../../test-utils/reportFixtures";

describe("Cover section real render", () => {
  it("omits the QR block when showShareLink is false, even with qrImgData set", async () => {
    const ctx = {
      ...toSectionContext(fullFixture, {
        reportTitle: "Assessment Report",
        tier: "assessment",
      }),
      qrImgData: TINY_PNG_DATA_URI,
    };
    expect(ctx.showShareLink).toBe(false);

    const txt = await renderPdfText(<Document>{Cover(ctx)}</Document>);
    expect(txt).not.toContain("Scan to open the assessment");
    expect(txt).toContain("PKI Maturity Model");
    expect(txt).toContain("Assessment Report");
  });

  it("renders the QR caption when showShareLink is true and qrImgData is set", async () => {
    const ctx = {
      ...toSectionContext(fullFixture, {
        reportTitle: "Assessment Report",
        tier: "assessment",
      }),
      showShareLink: true,
      qrImgData: TINY_PNG_DATA_URI,
    };

    const txt = await renderPdfText(<Document>{Cover(ctx)}</Document>);
    expect(txt).toContain("Scan to open the assessment");
  });
});
