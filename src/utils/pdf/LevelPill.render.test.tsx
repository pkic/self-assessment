import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { LevelPill } from "./LevelPill";
import { getColorForLevel } from "./theme";
import { renderPdfText } from "../../test-utils/pdfText";

// Forbidden glyphs: the embedded Roboto subset can silently mis-map an arrow
// or triangle in a PDF text run, so no LevelPill label may ever contain one.
const FORBIDDEN_GLYPHS = /[→▲▼✓−]/;

type StyledElement = React.ReactElement & {
  props: {
    style: { backgroundColor?: string; color?: string };
    children: unknown;
  };
};

const callLevelPill = (level: number): StyledElement =>
  (LevelPill as (p: { level: number }) => React.ReactElement)({
    level,
  }) as StyledElement;

describe("LevelPill", () => {
  // (a) tree/component assertion — text extraction from a rendered PDF cannot
  // verify color, so this inspects the element tree @react-pdf/renderer would
  // otherwise receive: the returned <View> element's style (background) and
  // its nested <Text> element's style (foreground).
  describe("element tree styling", () => {
    it("uses the neutral palette for Not Assessed (level 0)", () => {
      const el = callLevelPill(0);
      expect(el.type).toBe(View);
      expect(el.props.style.backgroundColor).toBe("#eceff1");
      const textChild = el.props.children as StyledElement;
      expect(textChild.type).toBe(Text);
      expect(textChild.props.style.color).toBe("#5f6368");
    });

    it("uses the neutral palette for Not Applicable (level -1)", () => {
      const el = callLevelPill(-1);
      expect(el.props.style.backgroundColor).toBe("#eceff1");
      const textChild = el.props.children as StyledElement;
      expect(textChild.props.style.color).toBe("#5f6368");
    });

    it.each([1, 2, 3, 4, 5])(
      "uses getColorForLevel's background/text for level %i",
      (level) => {
        const el = callLevelPill(level);
        const expected = getColorForLevel(level);
        expect(el.props.style.backgroundColor).toBe(expected.background);
        const textChild = el.props.children as StyledElement;
        expect(textChild.props.style.color).toBe(expected.text);
      },
    );
  });

  // (b) real-render assertion — renders inside an actual <Document><Page>
  // through @react-pdf/renderer and extracts the resulting PDF's text layer,
  // pinning the exact labels and proving no forbidden glyph ever reaches a
  // PDF text run. All four representative pills are rendered in a single
  // Document/Page and a single renderPdfText call: pdf-parse's underlying
  // pdfjs has a documented-elsewhere-in-this-repo flakiness with repeated
  // real renders in one process, and a rounded+padded View (this component's
  // exact shape) can trigger it deterministically on a second separate parse
  // even though the underlying PDF bytes differ correctly — rendering once
  // and asserting every label against that one extraction sidesteps it.
  describe("real-render labels", () => {
    let txt: string;

    beforeAll(async () => {
      txt = await renderPdfText(
        <Document>
          <Page>
            <LevelPill level={2} variant="full" />
            <LevelPill level={0} variant="full" />
            <LevelPill level={-1} variant="full" />
            <LevelPill level={3} variant="number" />
          </Page>
        </Document>,
      );
    });

    it("renders the full label for a rated level", () => {
      expect(txt).toContain("2 - Foundational");
    });

    it("renders Not Assessed for level 0", () => {
      expect(txt).toContain("Not Assessed");
    });

    it("renders Not Applicable for level -1", () => {
      expect(txt).toContain("Not Applicable");
    });

    it("renders just the number for a rated level in number variant", () => {
      expect(txt).toContain("3");
      expect(txt).not.toContain("3 - Advanced");
    });

    it("never emits a forbidden glyph", () => {
      expect(txt).not.toMatch(FORBIDDEN_GLYPHS);
    });
  });
});
