import type {
  Assessment,
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../types/types";
import LevelResult from "../enums/LevelResult";
import { isInScope } from "./effectiveLevel";
import { defaultCategoryProgress } from "./categoryProgress";
import { defaultRequirementProgress } from "./requirementProgress";

export type TriState = "in" | "out" | "mixed";

export interface ScopeReqNode {
  key: string;
  description: string;
  inScope: boolean;
  reason: string;
}

export interface ScopeCatNode {
  key: string;
  name: string;
  state: TriState;
  explicitOut: boolean; // progress[catKey].applicability === false
  reason: string;
  requirements: ScopeReqNode[];
  inScopeCount: number;
  totalCount: number;
}

export interface ScopeModuleNode {
  moduleId: string;
  module: string;
  state: TriState;
  categories: ScopeCatNode[];
}

export interface ScopeTree {
  modules: ScopeModuleNode[];
}

// A read model over the existing applicability fields. `state` is display-only
// (badge/caption); the category checkbox binds to `explicitOut`. `state` uses
// the same partition as calculateEffectiveCategoryLevel: explicit category N/A
// OR every requirement scoped out => "out".
export const buildScopeTree = (input: {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
}): ScopeTree => {
  const { modules, progress, requirementProgress } = input;
  const moduleNodes: ScopeModuleNode[] = modules.map((m) => {
    const categories: ScopeCatNode[] = m.categories.map((c) => {
      const catKey = `${m.id}.${c.id}`;
      const explicitOut = progress[catKey]?.applicability === false;
      const reqs = c.requirements ?? [];
      const requirements: ScopeReqNode[] = reqs.map((r) => {
        const key = `${m.id}.${c.id}.${r.id}`;
        const rp = requirementProgress[key];
        return {
          key,
          description: r.description,
          inScope: !rp || isInScope(rp),
          reason: rp?.applicabilityReason ?? "",
        };
      });
      const inScopeCount = requirements.filter((r) => r.inScope).length;
      const totalCount = requirements.length;
      let state: TriState;
      if (explicitOut || (totalCount > 0 && inScopeCount === 0)) state = "out";
      else if (totalCount === 0 || inScopeCount === totalCount) state = "in";
      else state = "mixed";
      return {
        key: catKey,
        name: c.name,
        state,
        explicitOut,
        reason: progress[catKey]?.applicabilityReason ?? "",
        requirements,
        inScopeCount,
        totalCount,
      };
    });
    const states = new Set(categories.map((c) => c.state));
    let state: TriState;
    if (categories.length === 0 || (states.size === 1 && states.has("in")))
      state = "in";
    else if (states.size === 1 && states.has("out")) state = "out";
    else state = "mixed";
    return { moduleId: m.id, module: m.name, state, categories };
  });
  return { modules: moduleNodes };
};

// Set (not toggle) a category's applicability, preserving every other field
// including applicabilityReason and flipping `result` like the toggle reducer.
export const setCategoryApplicability = (
  prev: ProgressData | undefined,
  value: boolean,
): ProgressData => {
  const base = prev ?? defaultCategoryProgress();
  return {
    ...base,
    applicability: value,
    result: value ? LevelResult[base.level] || LevelResult[0] : LevelResult[-1],
  };
};

export const setRequirementApplicability = (
  prev: RequirementProgress | undefined,
  value: boolean,
): RequirementProgress => ({
  ...(prev ?? defaultRequirementProgress()),
  applicability: value,
});

// Bulk applicability write. Touches `progress` only when categoryKeys are
// given, and `requirementProgress` only when requirementKeys are given —
// returning the SAME reference for the untouched map (upholds the
// progress-immutability invariant for requirement-only edits).
export const applyBulkScope = (
  a: Assessment,
  input: {
    categoryKeys?: string[];
    requirementKeys?: string[];
    value: boolean;
    nowIso: string;
  },
): Assessment => {
  const { categoryKeys, requirementKeys, value, nowIso } = input;
  let progress = a.progress;
  if (categoryKeys && categoryKeys.length > 0) {
    progress = { ...a.progress };
    for (const key of categoryKeys) {
      progress[key] = setCategoryApplicability(a.progress[key], value);
    }
  }
  let requirementProgress = a.requirementProgress;
  if (requirementKeys && requirementKeys.length > 0) {
    requirementProgress = { ...(a.requirementProgress ?? {}) };
    for (const key of requirementKeys) {
      requirementProgress[key] = {
        ...setRequirementApplicability(a.requirementProgress?.[key], value),
        updatedAt: nowIso,
      };
    }
  }
  return { ...a, progress, requirementProgress };
};

export interface ScopeTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  outOfScopeCategoryKeys: string[]; // explicit category N/A only
  outOfScopeRequirementKeys: string[];
  dataVersion?: string;
}

// Records ONLY explicit category N/A (progress[catKey].applicability === false)
// as category keys — a derived-N/A category is fully described by its
// out-of-scope requirement keys, so recording it as a category key would
// upgrade derived -> explicit on apply and mask per-requirement scope.
export const captureScopeTemplate = (
  name: string,
  input: {
    modules: ModuleData[];
    progress: Record<string, ProgressData>;
    requirementProgress: Record<string, RequirementProgress>;
  },
  nowIso: string,
  id: string,
  dataVersion?: string,
): ScopeTemplate => {
  const { modules, progress, requirementProgress } = input;
  const outOfScopeCategoryKeys: string[] = [];
  const outOfScopeRequirementKeys: string[] = [];
  for (const m of modules) {
    for (const c of m.categories) {
      const catKey = `${m.id}.${c.id}`;
      if (progress[catKey]?.applicability === false)
        outOfScopeCategoryKeys.push(catKey);
      for (const r of c.requirements ?? []) {
        const key = `${m.id}.${c.id}.${r.id}`;
        if (requirementProgress[key]?.applicability === false)
          outOfScopeRequirementKeys.push(key);
      }
    }
  }
  return {
    id,
    name,
    createdAt: nowIso,
    updatedAt: nowIso,
    outOfScopeCategoryKeys,
    outOfScopeRequirementKeys,
    dataVersion,
  };
};

// Sets applicability across every core category/requirement per the template
// (in-scope default; template's out-of-scope keys set false). Preserves
// levels/notes/evidence/reasons. Applies to only the categories/requirements
// present in `modules` (unknown template keys are ignored).
export const applyScopeTemplate = (
  a: Assessment,
  template: ScopeTemplate,
  modules: ModuleData[],
  nowIso: string,
): Assessment => {
  const catOut = new Set(template.outOfScopeCategoryKeys);
  const reqOut = new Set(template.outOfScopeRequirementKeys);
  const progress = { ...a.progress };
  const requirementProgress = { ...(a.requirementProgress ?? {}) };
  for (const m of modules) {
    for (const c of m.categories) {
      const catKey = `${m.id}.${c.id}`;
      progress[catKey] = setCategoryApplicability(
        a.progress[catKey],
        !catOut.has(catKey),
      );
      for (const r of c.requirements ?? []) {
        const key = `${m.id}.${c.id}.${r.id}`;
        requirementProgress[key] = {
          ...setRequirementApplicability(
            a.requirementProgress?.[key],
            !reqOut.has(key),
          ),
          updatedAt: nowIso,
        };
      }
    }
  }
  return { ...a, progress, requirementProgress };
};
