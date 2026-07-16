import type { ReactElement } from "react";
import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
  ReferenceEntry,
  PkiEnvironment,
} from "../../../types/types";
import type {
  buildReportData,
  buildLevelDistribution,
  buildScopeExclusions,
  buildScopeCoverage,
  buildRequirementDetailRows,
  buildGapToNextLevel,
  buildActionPlanRows,
  ReportCompleteness,
} from "../../reportData";
import type { ComparisonResult, ReconciliationRow } from "../../comparison";
import type { RequirementFilterState } from "../../requirementFilter";

// The additive tier "recipes" (Attestation ⊂ Assessment ⊂ Detailed) plus a
// user-picked Custom set are all just ordered arrays of these keys — see
// registry.tsx.
export type SectionKey =
  | "cover"
  | "attestationStatement"
  | "moduleMaturityBars"
  | "timeline"
  | "scopeOverview"
  | "maturityCharts"
  | "completeness"
  | "pkiEnvironment"
  | "references"
  | "requirementDetails"
  | "gapToNext"
  | "comparison"
  | "actionPlans"
  | "about";

// Everything any section might need to render, built once by exportToPDF and
// passed unchanged to every section in the picked set. Sections read only
// the slice they care about; none of them mutate this.
export interface SectionContext {
  reportTitle: string; // e.g. "Attestation Report"
  showShareLink: boolean; // false for every tier this registry renders (self/quick keeps its own report)
  qrImgData: string | null;
  assessmentUrl: string;
  // identity
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  organizationName: string;
  assessorCompany: string;
  assessorPosition: "" | "internal" | "external";
  assessmentType: "" | "self" | "formal" | "third-party";
  // timing
  startDate: string;
  targetDate: string;
  finishDate: string;
  timelineAlwaysShow: boolean; // true only for attestation
  // scores + derived report data
  overallMaturityLevel: number;
  moduleMaturityLevels: { module: string; level: number }[];
  reportData: ReturnType<typeof buildReportData>;
  distribution: ReturnType<typeof buildLevelDistribution>;
  exclusions: ReturnType<typeof buildScopeExclusions>;
  coverage: ReturnType<typeof buildScopeCoverage>;
  reportCompleteness: ReportCompleteness;
  references: ReferenceEntry[];
  requirementDetailRows: ReturnType<typeof buildRequirementDetailRows>;
  requirementFilter?: RequirementFilterState;
  gapRows: ReturnType<typeof buildGapToNextLevel>;
  actionPlanRows: ReturnType<typeof buildActionPlanRows>;
  comparison: ComparisonResult | null;
  reconciliationRows: ReconciliationRow[];
  comparisonBaselineName?: string;
  comparisonBaselineDate?: string;
  pkiEnvironment: PkiEnvironment;
  chartImgData: string; // radar cover PNG
  version: string;
  dataVersion: string;
  // raw (some sections recompute per-module/category)
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
}

// SYNC, PURE, hook-free — ReportDocument invokes it as a plain function so it
// can filter out nulls before deciding page breaks. Do NOT type a section as
// React.FC (React 19's FC permits async/ReactNode returns, which would defeat
// that null-filtering). "cover" is the only section that returns its own
// <Page>; every other section returns flowing content (View/fragment) or
// null when it has nothing to show.
export type SectionComponent = (ctx: SectionContext) => ReactElement | null;
