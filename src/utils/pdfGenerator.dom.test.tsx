import React from "react";
import { render } from "@testing-library/react";
import {
  CategoryData,
  ExtensionData,
  ModuleData,
  PkiEnvironment,
  RequirementProgress,
} from "../types/types";

// --- Mock @react-pdf/renderer -------------------------------------------
// The pdf/* modules import a range of react-pdf primitives at module load
// time (Font.register, StyleSheet.create run eagerly in theme.ts). Stub
// each as a pass-through so the real ExtensionPdfDocument tree can still
// be constructed, without ever touching the real PDF renderer.
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
    Rect: passthrough("mock-rect"),
    Circle: passthrough("mock-circle"),
    Line: passthrough("mock-line"),
    Font: { register: jest.fn(), registerHyphenationCallback: jest.fn() },
    StyleSheet: { create: (styles: unknown) => styles },
    pdf: jest.fn(() => ({ toBlob: async () => new Blob() })),
  };
});

// qrcode is used inside src/utils/pdf/qr.ts via generateQRDataUrl.
jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn(async () => "data:image/png;base64,stub"),
  },
}));

// generateURL is the seam under test — assert exactly what it's called with.
const generateURLMock = jest.fn(
  (_input: { dataVersion: string; stateSchemaVersion: number }) =>
    "https://example.test/#progress=stub",
);
jest.mock("./urlGenerator", () => ({
  __esModule: true,
  generateURL: (...args: unknown[]) =>
    (generateURLMock as (...a: unknown[]) => string)(...args),
}));

// Imported after the mocks above so the mocked modules are in place before
// pdfGenerator (and its pdf/* dependencies) evaluate their module bodies.
import { pdf } from "@react-pdf/renderer";
import { exportExtensionPDF, exportToPDF } from "./pdfGenerator";
import { PdfDocument } from "./pdf/CoreReportDocument";
import { ReportDocument } from "./pdf/ReportDocument";
import {
  ATTESTATION_SECTIONS,
  ASSESSMENT_SECTIONS,
  DETAILED_SECTIONS,
} from "./pdf/sections/registry";
import type { SectionContext } from "./pdf/sections/SectionContext";
import { buildRequirementDetailRows } from "./reportData";

describe("exportExtensionPDF", () => {
  const coreModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [],
    },
  ];

  const extension: ExtensionData = {
    extension: {
      id: "ext-1",
      name: "Test Extension",
      version: "1.0.0",
      description: "",
    },
    relevance: { modules: [] },
  };

  beforeEach(() => {
    generateURLMock.mockClear();
    // exportExtensionPDF creates an object URL and triggers an anchor
    // download; jsdom doesn't implement createObjectURL/revokeObjectURL.
    URL.createObjectURL = jest.fn(() => "blob:stub");
    URL.revokeObjectURL = jest.fn();
  });

  it("stamps the loaded model version (not the widget version) as dataVersion, with stateSchemaVersion 1", async () => {
    await exportExtensionPDF({
      progress: {},
      extension,
      coreModules,
      assessmentName: "My Assessment",
      assessorName: "Jane Assessor",
      useCaseDescription: "Use case",
      version: "2.7.0-widget", // widget version — must NOT leak into dataVersion
      dataVersion: "2.0.0", // model/data version — must be what's stamped
      chartImgData: "data:image/png;base64,chart",
      requirementProgress: {},
    });

    expect(generateURLMock).toHaveBeenCalledTimes(1);
    const callArg = generateURLMock.mock.calls[0][0];
    expect(callArg.dataVersion).toBe("2.0.0");
    expect(callArg.stateSchemaVersion).toBe(1);
  });
});

describe("exportToPDF", () => {
  const modules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [],
    },
  ];

  const pkiEnvironment: PkiEnvironment = {};

  const emptyCompleteness = {
    total: 0,
    assessed: 0,
    notAssessed: 0,
    isIncomplete: false,
    perModule: [],
    requirements: { assessed: 0, totalInScope: 0 },
  };

  let chartElement: HTMLDivElement;

  beforeEach(() => {
    (pdf as jest.Mock).mockClear();
    // exportToPDF creates an object URL and triggers an anchor download;
    // jsdom doesn't implement createObjectURL/revokeObjectURL.
    URL.createObjectURL = jest.fn(() => "blob:stub");
    URL.revokeObjectURL = jest.fn();

    // exportToPDF reads a <canvas> out of the chart element to build the
    // embedded chart image; jsdom's canvas has no real toDataURL, so stub it.
    chartElement = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.toDataURL = jest.fn(() => "data:image/png;base64,chart");
    chartElement.appendChild(canvas);
  });

  it("renders ReportDocument with ASSESSMENT_SECTIONS for reportTier 'assessment' without throwing", async () => {
    await expect(
      exportToPDF({
        reportTier: "assessment",
        isTransient: false,
        progress: {},
        chartElement,
        overallMaturityLevel: 0,
        moduleMaturityLevels: [],
        modules,
        assessmentName: "My Assessment",
        assessorName: "Jane Assessor",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: {},
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "",
        targetDate: "",
        finishDate: "",
        pkiEnvironment,
        reportCompleteness: emptyCompleteness,
      }),
    ).resolves.not.toThrow();

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    expect(renderedElement.type).toBe(ReportDocument);
    expect(renderedElement.props.sections).toEqual(ASSESSMENT_SECTIONS);
    expect(renderedElement.props.ctx.reportTitle).toBe("Assessment Report");
    expect(renderedElement.props.ctx.showShareLink).toBe(false);
  });

  it("renders PdfDocument for reportTier 'self' with a category carrying notes, without throwing", async () => {
    const modulesWithCategory: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "cat-1",
            weight: 1,
            name: "Category 1",
            description: "",
            levels: [],
            requirements: [],
          },
        ],
      },
    ];

    await expect(
      exportToPDF({
        reportTier: "self",
        isTransient: false,
        progress: {
          "G.cat-1": {
            level: 2,
            result: "Foundational",
            description: "",
            applicability: true,
            notes: "Reviewed with the CISO on kickoff call.",
          },
        },
        chartElement,
        overallMaturityLevel: 2,
        moduleMaturityLevels: [{ module: "G", level: 2 }],
        modules: modulesWithCategory,
        assessmentName: "My Assessment",
        assessorName: "Jane Assessor",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: {},
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "",
        targetDate: "",
        finishDate: "",
        pkiEnvironment,
        reportCompleteness: emptyCompleteness,
      }),
    ).resolves.not.toThrow();

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    expect(renderedElement.type).toBe(PdfDocument);

    const { container } = render(renderedElement);
    expect(container.textContent).toContain(
      "Notes: Reviewed with the CISO on kickoff call.",
    );
  });

  it("renders ReportDocument with DETAILED_SECTIONS for reportTier 'detailed' without throwing, and shows a non-dead maturity level", async () => {
    await expect(
      exportToPDF({
        reportTier: "detailed",
        isTransient: false,
        progress: {},
        chartElement,
        overallMaturityLevel: 3,
        moduleMaturityLevels: [{ module: "G", level: 2 }],
        modules,
        assessmentName: "My Assessment",
        assessorName: "Jane Assessor",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: {},
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "",
        targetDate: "",
        finishDate: "",
        pkiEnvironment,
        reportCompleteness: emptyCompleteness,
      }),
    ).resolves.not.toThrow();

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    expect(renderedElement.type).toBe(ReportDocument);
    expect(renderedElement.props.sections).toEqual(DETAILED_SECTIONS);
    // The component receives the ctx (already asserted structurally by
    // exportToPDF's call graph), but the real bug this guards against is the
    // ctx being dead — accepted and then never rendered. Render the actual
    // element tree (through the @react-pdf/renderer passthrough mock) and
    // assert the overall level and per-module level both appear in the
    // output text, which only happens if the sections actually render them.
    expect(renderedElement.props.ctx.overallMaturityLevel).toBe(3);
    expect(renderedElement.props.ctx.moduleMaturityLevels).toEqual([
      { module: "G", level: 2 },
    ]);

    const { container } = render(renderedElement);
    expect(container.textContent).toContain("PKI Maturity Level: 3");
    expect(container.textContent).toContain("3 - Advanced");
    expect(container.textContent).toContain("G");
    expect(container.textContent).toContain("2 - Foundational");
  });

  it("threads comparison, action plans, and filter into the detailed document", async () => {
    const modulesWithRequirements: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "cat-1",
            weight: 1,
            name: "Category 1",
            description: "",
            levels: [],
            requirements: [
              {
                id: "r1",
                weight: 1,
                description: "Flagged requirement",
                guidance: "",
                assessment: "",
                references: [],
              },
              {
                id: "r2",
                weight: 1,
                description: "Unflagged requirement",
                guidance: "",
                assessment: "",
                references: [],
              },
            ] as CategoryData["requirements"],
          },
        ],
      },
    ];

    const requirementProgress: Record<string, RequirementProgress> = {
      "G.cat-1.r1": {
        level: 2,
        applicability: true,
        notes: "",
        evidence: "",
        flagged: true,
      },
      "G.cat-1.r2": {
        level: 3,
        applicability: true,
        notes: "",
        evidence: "",
        flagged: false,
      },
    };

    const firstCategoryKey = "G.cat-1";

    await exportToPDF({
      reportTier: "detailed",
      isTransient: false,
      progress: {},
      chartElement,
      overallMaturityLevel: 2,
      moduleMaturityLevels: [{ module: "G", level: 2 }],
      modules: modulesWithRequirements,
      assessmentName: "My Assessment",
      assessorName: "Jane Assessor",
      useCaseDescription: "Use case",
      assessmentUrl: "https://example.test/#progress=stub",
      version: "2.7.0-widget",
      dataVersion: "2.0.0",
      requirementProgress,
      organizationName: "",
      assessorCompany: "",
      assessorPosition: "",
      assessmentType: "",
      startDate: "",
      targetDate: "",
      finishDate: "",
      pkiEnvironment,
      reportCompleteness: emptyCompleteness,
      actionPlans: { categories: { [firstCategoryKey]: { targetLevel: 4 } } },
      comparison: {
        overall: { current: 2, baseline: 1, delta: 1, direction: "up" },
        modules: [],
        categories: [],
      },
      reconciliationRows: [],
      requirementFilter: { text: "", statuses: new Set(["flagged"]) },
    });

    expect(pdf).toHaveBeenCalledTimes(1);
    const element = (pdf as jest.Mock).mock.calls[0][0] as React.ReactElement<{
      ctx: SectionContext;
    }>;
    expect(element.props.ctx.comparison).toBeTruthy();
    expect(element.props.ctx.actionPlanRows.length).toBe(1);
    const rows = element.props.ctx.requirementDetailRows.flatMap((m) =>
      m.categories.flatMap((c) => c.rows),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.flagged)).toBe(true);
  });

  it("resolves workspace pocs into the action plan report's responsibility field", async () => {
    const modulesWithCategory: ModuleData[] = [
      {
        id: "G",
        name: "Governance",
        description: "",
        categories: [
          {
            id: "cat-1",
            weight: 1,
            name: "Category 1",
            description: "",
            levels: [],
            requirements: [],
          },
        ],
      },
    ];

    await exportToPDF({
      reportTier: "detailed",
      isTransient: false,
      progress: {},
      chartElement,
      overallMaturityLevel: 2,
      moduleMaturityLevels: [{ module: "G", level: 2 }],
      modules: modulesWithCategory,
      assessmentName: "My Assessment",
      assessorName: "Jane Assessor",
      useCaseDescription: "Use case",
      assessmentUrl: "https://example.test/#progress=stub",
      version: "2.7.0-widget",
      dataVersion: "2.0.0",
      requirementProgress: {},
      organizationName: "",
      assessorCompany: "",
      assessorPosition: "",
      assessmentType: "",
      startDate: "",
      targetDate: "",
      finishDate: "",
      pkiEnvironment,
      reportCompleteness: emptyCompleteness,
      actionPlans: {
        categories: {
          "G.cat-1": { targetLevel: 3, responsiblePocId: "poc1" },
        },
      },
      workspace: { pocs: [{ id: "poc1", name: "Jane Doe", role: "CISO" }] },
    });

    expect(pdf).toHaveBeenCalledTimes(1);
    const element = (pdf as jest.Mock).mock.calls[0][0] as React.ReactElement<{
      ctx: SectionContext;
    }>;
    expect(element.props.ctx.actionPlanRows[0].responsibility).toBe("Jane Doe");
  });

  it("renders ReportDocument with ATTESTATION_SECTIONS for reportTier 'attestation' without throwing", async () => {
    await expect(
      exportToPDF({
        reportTier: "attestation",
        isTransient: false,
        progress: {},
        chartElement,
        overallMaturityLevel: 0,
        moduleMaturityLevels: [],
        modules,
        assessmentName: "My Assessment",
        assessorName: "Jane Assessor",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: {},
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "",
        targetDate: "",
        finishDate: "",
        pkiEnvironment,
        reportCompleteness: emptyCompleteness,
      }),
    ).resolves.not.toThrow();

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    expect(renderedElement.type).toBe(ReportDocument);
    expect(renderedElement.props.sections).toEqual(ATTESTATION_SECTIONS);
    expect(renderedElement.props.ctx.reportTitle).toBe("Attestation Report");
    expect(renderedElement.props.ctx.timelineAlwaysShow).toBe(true);
  });

  it("renders the full identity + timeline + module bars for reportTier 'attestation' with complete metadata (no PKI environment section — attestation excludes it)", async () => {
    await exportToPDF({
      reportTier: "attestation",
      isTransient: false,
      progress: {},
      chartElement,
      overallMaturityLevel: 2,
      moduleMaturityLevels: [{ module: "Governance", level: 2 }],
      modules,
      assessmentName: "My Assessment",
      assessorName: "Jane Assessor",
      useCaseDescription: "Use case",
      assessmentUrl: "https://example.test/#progress=stub",
      version: "2.7.0-widget",
      dataVersion: "2.0.0",
      requirementProgress: {},
      organizationName: "Acme Corp",
      assessorCompany: "Acme Assessors LLC",
      assessorPosition: "internal",
      assessmentType: "formal",
      startDate: "2026-01-01",
      targetDate: "2026-06-01",
      finishDate: "2026-02-01",
      pkiEnvironment: { components: "Root CA plus two issuing CAs" },
      reportCompleteness: emptyCompleteness,
    });

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    expect(renderedElement.type).toBe(ReportDocument);

    const { container } = render(renderedElement);
    expect(container.textContent).toContain("Internal");
    expect(container.textContent).toContain("Timeline");
    expect(container.textContent).toContain("Module maturity");
    expect(container.textContent).toContain("Governance");
    // The Attestation tier deliberately excludes the PKI Environment section
    // (kept out of the tier's section list — see AttestationStatement.tsx).
    expect(container.textContent).not.toContain("PKI Environment");
  });

  it("renders 'Not specified' fallbacks for reportTier 'attestation' with empty metadata, without throwing", async () => {
    await expect(
      exportToPDF({
        reportTier: "attestation",
        isTransient: false,
        progress: {},
        chartElement,
        overallMaturityLevel: 0,
        moduleMaturityLevels: [],
        modules,
        assessmentName: "",
        assessorName: "",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: {},
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "",
        targetDate: "",
        finishDate: "",
        pkiEnvironment: {},
        reportCompleteness: emptyCompleteness,
      }),
    ).resolves.not.toThrow();

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    const { getAllByText } = render(renderedElement);
    expect(getAllByText(/Not specified/).length).toBeGreaterThan(0);
  });

  it("handles a large in-scope requirement set (76 requirements, ~2 KB notes each) without throwing", async () => {
    // 4 modules x 1 category x 19 requirements = 76 in-scope requirements,
    // each with a substantial notes payload, to exercise the detailed
    // report's per-requirement rendering at scale.
    const bigNotes = "x".repeat(2000);
    const moduleIds = ["G", "M", "O", "R"];
    const requirementsPerCategory = 19;

    const scaleModules: ModuleData[] = moduleIds.map((moduleId) => ({
      id: moduleId,
      name: `${moduleId} Module`,
      description: "",
      categories: [
        {
          id: "cat-1",
          weight: 1,
          name: "Category 1",
          description: "",
          levels: [],
          requirements: Array.from(
            { length: requirementsPerCategory },
            (_, i) => ({
              id: `r${i}`,
              weight: 1,
              description: `Requirement ${i}`,
              guidance: "",
              assessment: "",
              references: [],
            }),
          ) as CategoryData["requirements"],
        },
      ],
    }));

    const scaleRequirementProgress: Record<string, RequirementProgress> = {};
    for (const moduleId of moduleIds) {
      for (let i = 0; i < requirementsPerCategory; i++) {
        scaleRequirementProgress[`${moduleId}.cat-1.r${i}`] = {
          level: 3,
          applicability: true,
          notes: bigNotes,
          evidence: bigNotes,
        };
      }
    }

    const detailGroups = buildRequirementDetailRows({
      modules: scaleModules,
      progress: {},
      requirementProgress: scaleRequirementProgress,
    });
    const totalRows = detailGroups.reduce(
      (sum, group) =>
        sum +
        group.categories.reduce((catSum, cat) => catSum + cat.rows.length, 0),
      0,
    );
    expect(totalRows).toBe(76);

    await expect(
      exportToPDF({
        reportTier: "detailed",
        isTransient: false,
        progress: {},
        chartElement,
        overallMaturityLevel: 3,
        moduleMaturityLevels: [],
        modules: scaleModules,
        assessmentName: "Scale Assessment",
        assessorName: "Jane Assessor",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: scaleRequirementProgress,
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "",
        targetDate: "",
        finishDate: "",
        pkiEnvironment,
        reportCompleteness: emptyCompleteness,
      }),
    ).resolves.not.toThrow();

    expect(pdf).toHaveBeenCalledTimes(1);
    const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
    expect(renderedElement.type).toBe(ReportDocument);
    expect(renderedElement.props.ctx.requirementDetailRows).toHaveLength(4);
  });

  describe("Timeline + PKI Environment sections", () => {
    const tiers = ["assessment", "detailed", "self"] as const;
    const fullTiers = ["assessment", "detailed"] as const;

    it.each(tiers)(
      "renders no Timeline/PKI Environment section for reportTier '%s' when no dates or environment fields are set",
      async (reportTier) => {
        await exportToPDF({
          reportTier,
          isTransient: false,
          progress: {},
          chartElement,
          overallMaturityLevel: 0,
          moduleMaturityLevels: [],
          modules,
          assessmentName: "My Assessment",
          assessorName: "Jane Assessor",
          useCaseDescription: "Use case",
          assessmentUrl: "https://example.test/#progress=stub",
          version: "2.7.0-widget",
          dataVersion: "2.0.0",
          requirementProgress: {},
          organizationName: "",
          assessorCompany: "",
          assessorPosition: "",
          assessmentType: "",
          startDate: "",
          targetDate: "",
          finishDate: "",
          pkiEnvironment: {},
          reportCompleteness: emptyCompleteness,
        });

        expect(pdf).toHaveBeenCalledTimes(1);
        const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
        const { container } = render(renderedElement);
        expect(container.textContent).not.toContain("Timeline");
        expect(container.textContent).not.toContain("PKI Environment");
      },
    );

    it.each(fullTiers)(
      "renders Timeline + PKI Environment sections for reportTier '%s' when dates and environment fields are set",
      async (reportTier) => {
        await exportToPDF({
          reportTier,
          isTransient: false,
          progress: {},
          chartElement,
          overallMaturityLevel: 0,
          moduleMaturityLevels: [],
          modules,
          assessmentName: "My Assessment",
          assessorName: "Jane Assessor",
          useCaseDescription: "Use case",
          assessmentUrl: "https://example.test/#progress=stub",
          version: "2.7.0-widget",
          dataVersion: "2.0.0",
          requirementProgress: {},
          organizationName: "",
          assessorCompany: "",
          assessorPosition: "",
          assessmentType: "",
          startDate: "2026-01-01",
          targetDate: "2026-06-01",
          finishDate: "2026-01-11",
          pkiEnvironment: { components: "Root CA plus two issuing CAs" },
          reportCompleteness: emptyCompleteness,
        });

        expect(pdf).toHaveBeenCalledTimes(1);
        const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
        const { container } = render(renderedElement);
        expect(container.textContent).toContain("Timeline");
        expect(container.textContent).toContain("PKI Environment");
        expect(container.textContent).toContain("Components");
      },
    );

    it("renders no Timeline/PKI Environment section for reportTier 'self' even when dates and environment fields are set", async () => {
      await exportToPDF({
        reportTier: "self",
        isTransient: false,
        progress: {},
        chartElement,
        overallMaturityLevel: 0,
        moduleMaturityLevels: [],
        modules,
        assessmentName: "My Assessment",
        assessorName: "Jane Assessor",
        useCaseDescription: "Use case",
        assessmentUrl: "https://example.test/#progress=stub",
        version: "2.7.0-widget",
        dataVersion: "2.0.0",
        requirementProgress: {},
        organizationName: "",
        assessorCompany: "",
        assessorPosition: "",
        assessmentType: "",
        startDate: "2026-01-01",
        targetDate: "2026-06-01",
        finishDate: "2026-01-11",
        pkiEnvironment: { components: "Root CA plus two issuing CAs" },
        reportCompleteness: emptyCompleteness,
      });

      expect(pdf).toHaveBeenCalledTimes(1);
      const renderedElement = (pdf as jest.Mock).mock.calls[0][0];
      const { container } = render(renderedElement);
      expect(container.textContent).not.toContain("Timeline");
      expect(container.textContent).not.toContain("PKI Environment");
    });
  });
});
