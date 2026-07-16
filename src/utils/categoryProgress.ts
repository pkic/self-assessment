import type { ProgressData } from "../types/types";
import LevelResult from "../enums/LevelResult";

/** The level-0 (Not Assessed), applicable, empty-text starting shape for a
 *  category `progress[key]` entry that has never been touched. Mirrors
 *  `defaultRequirementProgress` in requirementProgress.ts. */
export const defaultCategoryProgress = (): ProgressData => ({
  level: 0,
  result: LevelResult[0],
  description: "",
  applicability: true,
});

/** Toggles `applicability` on a category `progress[key]` entry, flipping
 *  `result` between "Not Applicable" and the level-derived result. Preserves
 *  every other field on the entry — including `applicabilityReason` — so a
 *  reason captured while a category is out of scope survives a
 *  scope-out -> scope-in -> scope-out round trip instead of being dropped by
 *  a hand-built replacement object. */
export const computeNextCategoryApplicability = (
  prev: ProgressData | undefined,
): ProgressData => {
  const base = prev ?? defaultCategoryProgress();
  return {
    ...base,
    result: base.applicability
      ? LevelResult[-1]
      : LevelResult[base.level] || defaultCategoryProgress().result,
    applicability: !base.applicability,
  };
};

/** Writes (or clears) the free-text reason on a category `progress[key]`
 *  entry, preserving every other field. Used when a category is toggled Not
 *  Applicable and the user explains why. */
export const computeNextCategoryReason = (
  prev: ProgressData | undefined,
  reason: string,
): ProgressData => ({
  ...(prev ?? defaultCategoryProgress()),
  applicabilityReason: reason,
});

/** Writes the free-text notes on a category `progress[key]` entry, preserving
 *  every other field. Mirrors `computeNextCategoryReason`. */
export const computeNextCategoryNotes = (
  entry: ProgressData | undefined,
  notes: string,
): ProgressData => ({
  ...(entry ?? defaultCategoryProgress()),
  notes,
});

/** The category-grain free-text/link fields the extension full-view card can
 *  write. Extensions have no requirements, so these live on the category
 *  progress entry alongside `notes`/`applicabilityReason` (which keep their own
 *  dedicated reducers). */
export type CategoryEditableField =
  "evidence" | "pocId" | "interviewDate" | "artifactIds";

/** Writes one additive category-grain field, preserving every other field.
 *  Mirrors requirementProgress.ts's per-field edit shape. */
export const computeNextCategoryField = <K extends CategoryEditableField>(
  entry: ProgressData | undefined,
  field: K,
  value: ProgressData[K],
): ProgressData => ({
  ...(entry ?? defaultCategoryProgress()),
  [field]: value,
});

/** Rebuilds a category `progress[key]` entry for a new self-declared level.
 *  Reproduces the byte-shape `handleLevelChange` used to build inline: carries
 *  `applicability` (defaulted entry -> true, existing entry -> its own value)
 *  and includes `applicabilityReason`/`notes` only when truthy, so a blank
 *  optional string is never persisted. */
export const computeNextCategoryLevel = (
  entry: ProgressData | undefined,
  next: { level: number; result: string; description: string },
): ProgressData => {
  const base = entry ?? defaultCategoryProgress();
  const out: ProgressData = {
    level: next.level,
    result: next.result,
    description: next.description,
    applicability: base.applicability,
  };
  if (base.applicabilityReason)
    out.applicabilityReason = base.applicabilityReason;
  if (base.notes) out.notes = base.notes;
  if (base.evidence) out.evidence = base.evidence;
  if (base.pocId) out.pocId = base.pocId;
  if (base.interviewDate) out.interviewDate = base.interviewDate;
  if (base.artifactIds && base.artifactIds.length > 0)
    out.artifactIds = base.artifactIds;
  return out;
};
