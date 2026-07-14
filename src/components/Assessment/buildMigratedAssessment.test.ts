import { buildMigratedAssessment } from "./buildMigratedAssessment";
import {
  Assessment as SavedAssessment,
  MigrationResult,
} from "../../types/types";

const baseActive: SavedAssessment = {
  id: "old-id",
  name: "My Assessment",
  dataVersion: "1.0.0",
  progress: {
    "G.1": {
      level: 3,
      applicability: true,
      result: "Foundational",
      description: "",
    },
  },
  enabledExtensions: [],
  assessmentName: "My Assessment",
  assessorName: "Assessor",
  useCaseDescription: "",
  requirementProgress: {
    "G.1.1": {
      level: 3,
      applicability: true,
      notes: "stale note",
      evidence: "stale evidence",
    },
  },
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

const baseResult: MigrationResult = {
  migratedProgress: {
    "G.strategy-and-vision": {
      level: 3,
      applicability: true,
      result: "Foundational",
      description: "",
    },
  },
  migratedRequirementProgress: {
    "G.strategy-and-vision.new-req": {
      level: 3,
      applicability: true,
      notes: "remapped note",
      evidence: "remapped evidence",
    },
  },
  migratedActionPlans: {
    categories: {
      "G.strategy-and-vision": { targetLevel: 4 },
    },
  },
  orphanedEntries: [
    {
      originalKey: "G.1.2",
      requirementName: "Some retired requirement",
      payload: {
        level: 2,
        applicability: true,
        notes: "orphan note",
        evidence: "",
      },
    },
  ],
  migratedEnabledExtensions: [],
  newSourceStructure: { byKey: {} },
  summary: {
    mapped: 1,
    addedInTarget: [],
    unmappedFromSource: [],
    reclassifiedLevel1ToZero: 0,
  },
};

describe("buildMigratedAssessment", () => {
  it("uses the engine's migratedRequirementProgress, not the stale old map", () => {
    const migrated = buildMigratedAssessment(
      baseActive,
      baseResult,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.requirementProgress).toEqual(
      baseResult.migratedRequirementProgress,
    );
    expect(migrated.requirementProgress).not.toEqual(
      baseActive.requirementProgress,
    );
  });

  it("concatenates prior orphans with the result's new orphaned entries", () => {
    const activeWithPriorOrphans: SavedAssessment = {
      ...baseActive,
      workspace: {
        orphanedEntries: [
          {
            originalKey: "G.0.old",
            requirementName: "Previously orphaned requirement",
            payload: {
              level: 1,
              applicability: true,
              notes: "",
              evidence: "",
            },
          },
        ],
      },
    };

    const migrated = buildMigratedAssessment(
      activeWithPriorOrphans,
      baseResult,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.workspace?.orphanedEntries).toEqual([
      ...(activeWithPriorOrphans.workspace?.orphanedEntries ?? []),
      ...(baseResult.orphanedEntries ?? []),
    ]);
  });

  it("sets actionPlans from the result when present", () => {
    const migrated = buildMigratedAssessment(
      baseActive,
      baseResult,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.actionPlans).toEqual(baseResult.migratedActionPlans);
  });

  it("normalizes a legacy string-shaped migratedActionPlans entry", () => {
    const resultWithLegacyActionPlans: MigrationResult = {
      ...baseResult,
      migratedActionPlans: {
        categories: {
          "G.strategy-and-vision": {
            targetLevel: 4,
            objectives: "Formalise lifecycle",
            schedule: "2026-09-30",
          },
        },
      } as unknown as MigrationResult["migratedActionPlans"],
    };

    const migrated = buildMigratedAssessment(
      baseActive,
      resultWithLegacyActionPlans,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.actionPlans?.categories?.["G.strategy-and-vision"]).toEqual(
      {
        targetLevel: 4,
        objectives: [{ id: "obj-0", text: "Formalise lifecycle" }],
        targetDate: "2026-09-30",
      },
    );
  });

  it("does not set workspace when the source had none and there are no orphans", () => {
    const resultWithoutOrphans: MigrationResult = {
      ...baseResult,
      orphanedEntries: undefined,
    };

    const migrated = buildMigratedAssessment(
      baseActive,
      resultWithoutOrphans,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.workspace).toBeUndefined();
  });

  it("defaults requirementProgress to {} when the result carries none", () => {
    const resultWithoutRequirementProgress: MigrationResult = {
      ...baseResult,
      migratedRequirementProgress: undefined,
    };

    const migrated = buildMigratedAssessment(
      baseActive,
      resultWithoutRequirementProgress,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.requirementProgress).toEqual({});
  });

  it("stamps id, name, dataVersion, and meta correctly", () => {
    const migrated = buildMigratedAssessment(
      baseActive,
      baseResult,
      "2.0.0",
      "2026-07-06T00:00:00.000Z",
      "new-id",
    );

    expect(migrated.id).toBe("new-id");
    expect(migrated.name).toBe("My Assessment (PKIMM 2.0.0)");
    expect(migrated.dataVersion).toBe("2.0.0");
    expect(migrated.meta).toEqual({
      createdAt: "2026-07-06T00:00:00.000Z",
      updatedAt: "2026-07-06T00:00:00.000Z",
      importedFromId: "old-id",
    });
    expect(migrated.progress).toEqual(baseResult.migratedProgress);
    expect(migrated.enabledExtensions).toEqual(
      baseResult.migratedEnabledExtensions,
    );
    expect(migrated.sourceStructure).toEqual(baseResult.newSourceStructure);
  });
});
