import type { ActionPlans, Assessment, Workspace } from "../types/types";

/** Single source of truth for the saved-state schema version the widget
 *  understands. A schema bump must touch exactly this file. */
export const WIDGET_MAX_STATE_SCHEMA_VERSION = 2;

/** Thrown when persisted/imported data is newer than this widget. Callers
 *  must surface ForwardCompatRefusal, never fall back to empty state. */
export class ForwardCompatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForwardCompatError";
  }
}

export const isSupportedStateSchemaVersion = (v: number): boolean =>
  v <= WIDGET_MAX_STATE_SCHEMA_VERSION;

export const assertSupportedStateSchemaVersion = (
  v: number,
  context: string,
): void => {
  if (!isSupportedStateSchemaVersion(v)) {
    throw new ForwardCompatError(
      `${context} uses stateSchemaVersion ${v}; widget supports up to ${WIDGET_MAX_STATE_SCHEMA_VERSION}.`,
    );
  }
};

const workspaceHasContent = (w: Workspace | undefined): boolean => {
  if (!w) return false;
  return (
    (w.intake?.length ?? 0) > 0 ||
    !!w.intakeCatalogVersion ||
    !!w.workingNotes ||
    (w.artifacts?.length ?? 0) > 0 ||
    (w.pocs?.length ?? 0) > 0 ||
    (w.checklist?.length ?? 0) > 0 ||
    (w.orphanedEntries?.length ?? 0) > 0
  );
};

const actionPlansHasContent = (p: ActionPlans | undefined): boolean =>
  !!p?.categories && Object.keys(p.categories).length > 0;

/** True iff the assessment carries any content that only the v2 (full)
 *  assessment shape can represent. A strict superset of the old
 *  requirementProgress-only check: a metadata/pkiEnvironment/workspace/
 *  actionPlans-only record (no requirementProgress yet) still needs the v2
 *  stamp, or a released widget's importYAMLFile (which rebuilds from a fixed
 *  v1 field list) would silently drop that data on import. */
export const hasV2Content = (a: Assessment): boolean =>
  Object.keys(a.requirementProgress ?? {}).length > 0 ||
  [
    a.organizationName,
    a.assessorPosition,
    a.assessorCompany,
    a.assessmentType,
    a.startDate,
    a.targetDate,
    a.finishDate,
  ].some(Boolean) ||
  (!!a.pkiEnvironment && Object.values(a.pkiEnvironment).some(Boolean)) ||
  workspaceHasContent(a.workspace) ||
  actionPlansHasContent(a.actionPlans);
