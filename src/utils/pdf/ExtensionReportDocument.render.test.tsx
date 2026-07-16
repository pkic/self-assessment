import React from "react";
import { ExtensionPdfDocument } from "./ExtensionReportDocument";
import { renderPdfText } from "../../test-utils/pdfText";
import { TINY_PNG_DATA_URI } from "../../test-utils/reportFixtures";
import type { ExtensionData } from "../../types/types";
import type { RelevanceRow } from "../reportData";

const extension: ExtensionData = {
  extension: {
    id: "ext1",
    name: "Post-Quantum Readiness",
    version: "1.0.0",
    description: "",
  },
  relevance: { modules: [] },
  overlays: { modules: [] },
};

const longText =
  "This relevance category was reviewed in depth with the cryptography and " +
  "operations teams and cross-checked against the migration roadmap. ".repeat(
    40,
  );

const relevanceRows: RelevanceRow[] = [
  {
    key: "ext1.G.strategy",
    module: "Governance",
    category: "Strategy and vision",
    weight: 3,
    level: 3,
    label: "3 - Advanced",
    colorKey: 3,
    notes: "Short note.",
    evidence: "Short evidence.",
  },
  {
    key: "ext1.M.key-management",
    module: "Management",
    category: "Key management",
    weight: 2,
    level: 2,
    label: "2 - Foundational",
    colorKey: 2,
    notes: longText,
    evidence: longText,
  },
];

const baseProps = {
  chartImgData: TINY_PNG_DATA_URI,
  qrImgData: null,
  overallMaturityLevel: 2,
  overallWeightedMaturity: 2,
  floorScore: null,
  weightedScore: 2,
  moduleWeightedMaturityLevels: [{ module: "Governance", level: 3 }],
  detailRows: [],
  overlayRows: [],
  relevanceRows,
  extension,
  references: [],
  assessmentName: "Acme PQC review",
  assessorName: "J. Reviewer",
  useCaseDescription: "",
  assessmentUrl: "https://x.test/#p",
  version: "2.0.0",
};

describe("extension report real render — relevance notes/evidence", () => {
  it("renders short notes/evidence in the Relevance Details table", async () => {
    const txt = await renderPdfText(<ExtensionPdfDocument {...baseProps} />);
    expect(txt).toContain("Relevance Details");
    expect(txt).toContain("Notes");
    expect(txt).toContain("Short note.");
    expect(txt).toContain("Short evidence.");
  });

  it("renders a long note/evidence value without dropping it", async () => {
    const txt = await renderPdfText(<ExtensionPdfDocument {...baseProps} />);
    // A distinctive fragment from deep inside the long value proves it was
    // not clipped when flowed as a full-width TableTextRow.
    expect(txt).toContain("migration roadmap");
    // Glyph safety: none of the mis-mapped glyphs leak into the text layer.
    expect(txt).not.toMatch(/[→▲▼✓−]/);
  });
});
