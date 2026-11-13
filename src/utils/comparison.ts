import type {
  Assessment,
  AssessmentData,
  ExtensionData,
  ProgressData,
  RequirementProgress,
  ActionPlans,
  ModuleData,
} from "../types/types";
import { migrate } from "./stateMigration";
import { calculateEffectiveCategoryLevel } from "./effectiveLevel";
import {
  calculateModuleMaturityLevels,
  calculateOverallMaturityLevel,
} from "../assessment-engine/methodologies/weightedMaturity";
import type { AssessmentProfileData } from "../assessment-engine/types";

export interface AlignedBaseline {
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
  actionPlans: ActionPlans | undefined;
  unmappedNames: string[];
  aligned: boolean; // baseline came from a different model version
}

// Remap a baseline's ratings onto the CURRENT model, read-only. Same version →
// pass through (keys already match). Different version → reuse migrate()'s
// name-matching (discarding the rest of the MigrationResult). A baseline with
// no alignable structure short-circuits to empty + a note (migrate would
// otherwise silently drop such entries without flagging them).
export const alignBaseline = (
  baseline: Assessment,
  currentData: AssessmentData,
  loadedExtensions: ExtensionData[] = [],
): AlignedBaseline => {
  if (baseline.dataVersion === (currentData.version ?? "1.0.0")) {
    return {
      progress: baseline.progress,
      requirementProgress: baseline.requirementProgress ?? {},
      actionPlans: baseline.actionPlans,
      unmappedNames: [],
      aligned: false,
    };
  }
  const byKey = baseline.sourceStructure?.byKey ?? {};
  if (Object.keys(byKey).length === 0) {
    return {
      progress: {},
      requirementProgress: {},
      actionPlans: undefined,
      unmappedNames: ["(baseline has no alignable structure)"],
      aligned: true,
    };
  }
  const result = migrate(baseline, currentData, loadedExtensions);
  return {
    progress: result.migratedProgress,
    requirementProgress: result.migratedRequirementProgress ?? {},
    actionPlans: result.migratedActionPlans,
    unmappedNames: result.summary.unmappedFromSource,
    aligned: true,
  };
};

export interface Delta {
  current: number;
  baseline: number;
  delta: number;
  direction: "up" | "down" | "same";
}

const mkDelta = (current: number, baseline: number): Delta => {
  const delta = current - baseline;
  return {
    current,
    baseline,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  };
};

export interface ComparisonResult {
  overall: Delta;
  modules: { moduleId: string; module: string; d: Delta }[];
  categories: { key: string; module: string; categoryName: string; d: Delta }[];
}

// Current vs baseline, both computed with base weights (no extensions — the
// baseline core-model headline). Module results are zipped BY INDEX against
// `modules` (calculateModuleMaturityLevels returns { module: <name>, level }
// with no id, and both sides are called with the same `modules` array).
export const buildComparison = (input: {
  modules: ModuleData[];
  currentProgress: Record<string, ProgressData>;
  currentRequirementProgress: Record<string, RequirementProgress> | undefined;
  baselineProgress: Record<string, ProgressData>;
  baselineRequirementProgress: Record<string, RequirementProgress> | undefined;
  methodology?: AssessmentProfileData["runtime"]["methodology"];
}): ComparisonResult => {
  const {
    modules,
    currentProgress,
    currentRequirementProgress,
    baselineProgress,
    baselineRequirementProgress,
    methodology,
  } = input;
  const parameters = methodology?.parameters;

  const overall = mkDelta(
    calculateOverallMaturityLevel(
      modules,
      currentProgress,
      [],
      [],
      currentRequirementProgress,
      parameters,
    ),
    calculateOverallMaturityLevel(
      modules,
      baselineProgress,
      [],
      [],
      baselineRequirementProgress,
      parameters,
    ),
  );

  const curMod = calculateModuleMaturityLevels(
    modules,
    currentProgress,
    [],
    [],
    currentRequirementProgress,
    parameters,
  );
  const baseMod = calculateModuleMaturityLevels(
    modules,
    baselineProgress,
    [],
    [],
    baselineRequirementProgress,
    parameters,
  );
  const moduleDeltas = modules.map((m, i) => ({
    moduleId: m.id,
    module: m.name,
    d: mkDelta(curMod[i]?.level ?? 0, baseMod[i]?.level ?? 0),
  }));

  const categories: ComparisonResult["categories"] = [];
  for (const m of modules) {
    for (const c of m.categories) {
      const cur = calculateEffectiveCategoryLevel(
        m.id,
        c,
        currentProgress,
        currentRequirementProgress,
      ).display;
      const base = calculateEffectiveCategoryLevel(
        m.id,
        c,
        baselineProgress,
        baselineRequirementProgress,
      ).display;
      categories.push({
        key: `${m.id}.${c.id}`,
        module: m.name,
        categoryName: c.name,
        d: mkDelta(cur, base),
      });
    }
  }

  return { overall, modules: moduleDeltas, categories };
};

export interface ReconciliationRow {
  key: string;
  categoryName: string;
  targetLevel: number;
  achieved: number;
  status: "met" | "exceeded" | "not-met";
}

// Per baseline-planned category (ALIGNED action plans — keys match the
// comparison's current-model keys): compare the prior target level against the
// current achieved level.
export const buildActionPlanReconciliation = (
  alignedActionPlans: ActionPlans | undefined,
  comparison: ComparisonResult,
): ReconciliationRow[] => {
  const cats = alignedActionPlans?.categories ?? {};
  const byKey = new Map(comparison.categories.map((c) => [c.key, c]));
  const rows: ReconciliationRow[] = [];
  for (const [key, plan] of Object.entries(cats)) {
    const cat = byKey.get(key);
    if (!cat) continue;
    const achieved = cat.d.current;
    const target = plan.targetLevel;
    rows.push({
      key,
      categoryName: cat.categoryName,
      targetLevel: target,
      achieved,
      status:
        achieved === target
          ? "met"
          : achieved > target
            ? "exceeded"
            : "not-met",
    });
  }
  return rows;
};
