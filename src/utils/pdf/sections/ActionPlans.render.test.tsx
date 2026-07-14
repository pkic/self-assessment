import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ActionPlans } from "./ActionPlans";
import { renderPdfText } from "../../../test-utils/pdfText";
import {
  fullFixture,
  toSectionContext,
} from "../../../test-utils/reportFixtures";
import type { SectionContext } from "./SectionContext";
import type { ActionPlanReportRow } from "../../reportData";

const wrap = (el: React.ReactElement | null) =>
  renderPdfText(
    <Document>
      <Page>{el}</Page>
    </Document>,
  );

const oneRow: ActionPlanReportRow = {
  categoryKey: "G.strategy-and-vision",
  module: "Governance",
  categoryName: "Strategy and vision",
  currentLevel: 1,
  targetLevel: 3,
  objectives: ["Publish a CP/CPS"],
  responsibility: "Alice",
  outputs: [],
  tasks: [{ label: "Draft policy", done: false }],
  comments: undefined,
  resources: undefined,
  targetDate: undefined,
};

// Forbidden glyphs: the embedded Roboto subset can silently mis-map an arrow,
// triangle, or checkmark in a PDF text run, so the action-plan card's
// progression arrow and task-done indicator are drawn as Svg/View shapes
// rather than any of these characters.
const FORBIDDEN_GLYPHS = /[→▲▼✓−]/;

describe("ActionPlans section real render", () => {
  // A single renderPdfText call covers every assertion below: pdf-parse's
  // underlying pdfjs has a documented flakiness (see LevelPill.render.test.tsx)
  // with repeated real renders of near-identical rounded/padded Views (this
  // card's LevelPills) in one process, so this section is rendered once and
  // every assertion runs against that one extraction.
  it("renders a structured plan card with heading, progression, objectives, and tasks", async () => {
    const base = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    const ctx: SectionContext = { ...base, actionPlanRows: [oneRow] };
    const txt = await wrap(ActionPlans(ctx));

    expect(txt).toContain("Action Plans");
    expect(txt).toContain("Strategy and vision");
    expect(txt).toContain("Publish a CP/CPS");
    expect(txt).toContain("Draft policy");
    expect(txt).toContain("0 of 1 done");
    expect(txt).not.toMatch(FORBIDDEN_GLYPHS);
  });

  it("returns null when there are no action plan rows", () => {
    const base = toSectionContext(fullFixture, {
      reportTitle: "Detailed Report",
      tier: "detailed",
    });
    const ctx: SectionContext = { ...base, actionPlanRows: [] };
    expect(ActionPlans(ctx)).toBeNull();
  });
});
