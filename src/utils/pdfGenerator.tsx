import { pdf } from "@react-pdf/renderer";
import React from "react";
import {
  ProgressData,
  ExtensionData,
  ModuleData,
  ReferenceEntry,
  RequirementProgress,
  PkiEnvironment,
  Workspace,
  ActionPlans,
} from "../types/types";
import "../index.module.scss";
import { generateURL } from "./urlGenerator";
import {
  calculateExtensionWeightedPKIMMScore,
  calculateExtensionFloorScore,
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
} from "./maturityCalculations";
import { generateQRDataUrl } from "./pdf/qr";
import { PdfDocument } from "./pdf/CoreReportDocument";
import { ExtensionPdfDocument } from "./pdf/ExtensionReportDocument";
import { ReportDocument } from "./pdf/ReportDocument";
import { assertValidReportComposition } from "./pdf/validateComposition";
import { resolveSections, type SectionKey } from "./pdf/sections/registry";
import type { SectionContext } from "./pdf/sections/SectionContext";
import {
  buildReportData,
  buildLevelDistribution,
  buildScopeExclusions,
  buildScopeCoverage,
  buildRequirementDetailRows,
  buildGapToNextLevel,
  buildActionPlanRows,
  type ReportCompleteness,
} from "./reportData";
import type { ComparisonResult, ReconciliationRow } from "./comparison";
import type { RequirementFilterState } from "./requirementFilter";

export interface ExportPdfOptions {
  reportTier: "self" | "attestation" | "assessment" | "detailed" | "custom";
  sections?: SectionKey[];
  isTransient: boolean;
  progress: Record<string, ProgressData>;
  chartElement: HTMLElement;
  overallMaturityLevel: number;
  moduleMaturityLevels: { module: string; level: number }[];
  modules: ModuleData[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  assessmentUrl: string;
  version: string;
  dataVersion: string;
  references?: ReferenceEntry[];
  requirementProgress?: Record<string, RequirementProgress>;
  organizationName: string;
  assessorCompany: string;
  assessorPosition: "" | "internal" | "external";
  assessmentType: "" | "self" | "formal" | "third-party";
  startDate: string;
  targetDate: string;
  finishDate: string;
  pkiEnvironment: PkiEnvironment;
  reportCompleteness: ReportCompleteness;
  workspace?: Workspace;
  actionPlans?: ActionPlans;
  comparison?: ComparisonResult | null;
  reconciliationRows?: ReconciliationRow[];
  comparisonBaselineName?: string;
  comparisonBaselineDate?: string;
  requirementFilter?: RequirementFilterState;
}

export const exportToPDF = async (opts: ExportPdfOptions) => {
  const {
    progress,
    chartElement,
    overallMaturityLevel,
    moduleMaturityLevels,
    modules,
    assessmentName,
    assessorName,
    useCaseDescription,
    assessmentUrl,
    version,
    dataVersion,
    references = [],
    requirementProgress = {},
    assessmentType,
    organizationName,
    assessorCompany,
    assessorPosition,
    startDate,
    targetDate,
    finishDate,
    pkiEnvironment,
    reportCompleteness,
  } = opts;

  const chartCanvas = chartElement.querySelector("canvas") as HTMLCanvasElement;
  const chartImgData = chartCanvas.toDataURL("image/png");
  const qrImgData = await generateQRDataUrl(assessmentUrl);

  const reportData = buildReportData({
    modules,
    progress,
    requirementProgress,
  });

  if (opts.reportTier === "self") {
    const pdfDoc = (
      <PdfDocument
        chartImgData={chartImgData}
        qrImgData={qrImgData}
        overallMaturityLevel={overallMaturityLevel}
        moduleMaturityLevels={moduleMaturityLevels}
        detailRows={reportData.detailRows}
        references={references}
        assessmentName={assessmentName}
        assessorName={assessorName}
        useCaseDescription={useCaseDescription}
        assessmentUrl={assessmentUrl}
        version={version}
      />
    );

    const pdfBlob = await pdf(pdfDoc).toBlob();

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PKIMM-self-assessment-report.pdf";
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Attestation / Assessment / Detailed / Custom: one shared pipeline, built
  // once and rendered through ReportDocument against a single SectionContext.
  const tier = opts.reportTier;

  const distribution = buildLevelDistribution({
    modules,
    progress,
    requirementProgress,
  });
  const exclusions = buildScopeExclusions({
    modules,
    progress,
    requirementProgress,
  });
  const coverage = buildScopeCoverage({
    modules,
    progress,
    requirementProgress,
  });
  const requirementDetailRows = buildRequirementDetailRows({
    modules,
    progress,
    requirementProgress,
    filter: opts.requirementFilter,
  });
  const gapRows = buildGapToNextLevel({
    modules,
    progress,
    requirementProgress,
  });
  const actionPlanRows = buildActionPlanRows({
    modules,
    progress,
    requirementProgress,
    actionPlans: opts.actionPlans,
    pocs: opts.workspace?.pocs,
  });

  const reportTitle =
    tier === "attestation"
      ? "Attestation Report"
      : tier === "assessment"
        ? "Assessment Report"
        : tier === "detailed"
          ? "Detailed Report"
          : "Custom Report";
  const sections = resolveSections(tier, opts.sections);
  assertValidReportComposition(sections);

  const ctx: SectionContext = {
    reportTitle,
    showShareLink: false,
    qrImgData,
    assessmentUrl,
    assessmentName,
    assessorName,
    useCaseDescription,
    organizationName,
    assessorCompany,
    assessorPosition,
    assessmentType,
    startDate,
    targetDate,
    finishDate,
    timelineAlwaysShow: tier === "attestation",
    overallMaturityLevel,
    moduleMaturityLevels,
    reportData,
    distribution,
    exclusions,
    coverage,
    reportCompleteness,
    references,
    requirementDetailRows,
    requirementFilter: opts.requirementFilter,
    gapRows,
    comparison: opts.comparison ?? null,
    reconciliationRows: opts.reconciliationRows ?? [],
    comparisonBaselineName: opts.comparisonBaselineName,
    comparisonBaselineDate: opts.comparisonBaselineDate,
    actionPlanRows,
    pkiEnvironment,
    chartImgData,
    version,
    dataVersion,
    modules,
    progress,
    requirementProgress,
  };

  const pdfDoc = <ReportDocument ctx={ctx} sections={sections} />;

  const pdfBlob = await pdf(pdfDoc).toBlob();

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PKIMM-${tier}-report.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

interface ExportExtensionPDFOptions {
  progress: Record<string, ProgressData>;
  extension: ExtensionData;
  coreModules: ModuleData[];
  references?: ReferenceEntry[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  version: string;
  dataVersion: string;
  chartImgData: string;
  requirementProgress?: Record<string, RequirementProgress>;
}

export const exportExtensionPDF = async ({
  progress,
  extension,
  coreModules,
  references = [],
  assessmentName,
  assessorName,
  useCaseDescription,
  version,
  dataVersion,
  chartImgData,
  requirementProgress,
}: ExportExtensionPDFOptions) => {
  const extId = extension.extension.id;

  const reportData = buildReportData({
    progress,
    modules: coreModules,
    activeExtension: extension,
    requirementProgress,
  });

  const overallMaturityLevel = calculateOverallMaturityLevel(
    coreModules,
    progress,
    [],
    [],
    requirementProgress,
  );

  const overallWeightedMaturity = calculateOverallMaturityLevel(
    coreModules,
    progress,
    [extension],
    [extId],
    requirementProgress,
  );

  const moduleWeightedMaturityLevels = calculateModuleMaturityLevels(
    coreModules,
    progress,
    [extension],
    [extId],
    requirementProgress,
  );

  const floorScore = calculateExtensionFloorScore(
    coreModules,
    extension,
    progress,
    requirementProgress,
  );

  const weightedScore = calculateExtensionWeightedPKIMMScore(
    coreModules,
    progress,
    extension,
    requirementProgress,
  );

  const assessmentUrl = generateURL({
    progress,
    enabledExtensions: [{ id: extId, version: "0.0.0" }],
    dataVersion,
    stateSchemaVersion: 1,
    assessmentName,
    assessorName,
    useCaseDescription,
    modules: coreModules,
    requirementProgress,
  });

  const qrImgData = await generateQRDataUrl(assessmentUrl);

  const pdfDoc = (
    <ExtensionPdfDocument
      chartImgData={chartImgData}
      qrImgData={qrImgData}
      overallMaturityLevel={overallMaturityLevel}
      overallWeightedMaturity={overallWeightedMaturity}
      floorScore={floorScore}
      weightedScore={weightedScore}
      moduleWeightedMaturityLevels={moduleWeightedMaturityLevels}
      detailRows={reportData.detailRows}
      overlayRows={reportData.overlayRows}
      relevanceRows={reportData.relevanceRows}
      extension={extension}
      references={references}
      assessmentName={assessmentName}
      assessorName={assessorName}
      useCaseDescription={useCaseDescription}
      assessmentUrl={assessmentUrl}
      version={version}
    />
  );

  const pdfBlob = await pdf(pdfDoc).toBlob();

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${extension.extension.id}-PKIMM-self-assessment-report.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
