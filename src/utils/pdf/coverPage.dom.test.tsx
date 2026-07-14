import React from "react";

// The pdf/* modules import a range of react-pdf primitives at module load
// time (Font.register, StyleSheet.create run eagerly in theme.ts). Stub each
// as a pass-through so the real document trees can still be constructed,
// without ever touching the real PDF renderer. Mirrors the mock already used
// in ../pdfGenerator.dom.test.tsx.
jest.mock("@react-pdf/renderer", () => {
  const passthrough =
    (name: string) =>
    ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(name, props, children);

  return {
    __esModule: true,
    Document: passthrough("mock-document"),
    Page: passthrough("mock-page"),
    View: passthrough("mock-view"),
    Text: passthrough("mock-text"),
    Image: passthrough("mock-image"),
    Link: passthrough("mock-link"),
    Svg: passthrough("mock-svg"),
    Path: passthrough("mock-path"),
    G: passthrough("mock-g"),
    Font: { register: jest.fn(), registerHyphenationCallback: jest.fn() },
    StyleSheet: { create: (styles: unknown) => styles },
    pdf: jest.fn(() => ({ toBlob: async () => new Blob() })),
  };
});

import { Text } from "@react-pdf/renderer";
import { CoverPage } from "./primitives";
import { ReportDocument } from "./ReportDocument";
import { ATTESTATION_SECTIONS } from "./sections/registry";
import { fullFixture, toSectionContext } from "../../test-utils/reportFixtures";

// Walks a React element tree (as produced by calling a function component
// directly, without a renderer) and returns every element whose type matches
// the given component.
const findElementsByType = (
  node: unknown,
  type: unknown,
): React.ReactElement<Record<string, unknown>>[] => {
  const found: React.ReactElement<Record<string, unknown>>[] = [];

  const visit = (n: unknown): void => {
    if (n === null || n === undefined || typeof n !== "object") {
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (!React.isValidElement(n)) {
      return;
    }
    const element = n as React.ReactElement<Record<string, unknown>>;
    if (element.type === type) {
      found.push(element);
    }
    if (element.props && element.props.children) {
      visit(element.props.children);
    }
  };

  visit(node);
  return found;
};

describe("CoverPage reportTitle", () => {
  it("renders the given reportTitle and never the hardcoded self-assessment headline", () => {
    const element = (
      <CoverPage
        version="2.0.0"
        reportTitle="Attestation Report"
        qrImgData={null}
      />
    );

    const rendered = CoverPage(element.props);
    const texts = findElementsByType(rendered, Text);
    const textContents = texts.map((t) => t.props.children);

    expect(textContents).toContain("Attestation Report");
    expect(textContents).not.toContain("Self-Assessment Report");
  });
});

describe("ReportDocument cover (attestation tier)", () => {
  const ctx = toSectionContext(fullFixture, {
    reportTitle: "Attestation Report",
    tier: "attestation",
  });

  it("passes reportTitle='Attestation Report' to CoverPage, not the generic self-assessment title", () => {
    const rendered = ReportDocument({ ctx, sections: ATTESTATION_SECTIONS });
    const covers = findElementsByType(rendered, CoverPage);

    expect(covers).toHaveLength(1);
    expect(covers[0].props.reportTitle).toBe("Attestation Report");
    expect(covers[0].props.reportTitle).not.toBe("Self-Assessment Report");
  });
});
