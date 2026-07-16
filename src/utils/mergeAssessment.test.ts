import { mergeAssessments } from "./mergeAssessment";
import type {
  ActionPlans,
  Assessment,
  EnabledExtension,
  PkiEnvironment,
  ProgressData,
  RequirementProgress,
  Workspace,
} from "../types/types";

const baseMeta = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const mk = (over: Partial<Assessment>): Assessment => ({
  id: "id-1",
  name: "A",
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: "",
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} } as Assessment["sourceStructure"],
  meta: { ...baseMeta },
  ...over,
});

const rp = (o: Partial<RequirementProgress>): RequirementProgress => ({
  level: 0,
  applicability: true,
  notes: "",
  evidence: "",
  ...o,
});

const pd = (o: Partial<ProgressData>): ProgressData => ({
  level: 0,
  result: "",
  description: "",
  applicability: true,
  ...o,
});

describe("mergeAssessments", () => {
  describe("key union across strategies", () => {
    it.each(["fill-gaps", "prefer-newest", "prefer-imported"] as const)(
      "unions requirementProgress keys — only-incoming and only-existing both survive (%s)",
      (strategy) => {
        const ex = mk({
          requirementProgress: { "G.c.r1": rp({ level: 3, notes: "keep" }) },
        });
        const inc = mk({
          requirementProgress: { "G.c.r2": rp({ level: 2, notes: "new" }) },
        });
        const out = mergeAssessments(ex, inc, strategy);
        expect(out.requirementProgress).toEqual({
          "G.c.r1": rp({ level: 3, notes: "keep" }),
          "G.c.r2": rp({ level: 2, notes: "new" }),
        });
      },
    );

    it.each(["fill-gaps", "prefer-newest", "prefer-imported"] as const)(
      "unions progress keys — only-incoming and only-existing both survive (%s)",
      (strategy) => {
        const ex = mk({ progress: { "G.a": pd({ level: 3 }) } });
        const inc = mk({ progress: { "G.b": pd({ level: 2 }) } });
        const out = mergeAssessments(ex, inc, strategy);
        expect(out.progress["G.a"]).toEqual(pd({ level: 3 }));
        expect(out.progress["G.b"]).toEqual(pd({ level: 2 }));
      },
    );
  });

  describe("requirementProgress collision", () => {
    it("fill-gaps fills existing blanks per field but never overwrites set fields or applicability", () => {
      const ex = mk({
        requirementProgress: {
          k: rp({ level: 3, notes: "", evidence: "E", applicability: true }),
        },
      });
      const inc = mk({
        requirementProgress: {
          k: rp({
            level: 5,
            notes: "filled",
            evidence: "X",
            applicability: false,
          }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").requirementProgress!.k;
      expect(out.level).toBe(3);
      expect(out.notes).toBe("filled");
      expect(out.evidence).toBe("E");
      expect(out.applicability).toBe(true);
    });

    it("fill-gaps fills level only when existing level is 0", () => {
      const ex = mk({ requirementProgress: { k: rp({ level: 0 }) } });
      const inc = mk({ requirementProgress: { k: rp({ level: 4 }) } });
      const out = mergeAssessments(ex, inc, "fill-gaps").requirementProgress!.k;
      expect(out.level).toBe(4);
    });

    it("fill-gaps fills flag/completed/poc/interviewDate/related/artifactIds/assessorReview when existing is unset", () => {
      const ex = mk({
        requirementProgress: {
          k: rp({
            completed: undefined,
            flagged: undefined,
            flagNote: "",
            pocId: undefined,
            interviewDate: undefined,
            artifactIds: [],
            related: [],
            assessorReview: undefined,
            updatedAt: undefined,
          }),
        },
      });
      const inc = mk({
        requirementProgress: {
          k: rp({
            completed: true,
            flagged: true,
            flagNote: "flag note",
            pocId: "poc-1",
            interviewDate: "2026-03-01",
            artifactIds: ["a1"],
            related: ["G.c.r9"],
            assessorReview: { status: "agreed" },
            updatedAt: "2026-05-01T00:00:00.000Z",
          }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").requirementProgress!.k;
      expect(out.completed).toBe(true);
      expect(out.flagged).toBe(true);
      expect(out.flagNote).toBe("flag note");
      expect(out.pocId).toBe("poc-1");
      expect(out.interviewDate).toBe("2026-03-01");
      expect(out.artifactIds).toEqual(["a1"]);
      expect(out.related).toEqual(["G.c.r9"]);
      expect(out.assessorReview).toEqual({ status: "agreed" });
      expect(out.updatedAt).toBe("2026-05-01T00:00:00.000Z");
    });

    it("fill-gaps keeps existing set flag/completed/poc when both sides set", () => {
      const ex = mk({
        requirementProgress: {
          k: rp({
            completed: false,
            flagged: false,
            pocId: "poc-existing",
            artifactIds: ["existing-a"],
          }),
        },
      });
      const inc = mk({
        requirementProgress: {
          k: rp({
            completed: true,
            flagged: true,
            pocId: "poc-incoming",
            artifactIds: ["incoming-a"],
          }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").requirementProgress!.k;
      expect(out.completed).toBe(false);
      expect(out.flagged).toBe(false);
      expect(out.pocId).toBe("poc-existing");
      expect(out.artifactIds).toEqual(["existing-a"]);
    });

    it("prefer-newest picks the requirement entry with the newer updatedAt", () => {
      const ex = mk({
        requirementProgress: {
          k: rp({ level: 1, updatedAt: "2026-01-01T00:00:00.000Z" }),
        },
      });
      const inc = mk({
        requirementProgress: {
          k: rp({ level: 4, updatedAt: "2026-06-01T00:00:00.000Z" }),
        },
      });
      expect(
        mergeAssessments(ex, inc, "prefer-newest").requirementProgress!.k.level,
      ).toBe(4);
    });

    it("prefer-newest ties (equal updatedAt) favour existing", () => {
      const same = "2026-03-01T00:00:00.000Z";
      const ex = mk({
        requirementProgress: { k: rp({ level: 1, updatedAt: same }) },
      });
      const inc = mk({
        requirementProgress: { k: rp({ level: 4, updatedAt: same }) },
      });
      expect(
        mergeAssessments(ex, inc, "prefer-newest").requirementProgress!.k.level,
      ).toBe(1);
    });

    it("prefer-newest treats missing updatedAt as 0 (epoch) so a dated incoming wins", () => {
      const ex = mk({
        requirementProgress: { k: rp({ level: 1, updatedAt: undefined }) },
      });
      const inc = mk({
        requirementProgress: {
          k: rp({ level: 4, updatedAt: "2026-01-01T00:00:00.000Z" }),
        },
      });
      expect(
        mergeAssessments(ex, inc, "prefer-newest").requirementProgress!.k.level,
      ).toBe(4);
    });

    it("prefer-imported takes the incoming entry wholesale, including applicability", () => {
      const ex = mk({
        requirementProgress: {
          k: rp({ level: 5, notes: "existing notes", applicability: true }),
        },
      });
      const inc = mk({
        requirementProgress: {
          k: rp({ level: 2, notes: "incoming notes", applicability: false }),
        },
      });
      const out = mergeAssessments(ex, inc, "prefer-imported")
        .requirementProgress!.k;
      expect(out).toEqual(
        rp({ level: 2, notes: "incoming notes", applicability: false }),
      );
    });
  });

  describe("progress (category-level) collision", () => {
    it("fill-gaps fills an untouched (level-0, applicable) existing category from incoming", () => {
      const ex = mk({ progress: { "G.a": pd({ level: 0 }) } });
      const inc = mk({
        progress: {
          "G.a": pd({ level: 3, result: "Managed", description: "desc" }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").progress["G.a"];
      expect(out.level).toBe(3);
      expect(out.result).toBe("Managed");
      expect(out.description).toBe("desc");
      expect(out.applicability).toBe(true);
    });

    it("fill-gaps preserves a touched (level > 0) existing category untouched", () => {
      const ex = mk({
        progress: {
          "G.a": pd({ level: 2, result: "Foundational", description: "d1" }),
        },
      });
      const inc = mk({
        progress: {
          "G.a": pd({ level: 5, result: "Optimized", description: "d2" }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").progress["G.a"];
      expect(out).toEqual(
        pd({ level: 2, result: "Foundational", description: "d1" }),
      );
    });

    it("fill-gaps never changes an explicitly-N/A existing category, even at level 0", () => {
      const ex = mk({
        progress: {
          "G.a": pd({
            level: 0,
            applicability: false,
            applicabilityReason: "out of scope",
          }),
        },
      });
      const inc = mk({
        progress: {
          "G.a": pd({ level: 4, result: "Managed", applicability: true }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").progress["G.a"];
      expect(out.applicability).toBe(false);
      expect(out.applicabilityReason).toBe("out of scope");
    });

    it("fill-gaps leaves an explicit N/A category at level 0 entirely byte-identical, since explicit N/A is never treated as an untouched gap", () => {
      const ex = mk({
        progress: {
          "G.a": pd({
            level: 0,
            applicability: false,
            applicabilityReason: "reason kept",
          }),
        },
      });
      const inc = mk({
        progress: {
          "G.a": pd({ level: 3, result: "Managed", description: "desc" }),
        },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps").progress["G.a"];
      expect(out).toEqual(
        pd({
          level: 0,
          applicability: false,
          applicabilityReason: "reason kept",
        }),
      );
    });

    it("prefer-newest picks whole incoming progress entry when incoming is newer", () => {
      const ex = mk({
        meta: { ...baseMeta, updatedAt: "2026-01-01T00:00:00.000Z" },
        progress: { "G.a": pd({ level: 1 }) },
      });
      const inc = mk({
        meta: { ...baseMeta, updatedAt: "2026-06-01T00:00:00.000Z" },
        progress: { "G.a": pd({ level: 5 }) },
      });
      const out = mergeAssessments(ex, inc, "prefer-newest").progress["G.a"];
      expect(out.level).toBe(5);
    });

    it("prefer-imported picks whole incoming progress entry", () => {
      const ex = mk({
        progress: {
          "G.a": pd({
            level: 1,
            applicability: false,
            applicabilityReason: "x",
          }),
        },
      });
      const inc = mk({ progress: { "G.a": pd({ level: 4 }) } });
      const out = mergeAssessments(ex, inc, "prefer-imported").progress["G.a"];
      expect(out).toEqual(pd({ level: 4 }));
    });

    it("fill-gaps preserves an existing category's notes", () => {
      const existing = mk({
        progress: { "G.c": pd({ level: 3, result: "Defined", notes: "keep" }) },
      });
      const incoming = mk({
        progress: {
          "G.c": pd({ level: 4, result: "Managed", notes: "other" }),
        },
      });
      const merged = mergeAssessments(existing, incoming, "fill-gaps");
      expect(merged.progress["G.c"].level).toBe(3);
      expect(merged.progress["G.c"].notes).toBe("keep");
    });

    it("fill-gaps fills notes into an otherwise-empty existing entry", () => {
      const existing = mk({ progress: { "G.c": pd({}) } });
      const incoming = mk({
        progress: {
          "G.c": pd({ level: 2, result: "Foundational", notes: "fromInc" }),
        },
      });
      const merged = mergeAssessments(existing, incoming, "fill-gaps");
      expect(merged.progress["G.c"].notes).toBe("fromInc");
    });

    it("fill-gaps does not treat a notes-only level-0 entry as empty", () => {
      const existing = mk({ progress: { "G.c": pd({ notes: "mine" }) } });
      const incoming = mk({
        progress: {
          "G.c": pd({ level: 5, result: "Optimized", notes: "theirs" }),
        },
      });
      const merged = mergeAssessments(existing, incoming, "fill-gaps");
      expect(merged.progress["G.c"].level).toBe(0);
      expect(merged.progress["G.c"].notes).toBe("mine");
    });
  });

  describe("actionPlans collision", () => {
    const plan = (
      o: Record<string, unknown>,
    ): NonNullable<ActionPlans["categories"]>[string] =>
      ({
        targetLevel: 3,
        ...o,
      }) as unknown as NonNullable<ActionPlans["categories"]>[string];

    it("fill-gaps keeps existing targetLevel and fills empty text fields", () => {
      const ex: ActionPlans = {
        categories: {
          "G.a": plan({ targetLevel: 3, objectives: "", schedule: "Q1" }),
        },
      };
      const inc: ActionPlans = {
        categories: {
          "G.a": plan({
            targetLevel: 5,
            objectives: "improve controls",
            schedule: "Q3",
            responsibility: "CISO",
          }),
        },
      };
      const out = mergeAssessments(
        mk({ actionPlans: ex }),
        mk({ actionPlans: inc }),
        "fill-gaps",
      ).actionPlans!.categories!["G.a"];
      expect(out.targetLevel).toBe(3);
      expect(out.objectives).toEqual([
        { id: "obj-0", text: "improve controls" },
      ]);
      expect(out.comments).toBe("Q1");
      expect(out.responsibility).toBe("CISO");
    });

    it("fill-gaps merges action-plan lists/checklist as arrays; scalars; no schedule", () => {
      const ex: ActionPlans = {
        categories: {
          "G.c1": plan({
            targetLevel: 3,
            objectives: [{ id: "o1", text: "keep" }],
            outputs: [],
            tasks: [],
            responsiblePocId: "poc1",
          }),
        },
      };
      const inc: ActionPlans = {
        categories: {
          "G.c1": plan({
            targetLevel: 5,
            objectives: [{ id: "o9", text: "incoming" }],
            outputs: [{ id: "p1", text: "Runbook" }],
            tasks: [{ itemId: "t1", label: "do", done: false }],
            responsiblePocId: "poc9",
            targetDate: "2026-09-30",
          }),
        },
      };
      const out = mergeAssessments(
        mk({ actionPlans: ex }),
        mk({ actionPlans: inc }),
        "fill-gaps",
      ).actionPlans!.categories!["G.c1"];
      expect(out.targetLevel).toBe(3);
      expect(out.objectives).toEqual([{ id: "o1", text: "keep" }]);
      expect(out.outputs).toEqual([{ id: "p1", text: "Runbook" }]);
      expect(out.tasks).toEqual([{ itemId: "t1", label: "do", done: false }]);
      expect(out.responsiblePocId).toBe("poc1");
      expect(out.targetDate).toBe("2026-09-30");
    });

    it("prefer-imported takes the incoming plan wholesale with new-shape arrays", () => {
      const ex: ActionPlans = {
        categories: {
          "G.c1": plan({
            targetLevel: 2,
            objectives: [{ id: "o1", text: "existing" }],
            outputs: [{ id: "p1", text: "existing output" }],
            tasks: [{ itemId: "t1", label: "existing task", done: true }],
            responsiblePocId: "poc1",
            targetDate: "2026-01-01",
          }),
        },
      };
      const inc: ActionPlans = {
        categories: {
          "G.c1": plan({
            targetLevel: 5,
            objectives: [{ id: "o9", text: "incoming" }],
            outputs: [{ id: "p9", text: "incoming output" }],
            tasks: [{ itemId: "t9", label: "incoming task", done: false }],
            responsiblePocId: "poc9",
            targetDate: "2026-09-30",
          }),
        },
      };
      const out = mergeAssessments(
        mk({ actionPlans: ex }),
        mk({ actionPlans: inc }),
        "prefer-imported",
      ).actionPlans!.categories!["G.c1"];
      expect(out.targetLevel).toBe(5);
      expect(out.objectives).toEqual([{ id: "o9", text: "incoming" }]);
      expect(out.outputs).toEqual([{ id: "p9", text: "incoming output" }]);
      expect(out.tasks).toEqual([
        { itemId: "t9", label: "incoming task", done: false },
      ]);
      expect(out.responsiblePocId).toBe("poc9");
      expect(out.targetDate).toBe("2026-09-30");
    });

    it("prefer-newest takes the whole newer entry with new-shape arrays", () => {
      const ex: ActionPlans = {
        categories: {
          "G.c1": plan({
            targetLevel: 2,
            objectives: [{ id: "o1", text: "existing" }],
            outputs: [{ id: "p1", text: "existing output" }],
            tasks: [{ itemId: "t1", label: "existing task", done: true }],
            responsiblePocId: "poc1",
            targetDate: "2026-01-01",
          }),
        },
      };
      const inc: ActionPlans = {
        categories: {
          "G.c1": plan({
            targetLevel: 5,
            objectives: [{ id: "o9", text: "incoming" }],
            outputs: [{ id: "p9", text: "incoming output" }],
            tasks: [{ itemId: "t9", label: "incoming task", done: false }],
            responsiblePocId: "poc9",
            targetDate: "2026-09-30",
          }),
        },
      };
      const out = mergeAssessments(
        mk({
          meta: { ...baseMeta, updatedAt: "2026-01-01T00:00:00.000Z" },
          actionPlans: ex,
        }),
        mk({
          meta: { ...baseMeta, updatedAt: "2026-06-01T00:00:00.000Z" },
          actionPlans: inc,
        }),
        "prefer-newest",
      ).actionPlans!.categories!["G.c1"];
      expect(out.targetLevel).toBe(5);
      expect(out.objectives).toEqual([{ id: "o9", text: "incoming" }]);
      expect(out.outputs).toEqual([{ id: "p9", text: "incoming output" }]);
      expect(out.tasks).toEqual([
        { itemId: "t9", label: "incoming task", done: false },
      ]);
      expect(out.responsiblePocId).toBe("poc9");
      expect(out.targetDate).toBe("2026-09-30");
    });

    it("fill-gaps unions actionPlans category keys", () => {
      const ex: ActionPlans = { categories: { "G.a": plan({}) } };
      const inc: ActionPlans = { categories: { "G.b": plan({}) } };
      const out = mergeAssessments(
        mk({ actionPlans: ex }),
        mk({ actionPlans: inc }),
        "fill-gaps",
      ).actionPlans!.categories!;
      expect(Object.keys(out).sort()).toEqual(["G.a", "G.b"]);
    });

    it("prefer-imported takes the incoming plan wholesale, including targetLevel", () => {
      const ex: ActionPlans = {
        categories: { "G.a": plan({ targetLevel: 2 }) },
      };
      const inc: ActionPlans = {
        categories: { "G.a": plan({ targetLevel: 5, objectives: "new" }) },
      };
      const out = mergeAssessments(
        mk({ actionPlans: ex }),
        mk({ actionPlans: inc }),
        "prefer-imported",
      ).actionPlans!.categories!["G.a"];
      expect(out.targetLevel).toBe(5);
      expect(out.objectives).toEqual([{ id: "obj-0", text: "new" }]);
    });

    it("one side undefined falls back to the other side wholesale", () => {
      const inc: ActionPlans = { categories: { "G.a": plan({}) } };
      const out1 = mergeAssessments(
        mk({ actionPlans: undefined }),
        mk({ actionPlans: inc }),
        "fill-gaps",
      ).actionPlans;
      expect(out1).toEqual(inc);

      const ex: ActionPlans = { categories: { "G.a": plan({}) } };
      const out2 = mergeAssessments(
        mk({ actionPlans: ex }),
        mk({ actionPlans: undefined }),
        "fill-gaps",
      ).actionPlans;
      expect(out2).toEqual(ex);
    });
  });

  describe("workspace array union by key", () => {
    const ws = (o: Partial<Workspace>): Workspace => ({ ...o });

    it("unions artifacts by id, existing-order-first, incoming-only appended", () => {
      const ex = ws({
        artifacts: [{ id: "a1", title: "Existing A1", locator: "loc1" }],
      });
      const inc = ws({
        artifacts: [
          { id: "a2", title: "Incoming A2", locator: "loc2" },
          { id: "a1", title: "Incoming A1", locator: "loc1-inc" },
        ],
      });
      const out = mergeAssessments(
        mk({ workspace: ex }),
        mk({ workspace: inc }),
        "fill-gaps",
      ).workspace!.artifacts!;
      expect(out.map((a) => a.id)).toEqual(["a1", "a2"]);
      // fill-gaps: collision resolved via pickEntry -> existing wins wholesale
      expect(out[0].title).toBe("Existing A1");
    });

    it("unions checklist by itemId", () => {
      const ex = ws({
        checklist: [{ itemId: "c1", label: "Existing", done: false }],
      });
      const inc = ws({
        checklist: [
          { itemId: "c1", label: "Incoming", done: true },
          { itemId: "c2", label: "New item", done: false },
        ],
      });
      const out = mergeAssessments(
        mk({ workspace: ex }),
        mk({ workspace: inc }),
        "prefer-imported",
      ).workspace!.checklist!;
      expect(out.map((c) => c.itemId)).toEqual(["c1", "c2"]);
      expect(out[0].label).toBe("Incoming"); // prefer-imported collision -> incoming wins
    });

    it("unions intake by questionId", () => {
      const ex = ws({
        intake: [{ questionId: "q1", question: "Q1?", answer: "existing" }],
      });
      const inc = ws({
        intake: [
          { questionId: "q1", question: "Q1?", answer: "incoming" },
          { questionId: "q2", question: "Q2?", answer: "new" },
        ],
      });
      const out = mergeAssessments(
        mk({ workspace: ex }),
        mk({ workspace: inc }),
        "fill-gaps",
      ).workspace!.intake!;
      expect(out.map((i) => i.questionId)).toEqual(["q1", "q2"]);
      expect(out[0].answer).toBe("existing"); // fill-gaps collision -> existing wins
    });

    it("unions pocs by id", () => {
      const ex = ws({ pocs: [{ id: "p1", name: "Existing Poc" }] });
      const inc = ws({
        pocs: [
          { id: "p1", name: "Incoming Poc" },
          { id: "p2", name: "New Poc" },
        ],
      });
      const outNewer = mergeAssessments(
        mk({
          workspace: ex,
          meta: { ...baseMeta, updatedAt: "2026-01-01T00:00:00.000Z" },
        }),
        mk({
          workspace: inc,
          meta: { ...baseMeta, updatedAt: "2026-06-01T00:00:00.000Z" },
        }),
        "prefer-newest",
      ).workspace!.pocs!;
      expect(outNewer.map((p) => p.id)).toEqual(["p1", "p2"]);
      expect(outNewer[0].name).toBe("Incoming Poc"); // incoming newer -> wins collision
    });

    it("unions orphanedEntries by originalKey", () => {
      const ex = ws({
        orphanedEntries: [
          {
            originalKey: "G.old.r1",
            payload: rp({ level: 2 }),
          },
        ],
      });
      const inc = ws({
        orphanedEntries: [
          {
            originalKey: "G.old.r1",
            payload: rp({ level: 4 }),
          },
          {
            originalKey: "G.old.r2",
            payload: rp({ level: 1 }),
          },
        ],
      });
      const out = mergeAssessments(
        mk({ workspace: ex }),
        mk({ workspace: inc }),
        "fill-gaps",
      ).workspace!.orphanedEntries!;
      expect(out.map((o) => o.originalKey)).toEqual(["G.old.r1", "G.old.r2"]);
      expect(out[0].payload.level).toBe(2); // fill-gaps collision -> existing wins wholesale
    });

    it("merges workingNotes and intakeCatalogVersion as blank-fillable scalars", () => {
      const ex = ws({ workingNotes: "", intakeCatalogVersion: "v1" });
      const inc = ws({
        workingNotes: "incoming notes",
        intakeCatalogVersion: "v2",
      });
      const out = mergeAssessments(
        mk({ workspace: ex }),
        mk({ workspace: inc }),
        "fill-gaps",
      ).workspace!;
      expect(out.workingNotes).toBe("incoming notes");
      expect(out.intakeCatalogVersion).toBe("v1"); // existing set -> kept
    });

    it("one side undefined falls back to the other side wholesale", () => {
      const inc = ws({ workingNotes: "notes" });
      expect(
        mergeAssessments(
          mk({ workspace: undefined }),
          mk({ workspace: inc }),
          "fill-gaps",
        ).workspace,
      ).toEqual(inc);

      const ex = ws({ workingNotes: "notes" });
      expect(
        mergeAssessments(
          mk({ workspace: ex }),
          mk({ workspace: undefined }),
          "fill-gaps",
        ).workspace,
      ).toEqual(ex);
    });
  });

  describe("pkiEnvironment scalar merge", () => {
    it("fill-gaps fills blank fields, keeps set ones", () => {
      const ex: PkiEnvironment = {
        components: "existing components",
        outOfScopeConsiderations: "",
        highLevelDesign: undefined,
        pointsOfInteraction: "existing poi",
      };
      const inc: PkiEnvironment = {
        components: "incoming components",
        outOfScopeConsiderations: "incoming oosc",
        highLevelDesign: "incoming hld",
        pointsOfInteraction: "incoming poi",
      };
      const out = mergeAssessments(
        mk({ pkiEnvironment: ex }),
        mk({ pkiEnvironment: inc }),
        "fill-gaps",
      ).pkiEnvironment!;
      expect(out.components).toBe("existing components");
      expect(out.outOfScopeConsiderations).toBe("incoming oosc");
      expect(out.highLevelDesign).toBe("incoming hld");
      expect(out.pointsOfInteraction).toBe("existing poi");
    });

    it("prefer-imported fills incoming blanks from existing but otherwise takes incoming", () => {
      const ex: PkiEnvironment = {
        components: "existing components",
        outOfScopeConsiderations: "existing oosc",
      };
      const inc: PkiEnvironment = {
        components: "",
        outOfScopeConsiderations: "incoming oosc",
      };
      const out = mergeAssessments(
        mk({ pkiEnvironment: ex }),
        mk({ pkiEnvironment: inc }),
        "prefer-imported",
      ).pkiEnvironment!;
      expect(out.components).toBe("existing components"); // incoming blank -> existing kept
      expect(out.outOfScopeConsiderations).toBe("incoming oosc");
    });

    it("one side undefined falls back to the other side wholesale", () => {
      const inc: PkiEnvironment = { components: "incoming" };
      expect(
        mergeAssessments(
          mk({ pkiEnvironment: undefined }),
          mk({ pkiEnvironment: inc }),
          "fill-gaps",
        ).pkiEnvironment,
      ).toEqual(inc);

      const ex: PkiEnvironment = { components: "existing" };
      expect(
        mergeAssessments(
          mk({ pkiEnvironment: ex }),
          mk({ pkiEnvironment: undefined }),
          "fill-gaps",
        ).pkiEnvironment,
      ).toEqual(ex);
    });
  });

  describe("scalar blank-fill both directions", () => {
    it("fill-gaps: existing blank + incoming set -> incoming; existing set + incoming blank -> existing", () => {
      const ex = mk({ organizationName: "", assessorCompany: "Existing Co" });
      const inc = mk({
        organizationName: "Incoming Org",
        assessorCompany: "",
      });
      const out = mergeAssessments(ex, inc, "fill-gaps");
      expect(out.organizationName).toBe("Incoming Org");
      expect(out.assessorCompany).toBe("Existing Co");
    });

    it("prefer-imported blank-fill: incoming blank -> existing kept; incoming set -> incoming wins", () => {
      const ex = mk({
        organizationName: "Existing Org",
        assessorCompany: "Existing Co",
      });
      const inc = mk({ organizationName: "", assessorCompany: "Incoming Co" });
      const out = mergeAssessments(ex, inc, "prefer-imported");
      expect(out.organizationName).toBe("Existing Org"); // incoming blank -> existing kept
      expect(out.assessorCompany).toBe("Incoming Co"); // incoming set -> incoming wins
    });

    it("prefer-newest: primary (per timestamp) wins unless blank, then falls back to secondary", () => {
      const ex = mk({
        meta: { ...baseMeta, updatedAt: "2026-01-01T00:00:00.000Z" },
        organizationName: "Existing Org",
        assessorCompany: "",
      });
      const inc = mk({
        meta: { ...baseMeta, updatedAt: "2026-06-01T00:00:00.000Z" },
        organizationName: "",
        assessorCompany: "Incoming Co",
      });
      const out = mergeAssessments(ex, inc, "prefer-newest");
      // incoming is newer (primary); incoming organizationName is blank -> falls back to existing
      expect(out.organizationName).toBe("Existing Org");
      expect(out.assessorCompany).toBe("Incoming Co");
    });

    it("required scalars (name/assessmentName/assessorName/useCaseDescription) never end up undefined", () => {
      const ex = mk({
        name: "",
        assessmentName: "",
        assessorName: "",
        useCaseDescription: "",
      });
      const inc = mk({
        name: "",
        assessmentName: "",
        assessorName: "",
        useCaseDescription: "",
      });
      const out = mergeAssessments(ex, inc, "fill-gaps");
      expect(out.name).toBe("");
      expect(out.assessmentName).toBe("");
      expect(out.assessorName).toBe("");
      expect(out.useCaseDescription).toBe("");
    });
  });

  describe("enabledExtensions union by id", () => {
    it("unions by id, existing-order-first, incoming-only appended", () => {
      const ex: EnabledExtension[] = [{ id: "ext-a", version: "1.0.0" }];
      const inc: EnabledExtension[] = [
        { id: "ext-b", version: "1.0.0" },
        { id: "ext-a", version: "2.0.0" },
      ];
      const out = mergeAssessments(
        mk({ enabledExtensions: ex }),
        mk({ enabledExtensions: inc }),
        "fill-gaps",
      ).enabledExtensions;
      expect(out.map((e) => e.id)).toEqual(["ext-a", "ext-b"]);
      expect(out[0].version).toBe("1.0.0"); // fill-gaps -> existing wins whole entry
    });

    it("prefer-imported collision resolves to incoming's version", () => {
      const ex: EnabledExtension[] = [{ id: "ext-a", version: "1.0.0" }];
      const inc: EnabledExtension[] = [{ id: "ext-a", version: "2.0.0" }];
      const out = mergeAssessments(
        mk({ enabledExtensions: ex }),
        mk({ enabledExtensions: inc }),
        "prefer-imported",
      ).enabledExtensions;
      expect(out).toEqual([{ id: "ext-a", version: "2.0.0" }]);
    });

    it("prefer-newest collision resolves by which assessment is newer", () => {
      const ex: EnabledExtension[] = [{ id: "ext-a", version: "1.0.0" }];
      const inc: EnabledExtension[] = [{ id: "ext-a", version: "3.0.0" }];
      const out = mergeAssessments(
        mk({
          enabledExtensions: ex,
          meta: { ...baseMeta, updatedAt: "2026-01-01T00:00:00.000Z" },
        }),
        mk({
          enabledExtensions: inc,
          meta: { ...baseMeta, updatedAt: "2026-06-01T00:00:00.000Z" },
        }),
        "prefer-newest",
      ).enabledExtensions;
      expect(out).toEqual([{ id: "ext-a", version: "3.0.0" }]);
    });
  });

  describe("identity / provenance / meta", () => {
    it("keeps id/dataVersion/sourceStructure from existing; preserves existing provenance; does not bump updatedAt", () => {
      const ex = mk({
        meta: {
          createdAt: "2026-01-05T00:00:00.000Z",
          updatedAt: "2026-01-10T00:00:00.000Z",
          importedFromId: "orig-source",
        },
      });
      const inc = mk({
        id: "id-1",
        meta: {
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      });
      const out = mergeAssessments(ex, inc, "prefer-imported");
      expect(out.id).toBe("id-1");
      expect(out.meta.createdAt).toBe("2026-01-01T00:00:00.000Z"); // earlier
      expect(out.meta.importedFromId).toBe("orig-source"); // existing provenance preserved
      expect(out.meta.updatedAt).toBe("2026-01-10T00:00:00.000Z"); // existing's — pure fn does NOT bump
    });

    it("dataVersion and sourceStructure always come from existing, even when incoming differs", () => {
      const ex = mk({
        dataVersion: "2.0.0",
        sourceStructure: {
          byKey: { "G.a": { moduleId: "G", categoryName: "Existing Cat" } },
        },
      });
      const inc = mk({
        dataVersion: "1.0.0",
        sourceStructure: {
          byKey: { "G.a": { moduleId: "G", categoryName: "Incoming Cat" } },
        },
      });
      const out = mergeAssessments(ex, inc, "prefer-imported");
      expect(out.dataVersion).toBe("2.0.0");
      expect(out.sourceStructure).toBe(ex.sourceStructure);
    });

    it("lastPosition and lastView always come from existing", () => {
      const ex = mk({
        lastView: "full",
        lastPosition: { view: "full", tab: "G" },
      });
      const inc = mk({
        lastView: "self",
        lastPosition: { view: "self", tab: "R" },
      });
      const out = mergeAssessments(ex, inc, "prefer-imported");
      expect(out.lastView).toBe("full");
      expect(out.lastPosition).toEqual({ view: "full", tab: "G" });
    });

    it("meta.createdAt picks the earlier of the two timestamps regardless of strategy", () => {
      const ex = mk({
        meta: { ...baseMeta, createdAt: "2026-03-01T00:00:00.000Z" },
      });
      const inc = mk({
        meta: { ...baseMeta, createdAt: "2026-01-01T00:00:00.000Z" },
      });
      const out = mergeAssessments(ex, inc, "fill-gaps");
      expect(out.meta.createdAt).toBe("2026-01-01T00:00:00.000Z");
    });

    it("importedFromId is preserved from existing even when existing has none and incoming does", () => {
      const ex = mk({ meta: { ...baseMeta, importedFromId: undefined } });
      const inc = mk({
        meta: { ...baseMeta, importedFromId: "incoming-source" },
      });
      const out = mergeAssessments(ex, inc, "prefer-imported");
      expect(out.meta.importedFromId).toBeUndefined();
    });
  });

  describe("purity", () => {
    it("does not mutate its inputs", () => {
      const ex = Object.freeze(
        mk({
          requirementProgress: Object.freeze({
            k: rp({ level: 1 }),
          }) as never,
        }),
      );
      const inc = Object.freeze(
        mk({
          requirementProgress: Object.freeze({
            k: rp({ level: 2 }),
          }) as never,
        }),
      );
      expect(() => mergeAssessments(ex, inc, "prefer-newest")).not.toThrow();
    });

    it("deep-frozen fixtures across all field groups survive all three strategies without throwing", () => {
      const deepFreeze = <T>(obj: T): T => {
        if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
          Object.values(obj as Record<string, unknown>).forEach(deepFreeze);
          Object.freeze(obj);
        }
        return obj;
      };
      const ex = deepFreeze(
        mk({
          progress: { "G.a": pd({ level: 2 }) },
          requirementProgress: { k: rp({ level: 3 }) },
          enabledExtensions: [{ id: "ext-a", version: "1.0.0" }],
          pkiEnvironment: { components: "c" },
          workspace: { artifacts: [{ id: "a1", title: "T", locator: "L" }] },
          actionPlans: { categories: { "G.a": { targetLevel: 3 } } },
        }),
      );
      const inc = deepFreeze(
        mk({
          progress: { "G.b": pd({ level: 1 }) },
          requirementProgress: { k2: rp({ level: 1 }) },
          enabledExtensions: [{ id: "ext-b", version: "1.0.0" }],
          pkiEnvironment: { components: "incoming c" },
          workspace: { artifacts: [{ id: "a2", title: "T2", locator: "L2" }] },
          actionPlans: { categories: { "G.b": { targetLevel: 2 } } },
        }),
      );
      for (const strategy of [
        "fill-gaps",
        "prefer-newest",
        "prefer-imported",
      ] as const) {
        expect(() => mergeAssessments(ex, inc, strategy)).not.toThrow();
      }
    });
  });

  describe("requirementProgress presence when only one side has it", () => {
    it("stays undefined when neither side has requirementProgress", () => {
      const out = mergeAssessments(mk({}), mk({}), "fill-gaps");
      expect(out.requirementProgress).toBeUndefined();
    });

    it("is populated when only existing has requirementProgress", () => {
      const ex = mk({ requirementProgress: { k: rp({ level: 2 }) } });
      const out = mergeAssessments(ex, mk({}), "fill-gaps");
      expect(out.requirementProgress).toEqual({ k: rp({ level: 2 }) });
    });

    it("is populated when only incoming has requirementProgress", () => {
      const inc = mk({ requirementProgress: { k: rp({ level: 2 }) } });
      const out = mergeAssessments(mk({}), inc, "fill-gaps");
      expect(out.requirementProgress).toEqual({ k: rp({ level: 2 }) });
    });
  });
});

describe("mergeAssessments — category-grain extension fields", () => {
  const key = "ext1.G.strategy-and-vision";

  it("fill-gaps fills evidence/workspace from incoming when existing is empty", () => {
    const existing = mk({ progress: { [key]: pd({ level: 0 }) } });
    const incoming = mk({
      progress: {
        [key]: pd({
          level: 3,
          result: "3 - Advanced",
          evidence: "inc-ev",
          pocId: "poc-9",
          interviewDate: "2026-02-02",
          artifactIds: ["a1"],
        }),
      },
    });
    const merged = mergeAssessments(existing, incoming, "fill-gaps");
    const e = merged.progress[key];
    expect(e.evidence).toBe("inc-ev");
    expect(e.pocId).toBe("poc-9");
    expect(e.interviewDate).toBe("2026-02-02");
    expect(e.artifactIds).toEqual(["a1"]);
  });

  it("does not treat an evidence-only entry as empty (keeps existing over incoming)", () => {
    const existing = mk({
      progress: { [key]: pd({ level: 0, evidence: "mine" }) },
    });
    const incoming = mk({
      progress: {
        [key]: pd({ level: 4, result: "4 - Managed", evidence: "theirs" }),
      },
    });
    const merged = mergeAssessments(existing, incoming, "fill-gaps");
    expect(merged.progress[key].evidence).toBe("mine");
    expect(merged.progress[key].level).toBe(0);
  });
});
