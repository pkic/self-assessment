import type { Assessment, RequirementProgress } from "../types/types";

/** The requirement-progress fields editable through the generic
 *  requirement-field writer (RequirementCard.onFieldChange and its forwarders).
 *  Single source of truth for the union re-used by RequirementCard, Category,
 *  Module, and Assessment — widen HERE only. */
export type RequirementEditableField =
  | "notes"
  | "evidence"
  | "applicabilityReason"
  | "flagged"
  | "flagNote"
  | "completed"
  | "pocId"
  | "interviewDate"
  | "artifactIds";

/** The level-0 (Not Assessed), applicable, empty-text starting shape for a
 *  requirement that has never been touched. */
export const defaultRequirementProgress = (): RequirementProgress => ({
  level: 0,
  applicability: true,
  notes: "",
  evidence: "",
});

/** Merges a patch onto prev-or-default. Pure and clock-free: `updatedAt` is
 *  never read from the clock here — callers stamp it into the patch. */
export const computeNextRequirementProgress = (
  prev: RequirementProgress | undefined,
  patch: Partial<RequirementProgress>,
): RequirementProgress => ({
  ...(prev ?? defaultRequirementProgress()),
  ...patch,
});

/** Writes ONLY `assessment.requirementProgress` at the 3-segment key
 *  `${moduleId}.${categoryId}.${requirementId}`. Never touches
 *  `a.progress` — the returned assessment carries the SAME `progress`
 *  reference as the input, which is the progress-immutability invariant
 *  requirement edits must uphold. */
export const applyRequirementEdit = (
  a: Assessment,
  key: string,
  patch: Partial<RequirementProgress>,
): Assessment => ({
  ...a,
  requirementProgress: {
    ...a.requirementProgress,
    [key]: computeNextRequirementProgress(a.requirementProgress?.[key], patch),
  },
});

/** Removes every `${moduleId}.${categoryId}.*` key from
 *  `requirementProgress`, leaving `a.progress` and other categories'
 *  requirement entries intact. Returns the SAME `progress` reference. */
export const clearRequirementProgressForCategory = (
  a: Assessment,
  moduleId: string,
  categoryId: string,
): Assessment => {
  if (!a.requirementProgress) return a;
  const prefix = `${moduleId}.${categoryId}.`;
  const next: Record<string, RequirementProgress> = {};
  for (const [key, value] of Object.entries(a.requirementProgress)) {
    if (!key.startsWith(prefix)) next[key] = value;
  }
  return { ...a, requirementProgress: next };
};
