import {
  Assessment as SavedAssessment,
  MigrationResult,
} from "../../types/types";
import { normalizeActionPlans } from "../../utils/actionPlans";

/**
 * Pure construction of the migrated assessment record from the migration
 * engine's result. Consumes the engine's remapped requirement/action-plan
 * data instead of carrying the old assessment's now-stale-keyed entries
 * over verbatim.
 */
export const buildMigratedAssessment = (
  active: SavedAssessment,
  result: MigrationResult,
  dataVersion: string,
  now: string,
  id: string,
): SavedAssessment => {
  // Merge orphans: CONCAT any orphans the source assessment still carried
  // (a second migration B->C must not silently drop B's still-unrescued
  // orphans) with this round's newly-orphaned entries.
  const priorOrphans = active.workspace?.orphanedEntries ?? [];
  const mergedOrphans = priorOrphans.concat(result.orphanedEntries ?? []);
  const migratedWorkspace = {
    ...active.workspace,
    ...(mergedOrphans.length > 0 ? { orphanedEntries: mergedOrphans } : {}),
  };
  return {
    ...active,
    id,
    name: `${active.name} (PKIMM ${dataVersion})`,
    dataVersion,
    progress: result.migratedProgress,
    // Consume the engine's remapped requirement/action-plan data instead of
    // carrying the old assessment's now-stale-keyed entries over verbatim.
    // `?? {}` matches the pre-fix behavior for quick assessments (an empty
    // requirementProgress reads identically to undefined via hasV2Content).
    requirementProgress: result.migratedRequirementProgress ?? {},
    ...(result.migratedActionPlans
      ? { actionPlans: normalizeActionPlans(result.migratedActionPlans) }
      : {}),
    // Guarded: only set `workspace` when the source had one OR there are
    // orphans, so a quick assessment isn't stamped with an empty {}.
    ...(active.workspace || mergedOrphans.length > 0
      ? { workspace: migratedWorkspace }
      : {}),
    enabledExtensions: result.migratedEnabledExtensions,
    sourceStructure: result.newSourceStructure,
    meta: {
      createdAt: now,
      updatedAt: now,
      importedFromId: active.id,
    },
  };
};
