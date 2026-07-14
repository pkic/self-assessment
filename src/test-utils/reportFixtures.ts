import type {
  AssessmentData,
  Assessment,
  ModuleData,
  ProgressData,
  RequirementProgress,
  ReferenceEntry,
  ReferencesCatalog,
  PkiEnvironment,
  ActionPlans,
} from "../types/types";
import {
  getBundledModelYaml,
  DEFAULT_MODEL_VERSION,
  BUNDLED_REFERENCES_YAML,
} from "../defaults/bundledData";
import { yamlParser } from "../utils/yamlParser";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
} from "../utils/maturityCalculations";
import {
  buildReportData,
  buildReportCompleteness,
  buildLevelDistribution,
  buildScopeExclusions,
  buildScopeCoverage,
  buildRequirementDetailRows,
  buildGapToNextLevel,
  buildActionPlanRows,
} from "../utils/reportData";
import {
  alignBaseline,
  buildComparison,
  buildActionPlanReconciliation,
  type ComparisonResult,
  type ReconciliationRow,
} from "../utils/comparison";
import type { RequirementFilterState } from "../utils/requirementFilter";
import type { PdfDocumentProps } from "../utils/pdf/CoreReportDocument";
import type { SectionContext } from "../utils/pdf/sections/SectionContext";
import { APP_VERSION } from "../version";

// Real modules from the bundled 2.0.0 model — every fixture below walks this
// actual module/category/requirement structure rather than a hand-stubbed
// shape, so tests exercise the real shape of the shipped model (16 categories
// across 4 modules, 76 requirements at the time this was written).
const bundledModelYaml = getBundledModelYaml(DEFAULT_MODEL_VERSION);
if (!bundledModelYaml) {
  throw new Error(
    `reportFixtures: no bundled model YAML for version ${DEFAULT_MODEL_VERSION}`,
  );
}
const modelData = yamlParser(bundledModelYaml) as AssessmentData;
export const fixtureModules: ModuleData[] = modelData.modules;

const bundledReferences = (
  yamlParser(BUNDLED_REFERENCES_YAML) as ReferencesCatalog
).references;

// A tiny (1x1 transparent) valid PNG data URI — enough to exercise the
// <Image> chart slot in a real render without needing an actual chart canvas.
export const TINY_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export interface ReportFixture {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress?: Record<string, RequirementProgress>;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  organizationName: string;
  assessorCompany: string;
  assessorPosition: "" | "internal" | "external";
  assessmentType: "" | "self" | "formal" | "third-party";
  startDate: string;
  targetDate: string;
  finishDate: string;
  pkiEnvironment: PkiEnvironment;
  references: ReferenceEntry[];
  dataVersion: string;
  comparison?: ComparisonResult | null;
  reconciliationRows?: ReconciliationRow[];
  comparisonBaselineName?: string;
  comparisonBaselineDate?: string;
  // The CURRENT assessment's own action plans (distinct from the comparison
  // baseline's, which buildFullComparison sets up separately) — carried so
  // toSectionContext can exercise the real buildActionPlanRows wiring rather
  // than always passing actionPlans: undefined.
  actionPlans?: ActionPlans;
  pocs?: { id: string; name: string; role?: string }[];
}

const allCategories = fixtureModules.flatMap((m) =>
  m.categories.map((c) => ({ moduleId: m.id, category: c })),
);

const allRequirements = allCategories.flatMap(({ moduleId, category }) =>
  (category.requirements ?? []).map((r) => ({
    moduleId,
    categoryId: category.id,
    requirement: r,
  })),
);

// Deterministic 1..5 cycle so every fixture uses every level at least once
// without hand-picking specific category/requirement ids (which would drift
// the moment the bundled model YAML changes).
const cycleLevel = (i: number): number => (i % 5) + 1;

const emptyProgressEntry = (): ProgressData => ({
  level: 0,
  result: "Not Assessed",
  description: "",
  applicability: true,
});

const ratedProgressEntry = (level: number): ProgressData => ({
  level,
  result: `${level} - Level ${level}`,
  description: "",
  applicability: true,
});

const buildEmptyProgress = (): Record<string, ProgressData> => {
  const progress: Record<string, ProgressData> = {};
  for (const { moduleId, category } of allCategories) {
    progress[`${moduleId}.${category.id}`] = emptyProgressEntry();
  }
  return progress;
};

const mkRequirementProgress = (
  level: number,
  overrides: Partial<RequirementProgress> = {},
): RequirementProgress => ({
  level,
  applicability: true,
  notes: "",
  evidence: "",
  ...overrides,
});

// --- empty: a brand-new, untouched assessment --------------------------

export const emptyFixture: ReportFixture = {
  modules: fixtureModules,
  progress: buildEmptyProgress(),
  requirementProgress: {},
  assessmentName: "",
  assessorName: "",
  useCaseDescription: "",
  organizationName: "",
  assessorCompany: "",
  assessorPosition: "",
  assessmentType: "",
  startDate: "",
  targetDate: "",
  finishDate: "",
  pkiEnvironment: {},
  references: [],
  dataVersion: DEFAULT_MODEL_VERSION,
};

// --- partial: a mix of self-declared ratings, one N/A, one untouched, and a
// handful of requirement-level entries so the completeness grain flips to
// "requirement" for the categories that have them ----------------------

const buildPartialProgress = (): Record<string, ProgressData> => {
  const progress = buildEmptyProgress();
  const last = allCategories.length - 1;
  const secondLast = allCategories.length - 2;
  allCategories.forEach(({ moduleId, category }, i) => {
    const key = `${moduleId}.${category.id}`;
    if (i === last) {
      // One category explicitly out of scope.
      progress[key] = {
        ...emptyProgressEntry(),
        applicability: false,
        applicabilityReason: "Out of scope for this review cycle.",
      };
    } else if (i === secondLast) {
      // One category deliberately left untouched (Not Assessed).
      progress[key] = emptyProgressEntry();
    } else {
      progress[key] = ratedProgressEntry(cycleLevel(i));
    }
  });
  return progress;
};

const buildPartialRequirementProgress = (): Record<
  string,
  RequirementProgress
> => {
  // A few requirement entries on the first category only — enough to flip
  // buildLevelDistribution's grain to "requirement" without rating every
  // requirement in the model.
  const first = allCategories[0];
  const reqs = (first.category.requirements ?? []).slice(0, 3);
  const requirementProgress: Record<string, RequirementProgress> = {};
  reqs.forEach((r, i) => {
    requirementProgress[`${first.moduleId}.${first.category.id}.${r.id}`] =
      mkRequirementProgress(cycleLevel(i), {
        notes: `Rationale for ${r.id}.`,
        evidence: `Evidence reviewed for ${r.id}.`,
      });
  });
  return requirementProgress;
};

export const partialFixture: ReportFixture = {
  modules: fixtureModules,
  progress: buildPartialProgress(),
  requirementProgress: buildPartialRequirementProgress(),
  assessmentName: "Partial self-review",
  assessorName: "A. Assessor",
  useCaseDescription: "Mid-cycle checkpoint.",
  organizationName: "",
  assessorCompany: "",
  assessorPosition: "",
  assessmentType: "",
  startDate: "2026-01-15",
  targetDate: "",
  finishDate: "",
  pkiEnvironment: {},
  references: bundledReferences.slice(0, 2),
  dataVersion: DEFAULT_MODEL_VERSION,
};

// --- full: every category and every requirement rated, every scalar filled,
// a full PKI environment (with a long value to exercise wrapping), several
// references, and a comparison against a deliberately lower-scored baseline

const buildFullProgress = (): Record<string, ProgressData> => {
  const progress: Record<string, ProgressData> = {};
  allCategories.forEach(({ moduleId, category }, i) => {
    progress[`${moduleId}.${category.id}`] = {
      ...ratedProgressEntry(cycleLevel(i)),
      notes: `Notes for ${category.name}.`,
    };
  });
  return progress;
};

const buildFullRequirementProgress = (): Record<
  string,
  RequirementProgress
> => {
  const requirementProgress: Record<string, RequirementProgress> = {};
  allRequirements.forEach(({ moduleId, categoryId, requirement }, i) => {
    requirementProgress[`${moduleId}.${categoryId}.${requirement.id}`] =
      mkRequirementProgress(cycleLevel(i), {
        notes: `Rationale for ${requirement.id}.`,
        evidence: `Evidence for ${requirement.id}.`,
        completed: i % 3 !== 0,
        flagged: i % 7 === 0,
      });
  });
  return requirementProgress;
};

const LONG_PKI_ENVIRONMENT_VALUE =
  "The production PKI environment spans three tiers: an offline air-gapped " +
  "root CA held in a hardware security module inside a controlled vault, an " +
  "issuing tier of policy CAs dedicated per business line (retail banking, " +
  "corporate treasury, and internal IT operations), and a set of registration " +
  "authorities integrated with the corporate identity provider for automated " +
  "enrollment. Certificates are issued for TLS server authentication, S/MIME " +
  "email protection, code signing for internally developed applications, and " +
  "device identity for the internal IoT fleet. Key ceremonies for the root " +
  "and policy CAs are performed twice a year with an independent witness and " +
  "recorded on video for audit purposes, and revocation is published via both " +
  "CRL and OCSP with a four-hour refresh cadence across all issuing tiers.";

const buildFullActionPlans = (): ActionPlans => {
  const [c0, c1] = allCategories;
  return {
    categories: {
      [`${c0.moduleId}.${c0.category.id}`]: { targetLevel: 5 },
      [`${c1.moduleId}.${c1.category.id}`]: { targetLevel: 4 },
    },
  };
};

// The CURRENT assessment's own action plans + workspace POCs (distinct from
// buildFullActionPlans above, which seeds the comparison baseline) — richer,
// with objectives/tasks/outputs/a POC-resolved responsibility, so an
// end-to-end render through ReportDocument has real Action Plans content to
// assert against.
const buildCurrentPocs = (): { id: string; name: string; role?: string }[] => [
  { id: "poc-fixture-1", name: "Dana Lee", role: "PKI Architect" },
];

const buildCurrentActionPlans = (): ActionPlans => {
  const [c0, c1] = allCategories;
  return {
    categories: {
      [`${c0.moduleId}.${c0.category.id}`]: {
        targetLevel: 5,
        objectives: [{ id: "obj-1", text: "Publish a CP/CPS" }],
        responsiblePocId: "poc-fixture-1",
        targetDate: "2026-06-01",
        outputs: [{ id: "out-1", text: "Signed CP/CPS document" }],
        tasks: [{ itemId: "task-1", label: "Draft policy", done: false }],
        resources: "Legal counsel, 2 FTE-weeks",
        comments: "Coordinate with the compliance team.",
      },
      [`${c1.moduleId}.${c1.category.id}`]: { targetLevel: 4 },
    },
  };
};

const buildBaselineAssessment = (): Assessment => {
  const progress: Record<string, ProgressData> = {};
  allCategories.forEach(({ moduleId, category }) => {
    progress[`${moduleId}.${category.id}`] = ratedProgressEntry(1);
  });
  const requirementProgress: Record<string, RequirementProgress> = {};
  allRequirements.forEach(({ moduleId, categoryId, requirement }) => {
    requirementProgress[`${moduleId}.${categoryId}.${requirement.id}`] =
      mkRequirementProgress(1);
  });
  const now = new Date("2025-06-01T00:00:00.000Z").toISOString();
  return {
    id: "baseline-fixture",
    name: "Baseline (prior review)",
    dataVersion: DEFAULT_MODEL_VERSION,
    progress,
    requirementProgress,
    actionPlans: buildFullActionPlans(),
    enabledExtensions: [],
    assessmentName: "Baseline (prior review)",
    assessorName: "",
    useCaseDescription: "",
    sourceStructure: { byKey: {} },
    meta: { createdAt: now, updatedAt: now },
  };
};

const buildFullComparison = (
  progress: Record<string, ProgressData>,
  requirementProgress: Record<string, RequirementProgress>,
): {
  comparison: ComparisonResult;
  reconciliationRows: ReconciliationRow[];
} => {
  const baseline = buildBaselineAssessment();
  const aligned = alignBaseline(baseline, modelData, []);
  const comparison = buildComparison({
    modules: fixtureModules,
    currentProgress: progress,
    currentRequirementProgress: requirementProgress,
    baselineProgress: aligned.progress,
    baselineRequirementProgress: aligned.requirementProgress,
  });
  const reconciliationRows = buildActionPlanReconciliation(
    aligned.actionPlans,
    comparison,
  );
  return { comparison, reconciliationRows };
};

const fullProgress = buildFullProgress();
const fullRequirementProgress = buildFullRequirementProgress();
const { comparison: fullComparison, reconciliationRows: fullReconciliation } =
  buildFullComparison(fullProgress, fullRequirementProgress);

export const fullFixture: ReportFixture = {
  modules: fixtureModules,
  progress: fullProgress,
  requirementProgress: fullRequirementProgress,
  assessmentName: "Full assessment 2026",
  assessorName: "J. Reviewer",
  useCaseDescription: "Annual PKI maturity review.",
  organizationName: "Acme Root CA",
  assessorCompany: "Acme Consulting",
  assessorPosition: "external",
  assessmentType: "formal",
  startDate: "2026-01-01",
  targetDate: "2026-03-01",
  finishDate: "2026-02-20",
  pkiEnvironment: {
    components:
      "Root CA, two policy CAs, RA/registration portal, OCSP responders.",
    outOfScopeConsiderations:
      "Legacy self-signed device certificates are excluded.",
    highLevelDesign: LONG_PKI_ENVIRONMENT_VALUE,
    pointsOfInteraction: "Corporate IdP, internal ticketing system, HSM vault.",
  },
  references: bundledReferences.slice(0, 5),
  dataVersion: DEFAULT_MODEL_VERSION,
  comparison: fullComparison,
  reconciliationRows: fullReconciliation,
  comparisonBaselineName: "Q1 Baseline 2026",
  comparisonBaselineDate: "2026-01-15",
  actionPlans: buildCurrentActionPlans(),
  pocs: buildCurrentPocs(),
};

// --- long: the abuse fixture — every user-controlled free-text field pushed
// far past any realistic length, so the audit proves the layout survives
// arbitrary input: multi-thousand-character requirement notes/evidence,
// category notes, not-applicable reasons (which drive the Scope exclusion
// table across pages), PKI-environment values, and action-plan list items.
// Model-provided text (names, descriptions, criteria) is bounded by the
// bundled YAML and stays as-is.

const LONG_SENTENCE =
  "This finding was reviewed in depth with the operations, security, and " +
  "compliance teams, cross-checked against the documented procedures, the " +
  "change-management records, and the interview notes collected during the " +
  "on-site assessment week, and the conclusion below reflects the agreed " +
  "consensus position of all participants involved in the review. ";

const longText = (chars: number): string => {
  let out = "";
  while (out.length < chars) out += LONG_SENTENCE;
  // Cut at the last sentence boundary so a fixture never ends mid-word —
  // a mid-word ending is indistinguishable from real rendering truncation
  // when eyeballing a rendered page. Lengths shorter than one sentence keep
  // the raw slice (there is no boundary to cut at).
  const sliced = out.slice(0, chars);
  const trimmed = sliced.slice(0, sliced.lastIndexOf(".") + 1);
  return trimmed.length > 0 ? trimmed : sliced;
};

const buildLongProgress = (): Record<string, ProgressData> => {
  const progress: Record<string, ProgressData> = {};
  allCategories.forEach(({ moduleId, category }, i) => {
    const key = `${moduleId}.${category.id}`;
    if (i % 4 === 3) {
      // Every fourth category out of scope with a very long reason — enough
      // exclusion rows and text to push the Scope table across pages.
      progress[key] = {
        ...emptyProgressEntry(),
        applicability: false,
        applicabilityReason: longText(900 + (i % 3) * 700),
      };
    } else {
      progress[key] = {
        ...ratedProgressEntry(cycleLevel(i)),
        notes: longText(600 + (i % 5) * 400),
      };
    }
  });
  return progress;
};

const buildLongRequirementProgress = (): Record<
  string,
  RequirementProgress
> => {
  const requirementProgress: Record<string, RequirementProgress> = {};
  allRequirements.forEach(({ moduleId, categoryId, requirement }, i) => {
    // A spread of lengths: most rows moderately long, every fifth row extreme
    // (well past a full column-height page), a few requirement-level
    // exclusions with long reasons.
    if (i % 11 === 10) {
      requirementProgress[`${moduleId}.${categoryId}.${requirement.id}`] = {
        ...mkRequirementProgress(0),
        applicability: false,
        applicabilityReason: longText(700),
      };
      return;
    }
    const extreme = i % 5 === 0;
    requirementProgress[`${moduleId}.${categoryId}.${requirement.id}`] =
      mkRequirementProgress(cycleLevel(i), {
        notes: longText(extreme ? 2600 : 450),
        evidence: longText(extreme ? 2200 : 380),
        completed: i % 2 === 0,
        flagged: i % 9 === 0,
      });
  });
  return requirementProgress;
};

const buildLongActionPlans = (): ActionPlans => {
  const inScope = allCategories.filter((_, i) => i % 4 !== 3);
  const [c0, c1] = inScope;
  return {
    categories: {
      [`${c0.moduleId}.${c0.category.id}`]: {
        targetLevel: 5,
        // The FIRST block of the first plan card is deliberately huge — it
        // exercises the header-band glue against a body block taller than
        // the space left on a page.
        objectives: [
          { id: "obj-l1", text: longText(2400) },
          { id: "obj-l2", text: "Publish the revised CP/CPS." },
        ],
        responsibility: longText(300),
        targetDate: "2026-09-01",
        outputs: [{ id: "out-l1", text: longText(1200) }],
        tasks: [
          { itemId: "task-l1", label: longText(500), done: true },
          { itemId: "task-l2", label: "Short follow-up task", done: false },
        ],
        resources: longText(1500),
        comments: longText(2000),
      },
      [`${c1.moduleId}.${c1.category.id}`]: { targetLevel: 3 },
    },
  };
};

const longProgress = buildLongProgress();
const longRequirementProgress = buildLongRequirementProgress();
const { comparison: longComparison, reconciliationRows: longReconciliation } =
  buildFullComparison(longProgress, longRequirementProgress);

export const longFixture: ReportFixture = {
  modules: fixtureModules,
  progress: longProgress,
  requirementProgress: longRequirementProgress,
  assessmentName:
    "Consolidated multi-entity PKI maturity assessment covering the shared " +
    "root hierarchy, all subordinate issuing environments, and the managed " +
    "device-identity service (2026 annual cycle)",
  assessorName: "J. Reviewer-with-a-very-long-hyphenated-professional-name",
  useCaseDescription: longText(800),
  organizationName:
    "Acme Global Financial Services Holdings, Certificate Authority Division",
  assessorCompany: "Acme Consulting Group, PKI Assurance Practice",
  assessorPosition: "external",
  assessmentType: "formal",
  startDate: "2026-01-01",
  targetDate: "2026-03-01",
  finishDate: "2026-02-20",
  pkiEnvironment: {
    components: longText(1800),
    outOfScopeConsiderations: longText(2500),
    highLevelDesign: longText(5200),
    pointsOfInteraction: "Corporate IdP, internal ticketing system, HSM vault.",
  },
  references: bundledReferences.slice(0, 5),
  dataVersion: DEFAULT_MODEL_VERSION,
  comparison: longComparison,
  reconciliationRows: longReconciliation,
  comparisonBaselineName: "Q1 Baseline 2026",
  comparisonBaselineDate: "2026-01-15",
  actionPlans: buildLongActionPlans(),
  pocs: buildCurrentPocs(),
};

// --- self-tier PDF props -------------------------------------------------

// Maps a ReportFixture onto CoreReportDocument's exact PdfDocumentProps shape
// (see src/utils/pdf/CoreReportDocument.tsx). Kept small and self-contained so
// a later sibling (e.g. toSectionContext, for the Assessment/Detailed/
// Attestation tiers) can reuse the same fixtures independently.
export const toSelfProps = (fixture: ReportFixture): PdfDocumentProps => {
  const overallMaturityLevel = calculateOverallMaturityLevel(
    fixture.modules,
    fixture.progress,
    [],
    [],
    fixture.requirementProgress,
  );
  const moduleMaturityLevels = calculateModuleMaturityLevels(
    fixture.modules,
    fixture.progress,
    [],
    [],
    fixture.requirementProgress,
  );
  const { detailRows } = buildReportData({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress: fixture.requirementProgress,
  });

  return {
    chartImgData: TINY_PNG_DATA_URI,
    qrImgData: null,
    overallMaturityLevel,
    moduleMaturityLevels,
    detailRows,
    references: fixture.references,
    assessmentName: fixture.assessmentName,
    assessorName: fixture.assessorName,
    useCaseDescription: fixture.useCaseDescription,
    assessmentUrl: "https://x.test/#p",
    version: fixture.dataVersion,
  };
};

// --- SectionContext (Attestation/Assessment/Detailed/Custom tiers) ------

// Maps a ReportFixture onto a full SectionContext — every section/tier
// real-render test builds its context through this one helper so they can
// never drift from each other or from the real `exportToPDF` wiring. Mirrors
// what the exportToPDF dispatcher computes: the same builder calls,
// `showShareLink` always false (every tier this registry serves is a
// full-assessment report; self/quick keeps its own CoreReportDocument +
// showShareLink=true), and `timelineAlwaysShow` true only for the
// attestation tier.
export const toSectionContext = (
  fixture: ReportFixture,
  opts: {
    reportTitle: string;
    tier: "attestation" | "assessment" | "detailed" | "custom";
    requirementFilter?: RequirementFilterState;
  },
): SectionContext => {
  const requirementProgress = fixture.requirementProgress ?? {};
  const overallMaturityLevel = calculateOverallMaturityLevel(
    fixture.modules,
    fixture.progress,
    [],
    [],
    requirementProgress,
  );
  const moduleMaturityLevels = calculateModuleMaturityLevels(
    fixture.modules,
    fixture.progress,
    [],
    [],
    requirementProgress,
  );
  const reportData = buildReportData({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
  });
  const distribution = buildLevelDistribution({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
  });
  const exclusions = buildScopeExclusions({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
  });
  const coverage = buildScopeCoverage({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
  });
  const reportCompleteness = buildReportCompleteness(
    fixture.modules,
    fixture.progress,
    requirementProgress,
  );
  const requirementDetailRows = buildRequirementDetailRows({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
    filter: opts.requirementFilter,
  });
  const gapRows = buildGapToNextLevel({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
  });
  // Reads the fixture's own actionPlans/pocs (undefined for fixtures that
  // don't set them, which correctly yields []) so this exercises the same
  // buildActionPlanRows wiring exportToPDF uses, not a stubbed-out no-op.
  const actionPlanRows = buildActionPlanRows({
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
    actionPlans: fixture.actionPlans,
    pocs: fixture.pocs,
  });

  return {
    reportTitle: opts.reportTitle,
    showShareLink: false,
    qrImgData: null,
    assessmentUrl: "https://x.test/#p",
    assessmentName: fixture.assessmentName,
    assessorName: fixture.assessorName,
    useCaseDescription: fixture.useCaseDescription,
    organizationName: fixture.organizationName,
    assessorCompany: fixture.assessorCompany,
    assessorPosition: fixture.assessorPosition,
    assessmentType: fixture.assessmentType,
    startDate: fixture.startDate,
    targetDate: fixture.targetDate,
    finishDate: fixture.finishDate,
    timelineAlwaysShow: opts.tier === "attestation",
    overallMaturityLevel,
    moduleMaturityLevels,
    reportData,
    distribution,
    exclusions,
    coverage,
    reportCompleteness,
    references: fixture.references,
    requirementDetailRows,
    requirementFilter: opts.requirementFilter,
    gapRows,
    actionPlanRows,
    comparison: fixture.comparison ?? null,
    reconciliationRows: fixture.reconciliationRows ?? [],
    comparisonBaselineName: fixture.comparisonBaselineName,
    comparisonBaselineDate: fixture.comparisonBaselineDate,
    pkiEnvironment: fixture.pkiEnvironment,
    chartImgData: TINY_PNG_DATA_URI,
    version: APP_VERSION,
    dataVersion: fixture.dataVersion,
    modules: fixture.modules,
    progress: fixture.progress,
    requirementProgress,
  };
};
