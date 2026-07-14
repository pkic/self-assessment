import type {
  Assessment,
  ProgressData,
  RequirementProgress,
  ActionPlans,
  PkiEnvironment,
  Workspace,
  EnabledExtension,
} from "../types/types";
import { normalizeActionPlans } from "./actionPlans";

export type MergeStrategy = "fill-gaps" | "prefer-newest" | "prefer-imported";

const isBlankStr = (s: string | undefined): boolean =>
  s === undefined || s === "";
const isBlankArr = (a: readonly unknown[] | undefined): boolean =>
  a === undefined || a.length === 0;

const parseMs = (iso: string | undefined): number => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

// Scalar string merge (also covers optional string unions like assessorPosition).
const mergeStr = <T extends string | undefined>(
  ex: T,
  inc: T,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): T => {
  switch (strategy) {
    case "fill-gaps":
      return isBlankStr(ex) && !isBlankStr(inc) ? inc : ex;
    case "prefer-imported":
      return isBlankStr(inc) && !isBlankStr(ex) ? ex : inc;
    case "prefer-newest": {
      const primary = incomingNewer ? inc : ex;
      const secondary = incomingNewer ? ex : inc;
      return isBlankStr(primary) && !isBlankStr(secondary)
        ? secondary
        : primary;
    }
  }
};

// Union of two keyed maps; `resolve` runs only when a key is present on both.
const mergeMap = <V>(
  ex: Record<string, V> | undefined,
  inc: Record<string, V> | undefined,
  resolve: (exV: V, incV: V) => V,
): Record<string, V> => {
  const out: Record<string, V> = { ...(ex ?? {}) };
  for (const [k, incV] of Object.entries(inc ?? {})) {
    out[k] = k in out ? resolve(out[k], incV) : incV;
  }
  return out;
};

// Union of two arrays keyed by `keyOf`; existing order first, incoming-only appended.
const mergeArrayByKey = <V>(
  ex: V[] | undefined,
  inc: V[] | undefined,
  keyOf: (v: V) => string,
  resolve: (exV: V, incV: V) => V,
): V[] => {
  const exArr = ex ?? [];
  const incArr = inc ?? [];
  const incByKey = new Map(incArr.map((v) => [keyOf(v), v]));
  const seen = new Set<string>();
  const out: V[] = [];
  for (const v of exArr) {
    const k = keyOf(v);
    seen.add(k);
    const incV = incByKey.get(k);
    out.push(incV ? resolve(v, incV) : v);
  }
  for (const v of incArr) {
    if (!seen.has(keyOf(v))) out.push(v);
  }
  return out;
};

// Whole-entry "pick a side" resolver (for entries with no per-field merge).
const pickEntry = <V>(
  ex: V,
  inc: V,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): V => {
  if (strategy === "fill-gaps") return ex; // never overwrite existing content
  if (strategy === "prefer-imported") return inc;
  return incomingNewer ? inc : ex; // prefer-newest, no per-entry timestamp
};

// A category-progress entry is "untouched" when level 0, still applicable,
// and carries no notes.
const progressEmpty = (p: ProgressData): boolean =>
  p.level === 0 &&
  p.applicability !== false &&
  isBlankStr(p.notes) &&
  isBlankStr(p.evidence) &&
  isBlankStr(p.pocId) &&
  isBlankStr(p.interviewDate) &&
  isBlankArr(p.artifactIds);

const resolveProgress = (
  ex: ProgressData,
  inc: ProgressData,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): ProgressData => {
  if (strategy === "prefer-imported") return inc;
  if (strategy === "prefer-newest") return incomingNewer ? inc : ex;
  // fill-gaps: fill an untouched existing from incoming, but keep the existing
  // scope decision (applicability/reason). result/description derive from level.
  if (progressEmpty(ex)) {
    return {
      level: inc.level,
      result: inc.result,
      description: inc.description,
      applicability: ex.applicability,
      applicabilityReason: ex.applicabilityReason,
      notes: isBlankStr(ex.notes) ? inc.notes : ex.notes,
      evidence: isBlankStr(ex.evidence) ? inc.evidence : ex.evidence,
      pocId: isBlankStr(ex.pocId) ? inc.pocId : ex.pocId,
      interviewDate: isBlankStr(ex.interviewDate)
        ? inc.interviewDate
        : ex.interviewDate,
      artifactIds: isBlankArr(ex.artifactIds)
        ? inc.artifactIds
        : ex.artifactIds,
    };
  }
  return ex;
};

const resolveRequirement = (
  ex: RequirementProgress,
  inc: RequirementProgress,
  strategy: MergeStrategy,
): RequirementProgress => {
  if (strategy === "prefer-imported") return inc;
  if (strategy === "prefer-newest") {
    const exT = parseMs(ex.updatedAt);
    const incT = parseMs(inc.updatedAt);
    return incT > exT ? inc : ex; // tie → existing
  }
  // fill-gaps: per-field union favouring existing; decision fields never gap-filled.
  return {
    level: ex.level !== 0 ? ex.level : inc.level,
    applicability: ex.applicability,
    applicabilityReason: ex.applicabilityReason,
    notes: isBlankStr(ex.notes) ? inc.notes : ex.notes,
    evidence: isBlankStr(ex.evidence) ? inc.evidence : ex.evidence,
    completed: ex.completed ?? inc.completed,
    flagged: ex.flagged ?? inc.flagged,
    flagNote: isBlankStr(ex.flagNote) ? inc.flagNote : ex.flagNote,
    pocId: ex.pocId ?? inc.pocId,
    interviewDate: ex.interviewDate ?? inc.interviewDate,
    artifactIds: isBlankArr(ex.artifactIds) ? inc.artifactIds : ex.artifactIds,
    related: isBlankArr(ex.related) ? inc.related : ex.related,
    assessorReview: ex.assessorReview ?? inc.assessorReview,
    updatedAt: ex.updatedAt ?? inc.updatedAt,
  };
};

type ActionPlanEntry = NonNullable<ActionPlans["categories"]>[string];

const resolveActionPlan = (
  ex: ActionPlanEntry,
  inc: ActionPlanEntry,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): ActionPlanEntry => {
  if (strategy === "prefer-imported") return inc;
  if (strategy === "prefer-newest") return incomingNewer ? inc : ex;
  return {
    targetLevel: ex.targetLevel, // decision — keep existing
    objectives: isBlankArr(ex.objectives) ? inc.objectives : ex.objectives,
    responsibility: isBlankStr(ex.responsibility)
      ? inc.responsibility
      : ex.responsibility,
    responsiblePocId: isBlankStr(ex.responsiblePocId)
      ? inc.responsiblePocId
      : ex.responsiblePocId,
    targetDate: isBlankStr(ex.targetDate) ? inc.targetDate : ex.targetDate,
    resources: isBlankStr(ex.resources) ? inc.resources : ex.resources,
    outputs: isBlankArr(ex.outputs) ? inc.outputs : ex.outputs,
    tasks: isBlankArr(ex.tasks) ? inc.tasks : ex.tasks,
    comments: isBlankStr(ex.comments) ? inc.comments : ex.comments,
  };
};

const mergePkiEnvironment = (
  ex: PkiEnvironment | undefined,
  inc: PkiEnvironment | undefined,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): PkiEnvironment | undefined => {
  if (!ex) return inc;
  if (!inc) return ex;
  return {
    components: mergeStr(
      ex.components,
      inc.components,
      strategy,
      incomingNewer,
    ),
    outOfScopeConsiderations: mergeStr(
      ex.outOfScopeConsiderations,
      inc.outOfScopeConsiderations,
      strategy,
      incomingNewer,
    ),
    highLevelDesign: mergeStr(
      ex.highLevelDesign,
      inc.highLevelDesign,
      strategy,
      incomingNewer,
    ),
    pointsOfInteraction: mergeStr(
      ex.pointsOfInteraction,
      inc.pointsOfInteraction,
      strategy,
      incomingNewer,
    ),
  };
};

const mergeWorkspace = (
  ex: Workspace | undefined,
  inc: Workspace | undefined,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): Workspace | undefined => {
  if (!ex) return inc;
  if (!inc) return ex;
  const pick = <V>(a: V, b: V): V => pickEntry(a, b, strategy, incomingNewer);
  return {
    intake: mergeArrayByKey(ex.intake, inc.intake, (v) => v.questionId, pick),
    intakeCatalogVersion: mergeStr(
      ex.intakeCatalogVersion,
      inc.intakeCatalogVersion,
      strategy,
      incomingNewer,
    ),
    workingNotes: mergeStr(
      ex.workingNotes,
      inc.workingNotes,
      strategy,
      incomingNewer,
    ),
    artifacts: mergeArrayByKey(ex.artifacts, inc.artifacts, (v) => v.id, pick),
    pocs: mergeArrayByKey(ex.pocs, inc.pocs, (v) => v.id, pick),
    checklist: mergeArrayByKey(
      ex.checklist,
      inc.checklist,
      (v) => v.itemId,
      pick,
    ),
    orphanedEntries: mergeArrayByKey(
      ex.orphanedEntries,
      inc.orphanedEntries,
      (v) => v.originalKey,
      pick,
    ),
  };
};

const mergeActionPlans = (
  ex: ActionPlans | undefined,
  inc: ActionPlans | undefined,
  strategy: MergeStrategy,
  incomingNewer: boolean,
): ActionPlans | undefined => {
  ex = normalizeActionPlans(ex);
  inc = normalizeActionPlans(inc);
  if (!ex) return inc;
  if (!inc) return ex;
  return {
    categories: mergeMap(ex.categories, inc.categories, (a, b) =>
      resolveActionPlan(a, b, strategy, incomingNewer),
    ),
  };
};

export const mergeAssessments = (
  existing: Assessment,
  incoming: Assessment,
  strategy: MergeStrategy,
): Assessment => {
  const incomingNewer =
    parseMs(incoming.meta.updatedAt) > parseMs(existing.meta.updatedAt);
  const s = (ex: string | undefined, inc: string | undefined) =>
    mergeStr(ex, inc, strategy, incomingNewer);

  return {
    // Structural / transient — always existing's.
    id: existing.id,
    dataVersion: existing.dataVersion,
    sourceStructure: existing.sourceStructure,
    lastView: existing.lastView,
    lastPosition: existing.lastPosition,
    // Scalars.
    name: s(existing.name, incoming.name) ?? existing.name,
    assessmentName:
      s(existing.assessmentName, incoming.assessmentName) ??
      existing.assessmentName,
    assessorName:
      s(existing.assessorName, incoming.assessorName) ?? existing.assessorName,
    useCaseDescription:
      s(existing.useCaseDescription, incoming.useCaseDescription) ??
      existing.useCaseDescription,
    organizationName: s(existing.organizationName, incoming.organizationName),
    assessorCompany: s(existing.assessorCompany, incoming.assessorCompany),
    assessorPosition: mergeStr(
      existing.assessorPosition,
      incoming.assessorPosition,
      strategy,
      incomingNewer,
    ),
    assessmentType: mergeStr(
      existing.assessmentType,
      incoming.assessmentType,
      strategy,
      incomingNewer,
    ),
    startDate: s(existing.startDate, incoming.startDate),
    targetDate: s(existing.targetDate, incoming.targetDate),
    finishDate: s(existing.finishDate, incoming.finishDate),
    // Keyed maps.
    progress: mergeMap(existing.progress, incoming.progress, (a, b) =>
      resolveProgress(a, b, strategy, incomingNewer),
    ),
    requirementProgress:
      existing.requirementProgress || incoming.requirementProgress
        ? mergeMap(
            existing.requirementProgress,
            incoming.requirementProgress,
            (a, b) => resolveRequirement(a, b, strategy),
          )
        : undefined,
    enabledExtensions: mergeArrayByKey<EnabledExtension>(
      existing.enabledExtensions,
      incoming.enabledExtensions,
      (v) => v.id,
      (a, b) => pickEntry(a, b, strategy, incomingNewer),
    ),
    // Structured sub-objects.
    pkiEnvironment: mergePkiEnvironment(
      existing.pkiEnvironment,
      incoming.pkiEnvironment,
      strategy,
      incomingNewer,
    ),
    workspace: mergeWorkspace(
      existing.workspace,
      incoming.workspace,
      strategy,
      incomingNewer,
    ),
    actionPlans: mergeActionPlans(
      existing.actionPlans,
      incoming.actionPlans,
      strategy,
      incomingNewer,
    ),
    // Caller bumps updatedAt before writing. `importedFromId` is preserved
    // from existing — a merge keeps the existing record's identity (same id),
    // so there is no new provenance to record and any prior provenance is kept.
    meta: {
      createdAt:
        parseMs(existing.meta.createdAt) <= parseMs(incoming.meta.createdAt)
          ? existing.meta.createdAt
          : incoming.meta.createdAt,
      updatedAt: existing.meta.updatedAt,
      importedFromId: existing.meta.importedFromId,
    },
  };
};
