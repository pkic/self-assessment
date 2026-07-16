import { migrate } from "./stateMigration";
import type { Assessment, AssessmentData } from "../types/types";

const target: AssessmentData = {
  version: "2.0.0",
  modules: [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "strategy-and-vision",
          weight: 5,
          name: "Strategy and vision",
          description: "",
          levels: [],
          requirements: [
            {
              id: "sponsor-support",
              weight: 3,
              description: "Organizational sponsor and support",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ],
};

const source = {
  id: "s",
  name: "S",
  dataVersion: "1.9.0",
  progress: {
    "G.old-sv": { level: 3, result: "", description: "", applicability: true },
  },
  requirementProgress: {
    // matches by category name + requirement description
    "G.old-sv.old-sponsor": {
      level: 4,
      applicability: true,
      notes: "kept note",
      evidence: "e",
    },
    // no match in target → orphaned (has notes)
    "G.old-sv.removed-req": {
      level: 2,
      applicability: true,
      notes: "orphan note",
      evidence: "",
    },
  },
  actionPlans: {
    categories: { "G.old-sv": { targetLevel: 4, objectives: "obj" } },
  },
  enabledExtensions: [],
  assessmentName: "",
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: {
    byKey: {
      "G.old-sv": { moduleId: "G", categoryName: "Strategy and vision" },
      "G.old-sv.old-sponsor": {
        moduleId: "G",
        categoryName: "Strategy and vision",
        requirementName: "Organizational sponsor and support",
      },
      "G.old-sv.removed-req": {
        moduleId: "G",
        categoryName: "Strategy and vision",
        requirementName: "Some removed requirement",
      },
    },
  },
  meta: { createdAt: "t", updatedAt: "t" },
} as unknown as Assessment;

describe("requirement-aware migration", () => {
  it("maps requirement progress by category+requirement name to the new key", () => {
    const r = migrate(source, target);
    expect(
      r.migratedRequirementProgress!["G.strategy-and-vision.sponsor-support"],
    ).toMatchObject({ level: 4, notes: "kept note" });
    expect(r.summary.requirementsMapped).toBe(1);
  });

  it("preserves an unmapped requirement with notes as an orphaned entry (never dropped)", () => {
    const r = migrate(source, target);
    const orphan = r.orphanedEntries!.find(
      (o) => o.originalKey === "G.old-sv.removed-req",
    );
    expect(orphan).toBeDefined();
    expect(orphan!.payload.notes).toBe("orphan note");
    expect(r.summary.requirementsUnmapped).toBe(1);
  });

  it("remaps action-plan category keys by category name", () => {
    const r = migrate(source, target);
    expect(
      r.migratedActionPlans!.categories!["G.strategy-and-vision"],
    ).toMatchObject({ targetLevel: 4 });
    expect(r.summary.actionPlansRemapped).toBe(1);
  });
});
