import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import {
  DeltaIndicator,
  DeltaTriangle,
  UP_COLOR,
  DOWN_COLOR,
} from "./DeltaIndicator";
import { renderPdfText } from "../../test-utils/pdfText";
import type { Delta } from "../comparison";

// Forbidden glyphs: the embedded Roboto subset can silently mis-map an arrow,
// triangle, or checkmark in a PDF text run — DeltaIndicator draws its arrows
// as Svg/Polygon shapes instead of any of these characters.
const FORBIDDEN_GLYPHS = /[→▲▼✓−]/;

const up: Delta = { current: 3, baseline: 1, delta: 2, direction: "up" };
const down: Delta = { current: 1, baseline: 3, delta: -2, direction: "down" };
const same: Delta = { current: 2, baseline: 2, delta: 0, direction: "same" };
const notApplicable: Delta = {
  current: -1,
  baseline: 2,
  delta: 0,
  direction: "same",
};
const newlyRated: Delta = {
  current: 2,
  baseline: -1,
  delta: 0,
  direction: "same",
};

type StyledElement = React.ReactElement & {
  props: {
    style?: { color?: string };
    children?: React.ReactNode;
    direction?: "up" | "down";
    color?: string;
  };
};

const callDeltaIndicator = (d: Delta): StyledElement =>
  (DeltaIndicator as (p: { d: Delta }) => React.ReactElement)({
    d,
  }) as StyledElement;

describe("DeltaIndicator", () => {
  // (a) tree/component assertion — text extraction from a rendered PDF
  // cannot verify color, so this inspects the element tree
  // @react-pdf/renderer would otherwise receive.
  describe("element tree", () => {
    it("renders a green up triangle plus a +N label for an upward delta", () => {
      const el = callDeltaIndicator(up);
      const [triangle, label] = React.Children.toArray(
        el.props.children,
      ) as StyledElement[];

      expect(triangle.type).toBe(DeltaTriangle);
      expect(triangle.props.direction).toBe("up");
      expect(triangle.props.color).toBe(UP_COLOR);

      expect(label.type).toBe(Text);
      expect(label.props.children).toBe("+2");
      expect(label.props.style?.color).toBe(UP_COLOR);
    });

    it("renders a red down triangle plus a negative label for a downward delta", () => {
      const el = callDeltaIndicator(down);
      const [triangle, label] = React.Children.toArray(
        el.props.children,
      ) as StyledElement[];

      expect(triangle.type).toBe(DeltaTriangle);
      expect(triangle.props.direction).toBe("down");
      expect(triangle.props.color).toBe(DOWN_COLOR);

      expect(label.props.children).toBe("-2");
      expect(label.props.style?.color).toBe(DOWN_COLOR);
    });

    it("renders an em-dash 'no change' label and no triangle for an unchanged delta", () => {
      const el = callDeltaIndicator(same);
      const children = React.Children.toArray(el.props.children);
      expect(children).toHaveLength(1);
      expect((children[0] as StyledElement).type).toBe(Text);
      expect((children[0] as StyledElement).props.children).toBe("— no change");
    });

    it("renders 'n/a' / '— new' labels and no triangle when either side is Not Applicable", () => {
      const naChildren = React.Children.toArray(
        callDeltaIndicator(notApplicable).props.children,
      );
      const newChildren = React.Children.toArray(
        callDeltaIndicator(newlyRated).props.children,
      );
      expect(
        naChildren.some((c) => (c as StyledElement).type === DeltaTriangle),
      ).toBe(false);
      expect(
        newChildren.some((c) => (c as StyledElement).type === DeltaTriangle),
      ).toBe(false);
      // Pin the actual label strings (element-tree, since a real render can't
      // distinguish these no-triangle cases from each other by number alone).
      expect((naChildren[0] as StyledElement).props.children).toBe("n/a");
      expect((newChildren[0] as StyledElement).props.children).toBe("— new");
    });
  });

  // (b) real-render assertion — renders inside a single actual <Document>/
  // <Page> and extracts the resulting PDF's text layer, proving the signed
  // numbers survive a real render with no forbidden glyph. Only the two
  // Svg-bearing cases (up/down) go through this real render; the no-triangle
  // cases (same / Not Applicable / new) have their exact label strings pinned
  // by the element-tree assertions above, and "— no change" is additionally
  // exercised end-to-end by the ComparisonToBaseline legend real-render. (This
  // suite keeps the real render to Svg-bearing indicators only: mixing an
  // Svg-bearing and a plain-Text indicator on one bare page has tripped
  // pdf-parse's bundled pdfjs under this harness, though the PDF bytes are
  // valid outside Jest.)
  describe("real-render labels", () => {
    let txt: string;

    beforeAll(async () => {
      txt = await renderPdfText(
        <Document>
          <Page>
            <DeltaIndicator d={up} />
            <DeltaIndicator d={down} />
          </Page>
        </Document>,
      );
    });

    it("renders the signed numbers for up/down deltas", () => {
      expect(txt).toContain("+2");
      expect(txt).toContain("-2");
    });

    it("never emits a forbidden glyph", () => {
      expect(txt).not.toMatch(FORBIDDEN_GLYPHS);
    });
  });
});
