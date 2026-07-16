import React from "react";
import { ReportDocument } from "./ReportDocument";
import { renderPdfText, renderPdfBuffer } from "../../test-utils/pdfText";
import {
  emptyFixture,
  partialFixture,
  fullFixture,
  fixtureModules,
  toSectionContext,
} from "../../test-utils/reportFixtures";
import {
  ATTESTATION_SECTIONS,
  ASSESSMENT_SECTIONS,
  DETAILED_SECTIONS,
  resolveSections,
} from "./sections/registry";

describe("ReportDocument real render", () => {
  const ctx = toSectionContext(fullFixture, {
    reportTitle: "Assessment Report",
    tier: "assessment",
  });

  it("renders a picked cover + about doc without throwing, text intact", async () => {
    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={["cover", "about"]} />,
    );
    expect(txt).toContain("PKI Maturity Model");
    expect(txt).toContain("CC BY");
  });

  it("renders only the cover page when no body section is picked (no empty body page)", async () => {
    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={["cover"]} />,
    );
    expect(txt.length).toBeGreaterThan(0);
    expect(txt).toContain("PKI Maturity Model");
    expect(txt).not.toContain("CC BY");
  });

  // Complements the Cover section's QR-absent test (Cover.render.test.tsx):
  // ctx.showShareLink is false for every full-tier report (a full
  // assessment's URL is lossy — see SectionContext/toSectionContext), so the
  // Footer this ReportDocument renders must never carry the share link
  // either, not just the Cover's QR block.
  it("never renders the Go To Assessment footer link for a full-tier report", async () => {
    expect(ctx.showShareLink).toBe(false);
    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={["cover", "about"]} />,
    );
    expect(txt).not.toContain("Go To Assessment");
  });
});

// The Attestation tier is shareable and reveals no PKI/requirement detail: it
// carries the identity/coverage statement plus the canonical About page (its
// maturity ladder, via AboutPageBody — see registry.tsx), never
// PkiEnvironmentTable or RequirementDetails (neither key is in
// ATTESTATION_SECTIONS). All three data states behave identically here since
// none of these sections are data-gated.
describe("Attestation tier composition (full-tier real render)", () => {
  it.each([
    ["empty", emptyFixture],
    ["partial", partialFixture],
    ["full", fullFixture],
  ])(
    "renders the title, coverage line, and the canonical About page for a %s assessment, never PKI Environment or Requirement Assessment",
    async (_label, fixture) => {
      const ctx = toSectionContext(fixture, {
        reportTitle: "Attestation Report",
        tier: "attestation",
      });

      const txt = await renderPdfText(
        <ReportDocument ctx={ctx} sections={ATTESTATION_SECTIONS} />,
      );

      expect(txt.length).toBeGreaterThan(0);
      expect(txt).toContain("Attestation Report");
      // buildScopeCoverageLine's distinctive tail (AttestationStatement).
      expect(txt).toContain("see detailed report");
      // The canonical About page's maturity ladder (always renders, every
      // tier) plus its CC BY attribution, exactly once.
      expect(txt.match(/About PKI Maturity Model/g)).toHaveLength(1);
      expect(txt).toContain("Initial");
      expect(txt).toContain("Optimized");
      expect(txt).toContain("CC BY");
      // The old duplicate explainer section's distinct heading must never
      // reappear — the canonical About page is the only "About…" content.
      expect(txt).not.toContain("About the PKI Maturity Model");
      // Attestation deliberately excludes PKI details and requirement detail.
      expect(txt).not.toContain("PKI Environment");
      expect(txt).not.toContain("Requirement Assessment");
    },
  );
});

// The Assessment tier adds scope/maturity-distribution/completeness/PKI
// environment/references over Attestation, still with no per-requirement
// detail (requirementDetails is Detailed-only — not in ASSESSMENT_SECTIONS).
describe("Assessment tier composition (full-tier real render)", () => {
  it("renders without throwing for an empty assessment", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={ASSESSMENT_SECTIONS} />,
    );

    expect(txt.length).toBeGreaterThan(0);
    expect(txt).not.toContain("Requirement Assessment");
  });

  it("renders References and the distribution Total for a partial assessment (no PKI environment data yet)", async () => {
    const ctx = toSectionContext(partialFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.pkiEnvironment.components).toBeUndefined();
    expect(ctx.references.length).toBeGreaterThan(0);

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={ASSESSMENT_SECTIONS} />,
    );

    expect(txt).toContain("References");
    expect(txt).toContain("Total");
    expect(txt).not.toContain("PKI Environment");
    expect(txt).not.toContain("Requirement Assessment");
  });

  it("renders PKI Environment and the distribution Total for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Assessment Report",
      tier: "assessment",
    });
    expect(ctx.pkiEnvironment.components).toBeTruthy();

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={ASSESSMENT_SECTIONS} />,
    );

    expect(txt).toContain("PKI Environment");
    expect(txt).toContain("Total");
    expect(txt).not.toContain("Requirement Assessment");
    // The canonical About page (ladder + attribution) renders exactly once.
    expect(txt.match(/About PKI Maturity Model/g)).toHaveLength(1);
    expect(txt).toContain("CC BY");
  });
});

// The Detailed tier is additive over Assessment: per-requirement results,
// gap-to-next-level, action plans (only fullFixture carries any, on the
// current assessment — see buildCurrentActionPlans in reportFixtures.ts),
// and comparison (only fullFixture carries one too).
describe("Detailed tier composition (full-tier real render)", () => {
  it("renders without throwing for an empty assessment, with no Gap to Next Level yet", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.gapRows).toEqual([]);

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={DETAILED_SECTIONS} />,
    );

    expect(txt.length).toBeGreaterThan(0);
    expect(txt).not.toContain("Gap to Next Level");
    expect(txt).not.toContain("Action Plans");
  });

  it("renders Gap to Next Level and the distribution Total for a partially-assessed assessment", async () => {
    const ctx = toSectionContext(partialFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.gapRows.length).toBeGreaterThan(0);

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={DETAILED_SECTIONS} />,
    );

    expect(txt).toContain("Gap to Next Level");
    expect(txt).toContain("Total");
    expect(txt).not.toContain("Action Plans");
  });

  it("renders a requirement description, Gap to Next Level, and the distribution Total for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.gapRows.length).toBeGreaterThan(0);
    const sampleDescription =
      fixtureModules[0].categories[0].requirements?.[0]?.description;
    expect(sampleDescription).toBeTruthy();

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={DETAILED_SECTIONS} />,
    );

    expect(txt).toContain(sampleDescription);
    expect(txt).toContain("Gap to Next Level");
    expect(txt).toContain("Total");
    // The canonical About page (ladder + attribution) renders exactly once.
    expect(txt.match(/About PKI Maturity Model/g)).toHaveLength(1);
    expect(txt).toContain("CC BY");
  });

  // fullFixture carries real action plans on the CURRENT assessment (see
  // buildCurrentActionPlans in reportFixtures.ts), with an objective and a
  // POC-resolved responsibility — this exercises the production
  // action-plan wiring end-to-end through ReportDocument, not a
  // stubbed-out actionPlans: undefined no-op.
  it("renders Action Plans, with its objective and POC-resolved responsibility, for a full assessment", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    expect(ctx.actionPlanRows.length).toBeGreaterThan(0);

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={DETAILED_SECTIONS} />,
    );

    expect(txt).toContain("Action Plans");
    expect(txt).toContain("Publish a CP/CPS");
    expect(txt).toContain("Dana Lee");
  });
});

// A user-composed Custom report is just resolveSections("custom", picks)
// against the same ReportDocument — no separate rendering path.
describe("Custom report composition (full-tier real render)", () => {
  it("renders exactly the picked identity + about sections, none of the data sections", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Custom Report",
      tier: "custom",
    });
    const sections = resolveSections("custom", [
      "cover",
      "attestationStatement",
      "about",
    ]);
    expect(sections).toEqual(["cover", "attestationStatement", "about"]);

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={sections} />,
    );

    expect(txt).toContain("Custom Report");
    expect(txt).toContain(fullFixture.assessmentName);
    expect(txt).toContain("see detailed report");
    expect(txt).toContain("CC BY");
    expect(txt).not.toContain("Total");
    expect(txt).not.toContain("PKI Environment");
    expect(txt).not.toContain("Gap to Next Level");
    const sampleDescription =
      fixtureModules[0].categories[0].requirements?.[0]?.description;
    expect(sampleDescription).toBeTruthy();
    expect(txt).not.toContain(sampleDescription);
  });

  it("renders a single-section custom pick without throwing", async () => {
    const ctx = toSectionContext(fullFixture, {
      reportTitle: "Custom Report",
      tier: "custom",
    });
    const sections = resolveSections("custom", ["about"]);
    expect(sections).toEqual(["about"]);

    const txt = await renderPdfText(
      <ReportDocument ctx={ctx} sections={sections} />,
    );

    expect(txt).toContain("CC BY");
  });

  // No-blank-page regression proxy: a Custom set whose only body section
  // self-gates to null (ComparisonToBaseline returns null with no baseline —
  // emptyFixture.comparison is undefined, so ctx.comparison is null) must
  // never leave a blank content page behind. ReportDocument's rendered-length
  // guard (see ReportDocument.tsx) means no cover was picked and no body
  // section actually rendered, so the whole Document has zero pages — this
  // must not throw. Uses renderPdfBuffer (skips the pdf-parse text-extraction
  // round trip) rather than renderPdfText: pdf-parse's bundled 2017-era pdfjs
  // is unreliable specifically on a genuinely zero-page PDF, and there is no
  // text to extract from one anyway — the assertion that actually matters
  // (rendering a fully self-gated pick doesn't throw) doesn't need it.
  it("does not throw for a self-gated custom section with no baseline (zero pages)", async () => {
    const ctx = toSectionContext(emptyFixture, {
      reportTitle: "Custom Report",
      tier: "custom",
    });
    expect(ctx.comparison).toBeNull();
    const sections = resolveSections("custom", ["comparison"]);
    expect(sections).toEqual(["comparison"]);

    const buf = await renderPdfBuffer(
      <ReportDocument ctx={ctx} sections={sections} />,
    );

    expect(buf.length).toBeGreaterThan(0);
  });
});
