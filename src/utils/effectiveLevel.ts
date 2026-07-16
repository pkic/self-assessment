import type {
  CategoryData,
  ExtensionData,
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../types/types";

export interface EffectiveCategoryLevel {
  /** Fractional. -1 = Not Applicable (explicit or derived), 0 = Not Assessed. */
  raw: number;
  /** raw === -1 ? -1 : Math.floor(raw). The only value that may index a level
   *  label, a maturity CSS token, or travel in the share hash. */
  display: number;
  source: "requirements" | "self" | "derived-not-applicable";
  assessedCount: number;
  totalInScope: number;
  /** The denominator used to produce `raw` when source === "requirements"
   *  (sum of overlay-adjusted weights of the in-scope ASSESSED requirements).
   *  0 for the self/derived-not-applicable cases (the blend uses getWeightSum
   *  there instead). Consumed by calculateBlendedLevel as WeightSum_C so the
   *  blend denominator matches the one that produced Level_C. */
  weightSum: number;
}

export const isInScope = (e: { applicability: boolean }): boolean =>
  e.applicability !== false;

/** Effective requirement weight = base weight, adjusted by ONLY the given
 *  extension's requirement overlay for this category (never a cumulative
 *  multi-extension sum). Clamped at zero. */
const effectiveRequirementWeight = (
  base: number,
  reqId: string,
  moduleId: string,
  categoryId: string,
  extension: ExtensionData | undefined,
): number => {
  if (!extension?.overlays) return Math.max(0, base);
  const mod = extension.overlays.modules.find((m) => m.id === moduleId);
  const cat = mod?.categories.find((c) => c.id === categoryId);
  const ov = cat?.requirements?.find((r) => r.id === reqId);
  if (!ov) return Math.max(0, base);
  let w = base;
  if (ov.type === "multiplier" && ov.multiplier !== undefined)
    w = base * ov.multiplier;
  else if (ov.type === "addition" && ov.addition !== undefined)
    w = base + ov.addition;
  else if (ov.type === "override" && ov.override !== undefined) w = ov.override;
  return Math.max(0, w);
};

const displayOf = (raw: number): number => (raw === -1 ? -1 : Math.floor(raw));

export const calculateEffectiveCategoryLevel = (
  moduleId: string,
  category: CategoryData,
  progress: Record<string, ProgressData>,
  requirementProgress: Record<string, RequirementProgress> | undefined,
  opts?: { extension?: ExtensionData },
): EffectiveCategoryLevel => {
  const catKey = `${moduleId}.${category.id}`;
  const catProgress = progress[catKey];

  // Explicit category-level Not Applicable takes precedence.
  if (catProgress && catProgress.applicability === false) {
    return {
      raw: -1,
      display: -1,
      source: "self",
      assessedCount: 0,
      totalInScope: 0,
      weightSum: 0,
    };
  }

  const reqs = category.requirements ?? [];
  const inScope = reqs.filter((r) => {
    const rp = requirementProgress?.[`${moduleId}.${category.id}.${r.id}`];
    return !rp || isInScope(rp);
  });

  // A category with requirements, all of which are individually scoped out,
  // is derived Not Applicable and excluded from every rollup.
  if (reqs.length > 0 && inScope.length === 0) {
    return {
      raw: -1,
      display: -1,
      source: "derived-not-applicable",
      assessedCount: 0,
      totalInScope: 0,
      weightSum: 0,
    };
  }

  const assessed = inScope.filter((r) => {
    const rp = requirementProgress?.[`${moduleId}.${category.id}.${r.id}`];
    return rp && rp.level > 0;
  });

  if (assessed.length === 0) {
    // Not requirement-assessed → fall back to the self-declared category level.
    const raw = catProgress?.level ?? 0;
    return {
      raw,
      display: displayOf(raw),
      source: "self",
      assessedCount: 0,
      totalInScope: inScope.length,
      weightSum: 0,
    };
  }

  let num = 0;
  let den = 0;
  for (const r of assessed) {
    const rp = requirementProgress![`${moduleId}.${category.id}.${r.id}`];
    const w = effectiveRequirementWeight(
      r.weight,
      r.id,
      moduleId,
      category.id,
      opts?.extension,
    );
    num += rp.level * w;
    den += w;
  }
  const raw = den > 0 ? num / den : 0;
  return {
    raw,
    display: displayOf(raw),
    source: "requirements",
    assessedCount: assessed.length,
    totalInScope: inScope.length,
    weightSum: den,
  };
};

export interface EffectiveCalcRow {
  id: string;
  description: string;
  level: number;
  baseWeight: number;
  effectiveWeight: number;
}

export interface EffectiveCalcExplanation {
  rows: EffectiveCalcRow[];
  weightSum: number;
  weightedSum: number;
  raw: number;
  display: number;
  source: "requirements" | "self" | "derived-not-applicable";
  assessedCount: number;
  totalInScope: number;
}

/** Point-of-use arithmetic transparency for the "Show calculation" popover:
 *  the in-scope ASSESSED requirements with their effective weights, the sums,
 *  raw_C, and the floored display level. raw/display/weightSum/source match
 *  calculateEffectiveCategoryLevel for the same inputs (pinned by test). */
export const explainEffectiveCategoryLevel = (
  moduleId: string,
  category: CategoryData,
  progress: Record<string, ProgressData>,
  requirementProgress: Record<string, RequirementProgress> | undefined,
  opts?: { extension?: ExtensionData },
): EffectiveCalcExplanation => {
  const eff = calculateEffectiveCategoryLevel(
    moduleId,
    category,
    progress,
    requirementProgress,
    opts,
  );

  if (eff.source !== "requirements") {
    return {
      rows: [],
      weightSum: 0,
      weightedSum: 0,
      raw: eff.raw,
      display: eff.display,
      source: eff.source,
      assessedCount: eff.assessedCount,
      totalInScope: eff.totalInScope,
    };
  }

  const rows: EffectiveCalcRow[] = [];
  let weightedSum = 0;
  for (const r of category.requirements ?? []) {
    const rp = requirementProgress?.[`${moduleId}.${category.id}.${r.id}`];
    if (!rp || rp.applicability === false || rp.level <= 0) continue;
    const effectiveWeight = effectiveRequirementWeight(
      r.weight,
      r.id,
      moduleId,
      category.id,
      opts?.extension,
    );
    rows.push({
      id: r.id,
      description: r.description,
      level: rp.level,
      baseWeight: r.weight,
      effectiveWeight,
    });
    weightedSum += rp.level * effectiveWeight;
  }

  return {
    rows,
    weightSum: eff.weightSum,
    weightedSum,
    raw: eff.raw,
    display: eff.display,
    source: eff.source,
    assessedCount: eff.assessedCount,
    totalInScope: eff.totalInScope,
  };
};

export const computeCompleteness = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  requirementProgress: Record<string, RequirementProgress> | undefined,
): { assessed: number; totalInScope: number; complete: boolean } => {
  let assessed = 0;
  let totalInScope = 0;
  for (const m of modules) {
    for (const c of m.categories) {
      const catProgress = progress[`${m.id}.${c.id}`];
      if (catProgress && catProgress.applicability === false) continue;
      const reqs = c.requirements ?? [];
      const inScope = reqs.filter((r) => {
        const rp = requirementProgress?.[`${m.id}.${c.id}.${r.id}`];
        return !rp || isInScope(rp);
      });
      // A category whose requirements are all scoped out is Not Applicable.
      if (reqs.length > 0 && inScope.length === 0) continue;
      for (const r of inScope) {
        totalInScope += 1;
        const rp = requirementProgress?.[`${m.id}.${c.id}.${r.id}`];
        if (rp && rp.level > 0) assessed += 1;
      }
    }
  }
  return {
    assessed,
    totalInScope,
    complete: totalInScope > 0 && assessed === totalInScope,
  };
};
