import type {
  AssessmentData,
  CategoryData,
  RequirementProgress,
} from "../types/types";

export interface RequirementFilterState {
  text: string;
  statuses: Set<
    | "not-assessed"
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "na"
    | "completed"
    | "flagged"
  >;
}

export interface RequirementView {
  moduleId: string;
  categoryId: string;
  requirementId: string;
  key: string;
  description: string;
  guidance: string;
  assessment: string;
  weight: number;
  level: number;
  applicability: boolean;
  completed: boolean;
  flagged: boolean;
}

export const buildRequirementViews = (
  moduleId: string,
  category: CategoryData,
  requirementProgress: Record<string, RequirementProgress> | undefined,
): RequirementView[] => {
  const reqs = category.requirements ?? [];

  return reqs.map((r) => {
    const key = `${moduleId}.${category.id}.${r.id}`;
    const rp = requirementProgress?.[key];
    const applicability = rp?.applicability ?? true;
    return {
      moduleId,
      categoryId: category.id,
      requirementId: r.id,
      key,
      description: r.description,
      guidance: r.guidance,
      assessment: r.assessment,
      weight: r.weight,
      level: rp?.level ?? 0,
      applicability,
      completed: rp?.completed ?? false,
      flagged: rp?.flagged ?? false,
    };
  });
};

export const matchesFilter = (
  v: RequirementView,
  f: RequirementFilterState,
): boolean => {
  const text = f.text.trim().toLowerCase();
  if (text) {
    const hay = `${v.description} ${v.guidance} ${v.assessment}`.toLowerCase();
    if (!hay.includes(text)) return false;
  }
  if (f.statuses.size === 0) return true;
  for (const s of f.statuses) {
    if (s === "not-assessed" && v.applicability && v.level === 0) return true;
    if (s === "na" && !v.applicability) return true;
    if (s === "completed" && v.completed) return true;
    if (s === "flagged" && v.flagged) return true;
    if (/^[1-5]$/.test(s) && v.applicability && v.level === Number(s))
      return true;
  }
  return false;
};

// Resolves a `${moduleId}.${categoryId}.${requirementId}` (or
// `${moduleId}.${categoryId}`) key to a human-readable name against the
// currently loaded model — used to build the "Resumed at: {name}" toast
// copy. Never an ordinal: names are stable across model edits, positional
// numbers are not. Returns undefined when the module/category/requirement
// no longer exists (model changed), so callers can fall back to a generic
// message instead of showing a stale or nonsensical name.
export const resolveRequirementName = (
  key: string,
  data: AssessmentData | null | undefined,
): string | undefined => {
  if (!data) return undefined;
  const [moduleId, categoryId, requirementId] = key.split(".");
  if (!moduleId || !categoryId) return undefined;
  const category = data.modules
    .find((m) => m.id === moduleId)
    ?.categories.find((c) => c.id === categoryId);
  if (!category) return undefined;
  if (!requirementId) return category.name;
  const requirement = category.requirements?.find(
    (r) => r.id === requirementId,
  );
  return requirement?.description;
};

export const nextUnassessedKey = (
  views: RequirementView[],
  afterKey?: string,
): string | undefined => {
  const start = afterKey ? views.findIndex((v) => v.key === afterKey) + 1 : 0;
  for (let i = start; i < views.length; i++) {
    const v = views[i];
    if (v.applicability && v.level === 0) return v.key;
  }
  return undefined;
};
