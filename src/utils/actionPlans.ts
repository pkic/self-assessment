import type { ActionPlans } from "../types/types";

export type ActionPlanEntry = NonNullable<ActionPlans["categories"]>[string];

// Seed a plan for a category. If the category is already planned, return `ap`
// UNCHANGED (same reference) rather than clobbering the existing plan.
export const addActionPlan = (
  ap: ActionPlans | undefined,
  categoryKey: string,
  targetLevel: number,
): ActionPlans => {
  if (ap?.categories?.[categoryKey]) return ap;
  return {
    ...ap,
    categories: { ...(ap?.categories ?? {}), [categoryKey]: { targetLevel } },
  };
};

// Merge one field onto an EXISTING plan entry, preserving its other fields and
// every other entry. If the category has no plan, return `ap` unchanged
// (never fabricate a plan without a targetLevel).
export const updateActionPlanField = <K extends keyof ActionPlanEntry>(
  ap: ActionPlans | undefined,
  categoryKey: string,
  field: K,
  value: ActionPlanEntry[K],
): ActionPlans => {
  const entry = ap?.categories?.[categoryKey];
  if (!entry) return ap ?? { categories: {} };
  return {
    ...ap,
    categories: {
      ...ap!.categories,
      [categoryKey]: { ...entry, [field]: value },
    },
  };
};

// Delete a plan entry, preserving the rest. No-op (same reference) when absent.
export const removeActionPlan = (
  ap: ActionPlans | undefined,
  categoryKey: string,
): ActionPlans => {
  if (!ap?.categories?.[categoryKey]) return ap ?? { categories: {} };
  const categories = { ...ap.categories };
  delete categories[categoryKey];
  return { ...ap, categories };
};

type PlanListField = "objectives" | "outputs";
type PlanListItem = { id: string; text: string };
type PlanTask = { itemId: string; label: string; done: boolean };

const withEntry = (
  ap: ActionPlans | undefined,
  key: string,
  update: (entry: ActionPlanEntry) => ActionPlanEntry,
): ActionPlans => {
  const entry = ap?.categories?.[key];
  if (!entry) return ap ?? { categories: {} };
  return {
    ...ap,
    categories: { ...ap!.categories, [key]: update(entry) },
  };
};

export const addPlanListItem = (
  ap: ActionPlans | undefined,
  key: string,
  field: PlanListField,
  makeId: () => string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    [field]: [
      ...((entry[field] as PlanListItem[] | undefined) ?? []),
      {
        id: makeId(),
        text: "",
      },
    ],
  }));

export const updatePlanListItem = (
  ap: ActionPlans | undefined,
  key: string,
  field: PlanListField,
  id: string,
  text: string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    [field]: ((entry[field] as PlanListItem[] | undefined) ?? []).map((i) =>
      i.id === id ? { ...i, text } : i,
    ),
  }));

export const removePlanListItem = (
  ap: ActionPlans | undefined,
  key: string,
  field: PlanListField,
  id: string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    [field]: ((entry[field] as PlanListItem[] | undefined) ?? []).filter(
      (i) => i.id !== id,
    ),
  }));

export const addPlanTask = (
  ap: ActionPlans | undefined,
  key: string,
  makeId: () => string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    tasks: [
      ...(entry.tasks ?? []),
      { itemId: makeId(), label: "", done: false },
    ],
  }));

export const togglePlanTask = (
  ap: ActionPlans | undefined,
  key: string,
  itemId: string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    tasks: (entry.tasks ?? []).map((t) =>
      t.itemId === itemId ? { ...t, done: !t.done } : t,
    ),
  }));

export const updatePlanTaskLabel = (
  ap: ActionPlans | undefined,
  key: string,
  itemId: string,
  label: string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    tasks: (entry.tasks ?? []).map((t) =>
      t.itemId === itemId ? { ...t, label } : t,
    ),
  }));

export const removePlanTask = (
  ap: ActionPlans | undefined,
  key: string,
  itemId: string,
): ActionPlans =>
  withEntry(ap, key, (entry) => ({
    ...entry,
    tasks: (entry.tasks ?? []).filter((t) => t.itemId !== itemId),
  }));

const isDateOnly = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // Guard: `new Date("2026-99-99…")` is an Invalid Date, and calling
  // `.toISOString()` on it THROWS — check validity first.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Coerce any legacy string-shaped plan into the current shape. Pure + idempotent
// (deterministic single-item ids; already-new arrays pass through). A legacy
// `schedule` becomes `targetDate` when it is a valid date, else is appended to
// `comments` so nothing is lost; `schedule` is never emitted.
export const normalizeActionPlans = (
  ap: ActionPlans | undefined,
): ActionPlans | undefined => {
  if (!ap?.categories) return ap;
  const out: NonNullable<ActionPlans["categories"]> = {};
  for (const [key, raw] of Object.entries(ap.categories)) {
    // `raw` may carry the legacy string fields, so read it loosely.
    const e = raw as Record<string, unknown> & { targetLevel: number };
    const entry: ActionPlanEntry = { targetLevel: e.targetLevel };

    if (Array.isArray(e.objectives))
      entry.objectives = e.objectives as PlanListItem[];
    else if (typeof e.objectives === "string" && e.objectives.trim())
      entry.objectives = [{ id: "obj-0", text: e.objectives }];

    if (Array.isArray(e.outputs)) entry.outputs = e.outputs as PlanListItem[];
    else if (typeof e.outputs === "string" && e.outputs.trim())
      entry.outputs = [{ id: "out-0", text: e.outputs }];

    if (Array.isArray(e.tasks)) entry.tasks = e.tasks as PlanTask[];
    else if (typeof e.tasks === "string" && e.tasks.trim())
      entry.tasks = [{ itemId: "task-0", label: e.tasks, done: false }];

    if (typeof e.responsibility === "string" && e.responsibility)
      entry.responsibility = e.responsibility;
    if (typeof e.responsiblePocId === "string" && e.responsiblePocId)
      entry.responsiblePocId = e.responsiblePocId;
    if (typeof e.resources === "string" && e.resources)
      entry.resources = e.resources;

    let targetDate =
      typeof e.targetDate === "string" && e.targetDate
        ? e.targetDate
        : undefined;
    let comments =
      typeof e.comments === "string" && e.comments ? e.comments : undefined;
    if (typeof e.schedule === "string" && e.schedule.trim()) {
      if (!targetDate && isDateOnly(e.schedule)) targetDate = e.schedule;
      else comments = comments ? `${comments}\n${e.schedule}` : e.schedule;
    }
    if (targetDate) entry.targetDate = targetDate;
    if (comments) entry.comments = comments;

    out[key] = entry;
  }
  return { ...ap, categories: out };
};

// Return `a` with its actionPlans normalized via `normalizeActionPlans`.
export const normalizeAssessmentActionPlans = <
  T extends { actionPlans?: ActionPlans },
>(
  a: T,
): T => ({ ...a, actionPlans: normalizeActionPlans(a.actionPlans) });
