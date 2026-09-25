import type {
  ModuleData,
  ProgressData,
  ExtensionData,
  RequirementProgress,
  ActionPlans,
} from "../types/types";
import { normalizeActionPlans } from "./actionPlans";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
  calculateExtensionMaturityLevels,
  calculateExtensionFloorScore,
  calculateExtensionWeightedScore,
  getEffectiveWeight,
  getCategoryOverlayInfo,
  hasOverlays,
  calculateBlendedLevel,
  type CategoryOverlayDetails,
} from "../assessment-engine/methodologies/weightedMaturity";
import {
  calculateEffectiveCategoryLevel,
  computeCompleteness,
  isInScope,
} from "./effectiveLevel";
import {
  buildRequirementViews,
  matchesFilter,
  type RequirementFilterState,
} from "./requirementFilter";
import LevelResult from "../enums/LevelResult";
import type { AssessmentProfileData } from "../assessment-engine/types";

export interface ReportScores {
  overall: number;
  modules: { moduleId: string; module: string; level: number }[];
  extension: number | null;
  floor: number | null;
  weighted: number | null;
}

export interface ReportCompleteness {
  total: number;
  assessed: number;
  notAssessed: number;
  isIncomplete: boolean;
  perModule: {
    moduleId: string;
    module: string;
    total: number;
    assessed: number;
    pct: number;
  }[];
  // Requirement-level completeness, reported alongside the category figure so
  // a full assessment can show both without blending them into one number.
  // In-scope requirements only (out-of-scope and Not Applicable excluded);
  // the denominator matches buildScopeCoverage's requirementsInScope.
  requirements: {
    assessed: number;
    totalInScope: number;
  };
}

export interface CategoryGrainCounts {
  total: number;
  assessed: number;
  perModule: {
    moduleId: string;
    module: string;
    total: number;
    assessed: number;
  }[];
}

export const buildReportScores = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  activeExtension: ExtensionData | null,
  requirementProgress?: Record<string, RequirementProgress>,
  methodology?: AssessmentProfileData["runtime"]["methodology"],
): ReportScores => {
  const parameters = methodology?.parameters;
  const overall = calculateOverallMaturityLevel(
    modules,
    progress,
    [],
    [],
    requirementProgress,
    parameters,
  );
  // calculateModuleMaturityLevels returns { module: <name>, level } in `modules` order.
  const perModuleLevels = calculateModuleMaturityLevels(
    modules,
    progress,
    [],
    [],
    requirementProgress,
    parameters,
  );
  const modules_ = modules.map((m, i) => ({
    moduleId: m.id,
    module: m.name,
    level: perModuleLevels[i]?.level ?? 0,
  }));
  if (!activeExtension) {
    return {
      overall,
      modules: modules_,
      extension: null,
      floor: null,
      weighted: null,
    };
  }
  const extId = activeExtension.extension.id;
  const extension =
    calculateExtensionMaturityLevels(
      modules,
      [activeExtension],
      [extId],
      progress,
      requirementProgress,
      parameters,
    )[0]?.level ?? null;
  const floor = calculateExtensionFloorScore(
    modules,
    activeExtension,
    progress,
    requirementProgress,
    parameters,
  );
  const weighted = calculateExtensionWeightedScore(
    modules,
    progress,
    activeExtension,
    requirementProgress,
    parameters,
  );
  return { overall, modules: modules_, extension, floor, weighted };
};

// Pure CATEGORY grain: every applicable category counts once, whether its
// effective level came from requirement ratings or a self-declared level.
// A category is assessed when its effective level is > 0; Not Applicable
// categories (explicit or derived) are excluded from both figures. This is
// deliberately NOT blended with requirement counts — mixing the two grains
// into one number produced totals with no meaning ("30 categories" for a
// 16-category model). Requirement-level completeness is a separate figure
// (buildReportCompleteness.requirements, via computeCompleteness). The
// denominator here equals buildScopeCoverage's categoriesInScope.
export const computeCategoryGrainCounts = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  requirementProgress?: Record<string, RequirementProgress>,
): CategoryGrainCounts => {
  let total = 0;
  let assessed = 0;
  const perModule = modules.map((m) => {
    let mTotal = 0;
    let mAssessed = 0;
    for (const c of m.categories) {
      const eff = calculateEffectiveCategoryLevel(
        m.id,
        c,
        progress,
        requirementProgress,
      );
      if (eff.display === -1) continue; // Not Applicable (explicit or derived).
      mTotal += 1;
      if (eff.display > 0) mAssessed += 1;
    }
    total += mTotal;
    assessed += mAssessed;
    return {
      moduleId: m.id,
      module: m.name,
      total: mTotal,
      assessed: mAssessed,
    };
  });
  return { total, assessed, perModule };
};

export const buildReportCompleteness = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  requirementProgress?: Record<string, RequirementProgress>,
): ReportCompleteness => {
  const counts = computeCategoryGrainCounts(
    modules,
    progress,
    requirementProgress,
  );
  const notAssessed = counts.total - counts.assessed;
  const reqCompleteness = computeCompleteness(
    modules,
    progress,
    requirementProgress,
  );
  return {
    total: counts.total,
    assessed: counts.assessed,
    notAssessed,
    isIncomplete: notAssessed > 0,
    perModule: counts.perModule.map((m) => ({
      ...m,
      pct: m.total === 0 ? 0 : Math.round((m.assessed / m.total) * 100),
    })),
    requirements: {
      assessed: reqCompleteness.assessed,
      totalInScope: reqCompleteness.totalInScope,
    },
  };
};

export interface DetailRow {
  key: string;
  moduleId: string;
  module: string;
  category: string;
  weightBase: number; // category.weight
  weightEffective: number; // ext mode: getEffectiveWeight(...); core: = weightBase
  weightChanged: boolean; // weightEffective !== weightBase
  hasRelevance: boolean; // ext mode && extension declares relevance for this category
  // "stored" view — on-screen CORE, on-screen EXT non-relevance rows, CORE PDF:
  storedResult: string; // progress[coreKey]?.result || "Not Assessed"
  storedColorKey: number; // progress[coreKey]?.level || 0   (|| keeps -1 as -1)
  description?: string; // progress[coreKey]?.description (raw; renderers add "N/A")
  // "blended" view — on-screen EXT relevance rows, EXT PDF (all rows):
  blendedLevelNum: number; // blended === -1 ? -1 : Math.floor(blended); = storedColorKey in core mode
  blendedLabel: string; // LevelResult[blendedLevelNum]; = storedResult in core mode
  notes?: string; // progress[coreKey]?.notes; core rows only, rendered in the self PDF
}

export interface OverlayRow {
  key: string;
  module: string;
  category: string;
  details: CategoryOverlayDetails;
}

export interface RelevanceRow {
  key: string;
  module: string;
  category: string;
  weight: number;
  level: number;
  label: string;
  colorKey: number;
  notes: string;
  evidence: string;
}

export interface ReportData {
  mode: "core" | "extension";
  scores: ReportScores;
  completeness: ReportCompleteness;
  detailRows: DetailRow[]; // module→category order
  overlayRows: OverlayRow[]; // filtered to hasOverlays, module→category order (core: [])
  relevanceRows: RelevanceRow[]; // extension.relevance order (core: [])
}

const buildDetailRows = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  ext: ExtensionData | null,
  requirementProgress?: Record<string, RequirementProgress>,
): DetailRow[] => {
  const extId = ext?.extension.id;
  return modules.flatMap((module) => {
    const extModule = ext?.relevance.modules.find((m) => m.id === module.id);
    return module.categories.map((category) => {
      const coreKey = `${module.id}.${category.id}`;
      const description = progress[coreKey]?.description;
      const weightBase = category.weight;

      // "stored" view: requirement-derived when the category has assessed
      // in-scope requirements; otherwise the exact self-declared stored
      // string/level (never recomputed) so quick assessments stay untouched.
      const eff = calculateEffectiveCategoryLevel(
        module.id,
        category,
        progress,
        requirementProgress,
      );
      let storedResult: string;
      let storedColorKey: number;
      if (
        eff.source === "requirements" ||
        eff.source === "derived-not-applicable"
      ) {
        // "requirements": category has ≥1 assessed in-scope requirement —
        // requirement-derived level. "derived-not-applicable": every
        // requirement was individually scoped out — eff.display is -1.
        storedColorKey = eff.display;
        storedResult = LevelResult[eff.display];
      } else {
        // eff.source === "self": no requirement data to derive from —
        // covers both a rated/unrated self-declared level AND an explicit
        // category-level N/A (which retains its prior level color, not -1).
        // Keep the exact stored string/level, never recomputed.
        storedResult = progress[coreKey]?.result || "Not Assessed";
        storedColorKey = progress[coreKey]?.level || 0;
      }

      if (ext && extId) {
        const weightEffective = getEffectiveWeight(
          module.id,
          category,
          [ext],
          [extId],
        );
        const hasRelevance = !!extModule?.categories.find(
          (c) => c.id === category.id,
        );
        const blended = calculateBlendedLevel(
          module.id,
          category,
          ext,
          progress,
          requirementProgress,
        );
        const blendedLevelNum = blended === -1 ? -1 : Math.floor(blended);
        return {
          key: coreKey,
          moduleId: module.id,
          module: module.name,
          category: category.name,
          weightBase,
          weightEffective,
          weightChanged: weightEffective !== weightBase,
          hasRelevance,
          storedResult,
          storedColorKey,
          description,
          blendedLevelNum,
          blendedLabel: LevelResult[blendedLevelNum],
          notes: progress[coreKey]?.notes,
        };
      }
      return {
        key: coreKey,
        moduleId: module.id,
        module: module.name,
        category: category.name,
        weightBase,
        weightEffective: weightBase,
        weightChanged: false,
        hasRelevance: false,
        storedResult,
        storedColorKey,
        description,
        blendedLevelNum: storedColorKey,
        blendedLabel: storedResult,
        notes: progress[coreKey]?.notes,
      };
    });
  });
};

const buildOverlayRows = (
  modules: ModuleData[],
  ext: ExtensionData | null,
): OverlayRow[] => {
  if (!ext) return [];
  return modules.flatMap((module) =>
    module.categories
      .map((category) => {
        const details = getCategoryOverlayInfo(module.id, category, ext);
        if (!hasOverlays(details)) return null;
        return {
          key: `${module.id}.${category.id}`,
          module: module.name,
          category: category.name,
          details,
        };
      })
      .filter((r): r is OverlayRow => r !== null),
  );
};

const buildRelevanceRows = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  ext: ExtensionData | null,
): RelevanceRow[] => {
  if (!ext) return [];
  const extId = ext.extension.id;
  return ext.relevance.modules.flatMap((module) =>
    module.categories.map((category) => {
      const coreModule = modules.find((m) => m.id === module.id);
      const coreCategory = coreModule?.categories.find(
        (c) => c.id === category.id,
      );
      const extKey = `${extId}.${module.id}.${category.id}`;
      const level = progress[extKey]?.level ?? 0;
      return {
        key: extKey,
        module: coreModule?.name || module.id,
        category: coreCategory?.name || category.id,
        weight: category.weight,
        level,
        label: LevelResult[level],
        colorKey: level,
        notes: progress[extKey]?.notes ?? "",
        evidence: progress[extKey]?.evidence ?? "",
      };
    }),
  );
};

export interface LevelDistributionRow {
  key: string;
  moduleId: string;
  categoryName: string;
  notApplicable: number;
  notAssessed: number;
  levels: [number, number, number, number, number]; // L1..L5
  totalApplicable: number;
}

type DistTotals = Omit<
  LevelDistributionRow,
  "key" | "moduleId" | "categoryName"
>;

export interface LevelDistributionModuleGroup {
  moduleId: string;
  module: string;
  rows: LevelDistributionRow[];
  subtotal: DistTotals;
}

export interface LevelDistribution {
  grain: "requirement" | "category";
  groups: LevelDistributionModuleGroup[];
  total: DistTotals;
}

const emptyTotals = (): DistTotals => ({
  notApplicable: 0,
  notAssessed: 0,
  levels: [0, 0, 0, 0, 0],
  totalApplicable: 0,
});

const addInto = (
  acc: DistTotals,
  r: {
    notApplicable: number;
    notAssessed: number;
    levels: number[];
    totalApplicable: number;
  },
): void => {
  acc.notApplicable += r.notApplicable;
  acc.notAssessed += r.notAssessed;
  for (let i = 0; i < 5; i++) acc.levels[i] += r.levels[i];
  acc.totalApplicable += r.totalApplicable;
};

// Per-category level distribution for reports. Grain is chosen once for the
// whole assessment: "requirement" when any requirementProgress entry exists
// (full assessment), otherwise "category" (quick/self-declared assessment) —
// counting each category once by its effective level, core-only (extension
// relevance is out of scope for this tier).
export const buildLevelDistribution = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
}): LevelDistribution => {
  const { modules, progress, requirementProgress } = input;
  const anyReq = Object.keys(requirementProgress).length > 0;
  const total = emptyTotals();

  const groups: LevelDistributionModuleGroup[] = modules.map((m) => {
    const subtotal = emptyTotals();
    const rows: LevelDistributionRow[] = m.categories.map((c) => {
      const catKey = `${m.id}.${c.id}`;
      const row: LevelDistributionRow = {
        key: catKey,
        moduleId: m.id,
        categoryName: c.name,
        notApplicable: 0,
        notAssessed: 0,
        levels: [0, 0, 0, 0, 0],
        totalApplicable: 0,
      };

      if (!anyReq) {
        // Category grain: count this category once by its effective level.
        const eff = calculateEffectiveCategoryLevel(
          m.id,
          c,
          progress,
          undefined,
        );
        if (eff.display === -1) row.notApplicable = 1;
        else if (eff.display <= 0) row.notAssessed = 1;
        else row.levels[eff.display - 1] = 1;
      } else {
        // A category is Not Applicable either explicitly (its own toggle) or
        // when every requirement is scoped out. Both collapse to the
        // per-requirement scoped-out check below: an all-scoped-out category
        // counts each of its requirements as N/A, so no separate derived flag
        // is needed for counting.
        const catNA = progress[catKey]?.applicability === false;
        const reqs = c.requirements ?? [];
        for (const r of reqs) {
          const rp = requirementProgress[`${m.id}.${c.id}.${r.id}`];
          const scopedOut = rp ? !isInScope(rp) : false;
          if (catNA || scopedOut) {
            row.notApplicable++;
            continue;
          }
          const level = rp?.level ?? 0;
          if (level <= 0) row.notAssessed++;
          else if (level >= 1 && level <= 5) row.levels[level - 1]++;
        }
      }
      row.totalApplicable =
        row.notAssessed + row.levels.reduce((a, b) => a + b, 0);
      addInto(subtotal, row);
      return row;
    });
    addInto(total, subtotal);
    return { moduleId: m.id, module: m.name, rows, subtotal };
  });

  return { grain: anyReq ? "requirement" : "category", groups, total };
};

export interface ScopeExclusion {
  scope: "category" | "requirement";
  key: string;
  moduleId: string;
  categoryName: string;
  requirementName?: string;
  reason: string;
  derived: boolean;
}

export interface ScopeCoverage {
  categoriesInScope: number;
  categoriesTotal: number;
  requirementsInScope: number;
  requirementsTotal: number;
}

// A category is out of scope either explicitly (its own applicability
// toggle) or by derivation (every one of its requirements is individually
// scoped out). Both collapse the category to a single scope exclusion —
// its requirements are never separately listed once the category itself is
// excluded, mirroring how the category rolls up to Not Applicable elsewhere.
export const buildScopeExclusions = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
}): ScopeExclusion[] => {
  const { modules, progress, requirementProgress } = input;
  const out: ScopeExclusion[] = [];
  for (const m of modules) {
    for (const c of m.categories) {
      const catKey = `${m.id}.${c.id}`;
      const catNA = progress[catKey]?.applicability === false;
      const reqs = c.requirements ?? [];
      const inScope = reqs.filter((r) => {
        const rp = requirementProgress[`${m.id}.${c.id}.${r.id}`];
        return !rp || isInScope(rp);
      });
      const derivedNA = reqs.length > 0 && inScope.length === 0;
      if (catNA || derivedNA) {
        out.push({
          scope: "category",
          key: catKey,
          moduleId: m.id,
          categoryName: c.name,
          reason: progress[catKey]?.applicabilityReason ?? "",
          derived: derivedNA && !catNA,
        });
        continue; // whole category excluded; do not also list its requirements
      }
      for (const r of reqs) {
        const rp = requirementProgress[`${m.id}.${c.id}.${r.id}`];
        if (rp && !isInScope(rp)) {
          out.push({
            scope: "requirement",
            key: `${m.id}.${c.id}.${r.id}`,
            moduleId: m.id,
            categoryName: c.name,
            requirementName: r.description,
            reason: rp.applicabilityReason ?? "",
            derived: false,
          });
        }
      }
    }
  }
  return out;
};

export const buildScopeCoverage = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
}): ScopeCoverage => {
  const { modules, progress, requirementProgress } = input;
  let categoriesTotal = 0;
  let categoriesInScope = 0;
  let requirementsTotal = 0;
  let requirementsInScope = 0;
  for (const m of modules) {
    for (const c of m.categories) {
      categoriesTotal++;
      const catKey = `${m.id}.${c.id}`;
      const catNA = progress[catKey]?.applicability === false;
      const reqs = c.requirements ?? [];
      const inScope = reqs.filter((r) => {
        const rp = requirementProgress[`${m.id}.${c.id}.${r.id}`];
        return !rp || isInScope(rp);
      });
      const derivedNA = reqs.length > 0 && inScope.length === 0;
      if (!catNA && !derivedNA) categoriesInScope++;
      for (const r of reqs) {
        requirementsTotal++;
        const rp = requirementProgress[`${m.id}.${c.id}.${r.id}`];
        const scopedOut = catNA || (rp ? !isInScope(rp) : false);
        if (!scopedOut) requirementsInScope++;
      }
    }
  }
  return {
    categoriesInScope,
    categoriesTotal,
    requirementsInScope,
    requirementsTotal,
  };
};

export const buildScopeCoverageLine = (
  overallLevel: number,
  coverage: ScopeCoverage,
): string => {
  const excluded = coverage.requirementsTotal - coverage.requirementsInScope;
  return `Level ${overallLevel} — ${coverage.categoriesInScope} of ${coverage.categoriesTotal} categories, ${coverage.requirementsInScope} of ${coverage.requirementsTotal} requirements in scope; ${excluded} excluded — see detailed report`;
};

export interface RequirementDetailRow {
  moduleId: string;
  module: string;
  categoryKey: string;
  categoryName: string;
  requirementKey: string;
  requirementDescription: string;
  level: number;
  resultLabel: string;
  notes: string;
  evidence: string;
  completed: boolean;
  flagged: boolean;
}

export interface RequirementDetailCategory {
  categoryKey: string;
  categoryName: string;
  rows: RequirementDetailRow[];
}

export interface RequirementDetailModuleGroup {
  moduleId: string;
  module: string;
  categories: RequirementDetailCategory[];
}

// Per-requirement rows for the Detailed report, grouped module -> category ->
// rows. Mirrors buildScopeExclusions' skip logic exactly (explicit category
// N/A, derived-N/A when every requirement is scoped out, individually
// scoped-out requirements) so nothing here is double-listed against the
// scope-exclusions appendix. A level-0 in-scope requirement is still
// included, labelled "Not Assessed" — omission is reserved for out-of-scope
// items, not merely unrated ones.
export const buildRequirementDetailRows = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
  filter?: RequirementFilterState;
}): RequirementDetailModuleGroup[] => {
  const { modules, progress, requirementProgress } = input;
  const groups: RequirementDetailModuleGroup[] = [];
  for (const m of modules) {
    const categories: RequirementDetailCategory[] = [];
    for (const c of m.categories) {
      const catKey = `${m.id}.${c.id}`;
      if (progress[catKey]?.applicability === false) continue; // explicit category N/A
      const reqs = c.requirements ?? [];
      const viewById = input.filter
        ? new Map(
            buildRequirementViews(m.id, c, requirementProgress).map((v) => [
              v.requirementId,
              v,
            ]),
          )
        : null;
      const inScope = reqs.filter((r) => {
        const rp = requirementProgress[`${m.id}.${c.id}.${r.id}`];
        const inScopeOk = !rp || isInScope(rp);
        if (!inScopeOk) return false;
        if (!viewById) return true;
        const v = viewById.get(r.id);
        return v !== undefined && matchesFilter(v, input.filter!);
      });
      if (reqs.length > 0 && inScope.length === 0) continue; // derived N/A
      const rows: RequirementDetailRow[] = inScope.map((r) => {
        const key = `${m.id}.${c.id}.${r.id}`;
        const rp = requirementProgress[key];
        const level = rp?.level ?? 0;
        return {
          moduleId: m.id,
          module: m.name,
          categoryKey: catKey,
          categoryName: c.name,
          requirementKey: key,
          requirementDescription: r.description,
          level,
          resultLabel: LevelResult[level] ?? "Not Assessed",
          notes: rp?.notes ?? "",
          evidence: rp?.evidence ?? "",
          completed: rp?.completed ?? false,
          flagged: rp?.flagged ?? false,
        };
      });
      if (rows.length > 0)
        categories.push({ categoryKey: catKey, categoryName: c.name, rows });
    }
    if (categories.length > 0)
      groups.push({ moduleId: m.id, module: m.name, categories });
  }
  return groups;
};

export interface GapLimitingRequirement {
  requirementKey: string;
  description: string;
  level: number;
}

export interface GapToNextRow {
  categoryKey: string;
  module: string;
  categoryName: string;
  currentLevel: number;
  nextLevel: number;
  nextLevelName: string;
  nextLevelCriteria: string;
  limitingRequirements: GapLimitingRequirement[];
  // In-scope requirements that are not yet rated (missing progress or level 0).
  // Disjoint from limitingRequirements (which lists rated-but-capping reqs);
  // these are the completeness gap a user must close to raise the level.
  unassessedRequirements: { requirementKey: string; description: string }[];
}

// Per-category "what's blocking the next level" analysis for the Detailed
// report. Only categories with requirement-derived data (eff.source ===
// "requirements") below the top level qualify — Not Assessed (0), Not
// Applicable (-1), the top level (5), and self-only categories (no
// requirement questionnaire data to reason about) are all excluded.
// limitingRequirements lists the in-scope requirements actually holding the
// category at its current floor (rated > 0 and <= currentLevel); a level-0
// (Not Assessed) requirement is a completeness gap, not a level cap, so it
// is never listed here even though it may still need attention elsewhere
// (see buildRequirementDetailRows).
export const buildGapToNextLevel = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
}): GapToNextRow[] => {
  const { modules, progress, requirementProgress } = input;
  const out: GapToNextRow[] = [];
  for (const m of modules) {
    for (const c of m.categories) {
      const eff = calculateEffectiveCategoryLevel(
        m.id,
        c,
        progress,
        requirementProgress,
      );
      if (eff.source !== "requirements" || eff.display < 1 || eff.display > 4)
        continue;
      const currentLevel = eff.display;
      const nextLevel = currentLevel + 1;
      const next = c.levels.find((l) => l.number === nextLevel);
      const limitingRequirements: GapLimitingRequirement[] = (
        c.requirements ?? []
      )
        .map((r) => ({
          r,
          rp: requirementProgress[`${m.id}.${c.id}.${r.id}`],
        }))
        .filter(
          ({ rp }) =>
            rp && isInScope(rp) && rp.level > 0 && rp.level <= currentLevel,
        )
        .map(({ r, rp }) => ({
          requirementKey: `${m.id}.${c.id}.${r.id}`,
          description: r.description,
          level: rp!.level,
        }));
      // In-scope requirements not yet rated: a missing rp is in-scope by
      // default (matching the codebase's `!rp || isInScope(rp)` convention) and
      // counts as unassessed; a present rp must be in scope and at level 0.
      const unassessedRequirements = (c.requirements ?? [])
        .map((r) => ({
          r,
          rp: requirementProgress[`${m.id}.${c.id}.${r.id}`],
        }))
        .filter(({ rp }) => (!rp || isInScope(rp)) && (!rp || rp.level === 0))
        .map(({ r }) => ({
          requirementKey: `${m.id}.${c.id}.${r.id}`,
          description: r.description,
        }));
      out.push({
        categoryKey: `${m.id}.${c.id}`,
        module: m.name,
        categoryName: c.name,
        currentLevel,
        nextLevel,
        nextLevelName: next?.name ?? "",
        nextLevelCriteria: next?.description ?? "",
        limitingRequirements,
        unassessedRequirements,
      });
    }
  }
  return out;
};

export interface ActionPlanReportRow {
  categoryKey: string;
  module: string;
  categoryName: string;
  currentLevel: number;
  targetLevel: number;
  objectives: string[];
  responsibility?: string;
  targetDate?: string;
  resources?: string;
  outputs: string[];
  tasks: { label: string; done: boolean }[];
  comments?: string;
}

// Per-category action-plan rows for the Detailed report, module->category
// order (mirrors buildGapToNextLevel's traversal). Only user-added plans are
// emitted, so an assessment with no action plans yields []. A plan on a
// category that is Not Applicable (explicit or derived) is excluded, same as
// buildGapToNextLevel excludes those categories from its own analysis. Input
// is run through normalizeActionPlans first so a legacy string-shaped plan
// (pre-array objectives/outputs/tasks) is coerced rather than crashing.
export const buildActionPlanRows = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
  actionPlans: ActionPlans | undefined;
  pocs?: { id: string; name: string; role?: string }[];
}): ActionPlanReportRow[] => {
  const plans = normalizeActionPlans(input.actionPlans)?.categories;
  if (!plans) return [];
  const pocById = new Map((input.pocs ?? []).map((p) => [p.id, p]));
  const rows: ActionPlanReportRow[] = [];
  for (const m of input.modules) {
    for (const c of m.categories) {
      const categoryKey = `${m.id}.${c.id}`;
      const plan = plans[categoryKey];
      if (!plan) continue;
      const eff = calculateEffectiveCategoryLevel(
        m.id,
        c,
        input.progress,
        input.requirementProgress,
      );
      if (eff.display === -1) continue; // Not Applicable — excluded from report output
      const poc = plan.responsiblePocId
        ? pocById.get(plan.responsiblePocId)
        : undefined;
      // Resolve to the POC name, not name+role; fall back to free text, then omit.
      const responsibility = poc ? poc.name : plan.responsibility || undefined;
      rows.push({
        categoryKey,
        module: m.name,
        categoryName: c.name,
        currentLevel: eff.display,
        targetLevel: plan.targetLevel,
        // Drop blank UI-created rows so the PDF never renders empty bullets.
        objectives: (plan.objectives ?? [])
          .map((o) => o.text.trim())
          .filter(Boolean),
        responsibility,
        targetDate: plan.targetDate,
        resources: plan.resources,
        outputs: (plan.outputs ?? []).map((o) => o.text.trim()).filter(Boolean),
        tasks: (plan.tasks ?? [])
          .filter((t) => t.label.trim())
          .map((t) => ({ label: t.label, done: t.done })),
        comments: plan.comments,
      });
    }
  }
  return rows;
};

export const buildReportData = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  activeExtension?: ExtensionData | null;
  requirementProgress?: Record<string, RequirementProgress>;
  methodology?: AssessmentProfileData["runtime"]["methodology"];
}): ReportData => {
  const ext = input.activeExtension ?? null;
  return {
    mode: ext ? "extension" : "core",
    scores: buildReportScores(
      input.modules,
      input.progress,
      ext,
      input.requirementProgress,
      input.methodology,
    ),
    completeness: buildReportCompleteness(
      input.modules,
      input.progress,
      input.requirementProgress,
    ),
    detailRows: buildDetailRows(
      input.modules,
      input.progress,
      ext,
      input.requirementProgress,
    ),
    overlayRows: buildOverlayRows(input.modules, ext),
    relevanceRows: buildRelevanceRows(input.modules, input.progress, ext),
  };
};
