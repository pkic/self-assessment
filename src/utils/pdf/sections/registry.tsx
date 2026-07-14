import { Cover } from "./Cover";
import { AttestationStatement } from "./AttestationStatement";
import { ModuleMaturityBars } from "./ModuleMaturityBars";
import { Timeline } from "./Timeline";
import { ScopeOverview } from "./ScopeOverview";
import { MaturityCharts } from "./MaturityCharts";
import { CompletenessSection } from "./CompletenessSection";
import { PkiEnvironmentTable } from "./PkiEnvironmentTable";
import { ReferencesAppendix } from "./ReferencesAppendix";
import { RequirementDetails } from "./RequirementDetails";
import { GapToNext } from "./GapToNext";
import { ComparisonToBaseline } from "./ComparisonToBaseline";
import { ActionPlans } from "./ActionPlans";
import { About } from "./About";
import type { SectionComponent, SectionKey } from "./SectionContext";

export type { SectionKey } from "./SectionContext";

// Matrix order every tier preset (and a Custom pick) is rendered in. The
// References appendix always sits LAST before About — after every content
// section that cites references — so it reads as a closing appendix rather
// than interrupting the requirement/gap/plan detail in the middle.
export const SECTION_ORDER: SectionKey[] = [
  "cover",
  "attestationStatement",
  "moduleMaturityBars",
  "timeline",
  "scopeOverview",
  "maturityCharts",
  "completeness",
  "pkiEnvironment",
  "requirementDetails",
  "gapToNext",
  "actionPlans",
  "comparison",
  "references",
  "about",
];

// Additive-subsequence tiers: ATTESTATION ⊂ ASSESSMENT ⊂ DETAILED. Each array
// below is exactly the prior tier's keys plus its own additions, spliced in
// at their SECTION_ORDER position (before "about").
export const ATTESTATION_SECTIONS: SectionKey[] = [
  "cover",
  "attestationStatement",
  "moduleMaturityBars",
  "timeline",
  "about",
];
export const ASSESSMENT_SECTIONS: SectionKey[] = [
  "cover",
  "attestationStatement",
  "moduleMaturityBars",
  "timeline",
  "scopeOverview",
  "maturityCharts",
  "completeness",
  "pkiEnvironment",
  "references",
  "about",
];
export const DETAILED_SECTIONS: SectionKey[] = [
  "cover",
  "attestationStatement",
  "moduleMaturityBars",
  "timeline",
  "scopeOverview",
  "maturityCharts",
  "completeness",
  "pkiEnvironment",
  "requirementDetails",
  "gapToNext",
  "actionPlans",
  "comparison",
  "references",
  "about",
];

// Sections long enough to warrant starting on a fresh page — ReportDocument
// (not the section itself) applies the break, and only when the section
// isn't the first one actually rendered (a break on the first body element
// produces a blank leading page in @react-pdf v4.5.1).
export const PAGE_BREAK_BEFORE: Set<SectionKey> = new Set([
  "maturityCharts",
  "references",
  "requirementDetails",
  "gapToNext",
  "actionPlans",
  "comparison",
  "about",
]);

export const TIER_SECTIONS: Record<
  "attestation" | "assessment" | "detailed",
  SectionKey[]
> = {
  attestation: ATTESTATION_SECTIONS,
  assessment: ASSESSMENT_SECTIONS,
  detailed: DETAILED_SECTIONS,
};

// Orders a tier preset, or a user-picked custom set, by SECTION_ORDER
// (unknown/duplicate keys in `custom` are ignored/deduped).
export const resolveSections = (
  tier: "attestation" | "assessment" | "detailed" | "custom",
  custom?: SectionKey[],
): SectionKey[] =>
  tier === "custom"
    ? SECTION_ORDER.filter((k) => (custom ?? []).includes(k))
    : TIER_SECTIONS[tier];

// --- section implementations --------------------------------------------
//
// Every SectionKey now maps to a real section component — "cover"
// (./Cover.tsx), "attestationStatement" (./AttestationStatement.tsx),
// "moduleMaturityBars" (./ModuleMaturityBars.tsx), "timeline" (./Timeline.tsx),
// "scopeOverview" (./ScopeOverview.tsx), "maturityCharts"
// (./MaturityCharts.tsx), "completeness" (./CompletenessSection.tsx),
// "pkiEnvironment" (./PkiEnvironmentTable.tsx), "references"
// (./ReferencesAppendix.tsx), "requirementDetails" (./RequirementDetails.tsx),
// "gapToNext" (./GapToNext.tsx), "actionPlans" (./ActionPlans.tsx),
// "comparison" (./ComparisonToBaseline.tsx), and "about" (./About.tsx) — the
// canonical "About PKI Maturity Model" page, shared with the self/extension
// reports via AboutPageBody (../AboutPage.tsx). exportToPDF's dispatcher
// renders every attestation/assessment/detailed/custom tier through this
// registry via ReportDocument; the old per-tier documents
// (AttestationReportDocument, AssessmentReportDocument, DetailedReportDocument)
// have been removed.

export const SECTION_REGISTRY: Record<SectionKey, SectionComponent> = {
  cover: Cover,
  attestationStatement: AttestationStatement,
  moduleMaturityBars: ModuleMaturityBars,
  timeline: Timeline,
  scopeOverview: ScopeOverview,
  maturityCharts: MaturityCharts,
  completeness: CompletenessSection,
  pkiEnvironment: PkiEnvironmentTable,
  references: ReferencesAppendix,
  requirementDetails: RequirementDetails,
  gapToNext: GapToNext,
  actionPlans: ActionPlans,
  comparison: ComparisonToBaseline,
  about: About,
};
