import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ModuleMaturityBars } from "./ModuleMaturityBars";
import { Timeline } from "./Timeline";
import { About } from "./About";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  emptyFixture,
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

describe("ModuleMaturityBars section real render", () => {
  it("renders the heading and a module name for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const txt = await wrap(ModuleMaturityBars, ctx);

    expect(txt).toContain("Module maturity");
    expect(txt).toContain(ctx.moduleMaturityLevels[0].module);
  });

  it("still renders for an empty assessment, since its modules are non-empty", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const txt = await wrap(ModuleMaturityBars, ctx);

    expect(txt).toContain("Module maturity");
  });

  it("returns null when there are no module maturity levels to show", () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ModuleMaturityBars({ ...ctx, moduleMaturityLevels: [] })).toBeNull();
  });
});

describe("Timeline section real render", () => {
  it("renders (alwaysShow) with fallbacks for an attestation with no dates", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Attestation Report",
      tier: "attestation",
    });
    const txt = await wrap(Timeline, ctx);

    expect(txt).toContain("Timeline");
    expect(txt).toContain("Not specified");
  });

  it("renders nothing for an assessment tier with no dates (not alwaysShow)", () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(Timeline(ctx)).toBeNull();
  });

  it("renders the actual dates for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const txt = await wrap(Timeline, ctx);

    expect(txt).toContain("Timeline");
    expect(txt).toContain(ctx.startDate);
    expect(txt).toContain(ctx.targetDate);
    expect(txt).toContain(ctx.finishDate);
  });
});

describe("About section real render", () => {
  it("always contains the CC BY attribution", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    const txt = await wrap(About, ctx);

    expect(txt).toContain("CC BY");
  });
});
