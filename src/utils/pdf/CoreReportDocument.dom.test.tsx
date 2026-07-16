import React from "react";

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
    Circle: passthrough("mock-circle"),
    Line: passthrough("mock-line"),
    Font: { register: jest.fn(), registerHyphenationCallback: jest.fn() },
    StyleSheet: { create: (styles: unknown) => styles },
    pdf: jest.fn(() => ({ toBlob: async () => new Blob() })),
  };
});

import { PdfDocument, PdfDocumentProps } from "./CoreReportDocument";
import { MaturityBars } from "./charts/MaturityBars";
import { DistributionStackedBars } from "./charts/DistributionStackedBars";
import { CompletenessRings } from "./charts/CompletenessRings";

// Walks the (unrendered) React element tree produced by calling the document
// component directly, collecting every element whose `type` matches the
// given component reference. Because the tree is never actually rendered
// (no ReactDOM/react-test-renderer involved), nested function components are
// never invoked — so this finds `<MaturityBars .../>` etc. as plain element
// nodes without needing to mock any @react-pdf primitive they use internally.
const findElementsByType = (
  node: unknown,
  type: unknown,
): React.ReactElement<Record<string, unknown>>[] => {
  const found: React.ReactElement<Record<string, unknown>>[] = [];
  const visit = (n: unknown): void => {
    if (n === null || n === undefined || typeof n !== "object") return;
    if (Array.isArray(n)) return void n.forEach(visit);
    if (!React.isValidElement(n)) return;
    const el = n as React.ReactElement<Record<string, unknown>>;
    if (el.type === type) found.push(el);
    if (el.props && el.props.children) visit(el.props.children);
  };
  visit(node);
  return found;
};

const baseProps: PdfDocumentProps = {
  chartImgData: "data:image/png;base64,chart",
  qrImgData: null,
  overallMaturityLevel: 2,
  moduleMaturityLevels: [{ module: "G", level: 2 }],
  detailRows: [],
  references: [],
  assessmentName: "A",
  assessorName: "B",
  useCaseDescription: "",
  assessmentUrl: "https://x.test/#p",
  version: "2.0.0",
};

describe("CoreReportDocument (self tier) chart composition", () => {
  it("renders exactly one MaturityBars and no stacked bars / rings", () => {
    const tree = (PdfDocument as (p: PdfDocumentProps) => React.ReactNode)(
      baseProps,
    );

    expect(findElementsByType(tree, MaturityBars)).toHaveLength(1);
    expect(findElementsByType(tree, DistributionStackedBars)).toHaveLength(0);
    expect(findElementsByType(tree, CompletenessRings)).toHaveLength(0);
  });

  it("passes moduleMaturityLevels through to the single MaturityBars instance", () => {
    const tree = (PdfDocument as (p: PdfDocumentProps) => React.ReactNode)(
      baseProps,
    );

    const bars = findElementsByType(tree, MaturityBars);
    expect(bars[0].props.moduleMaturityLevels).toEqual([
      { module: "G", level: 2 },
    ]);
  });
});
