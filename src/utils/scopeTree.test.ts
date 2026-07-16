import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
  Assessment,
} from "../types/types";
import {
  buildScopeTree,
  setCategoryApplicability,
  setRequirementApplicability,
  applyBulkScope,
  captureScopeTemplate,
  applyScopeTemplate,
  ScopeTemplate,
} from "./scopeTree";
import LevelResult from "../enums/LevelResult";

const rp = (level: number, applicability = true): RequirementProgress => ({
  level,
  applicability,
  notes: "",
  evidence: "",
});

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "c1",
        weight: 3,
        name: "Cat One",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "R1",
            guidance: "",
            assessment: "",
            references: [],
          },
          {
            id: "r2",
            weight: 1,
            description: "R2",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
      {
        id: "c2",
        weight: 2,
        name: "Cat Two",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r3",
            weight: 1,
            description: "R3",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
      {
        id: "c3",
        weight: 1,
        name: "Cat Three",
        description: "",
        levels: [],
        requirements: [],
      },
    ],
  },
];

describe("buildScopeTree", () => {
  it("derives category state and the separate explicitOut flag", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 0, result: "", description: "", applicability: true },
      // c2 explicitly N/A
      "G.c2": {
        level: 0,
        result: "Not Applicable",
        description: "",
        applicability: false,
        applicabilityReason: "n/a here",
      },
      "G.c3": { level: 0, result: "", description: "", applicability: true },
    };
    // c1: r1 in, r2 out -> mixed; c3: no requirements + applicable -> in
    const requirementProgress: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(3),
      "G.c1.r2": rp(0, false),
    };
    const tree = buildScopeTree({ modules, progress, requirementProgress });
    const cats = tree.modules[0].categories;
    const c1 = cats.find((c) => c.key === "G.c1")!;
    const c2 = cats.find((c) => c.key === "G.c2")!;
    const c3 = cats.find((c) => c.key === "G.c3")!;

    expect(c1.state).toBe("mixed");
    expect(c1.explicitOut).toBe(false);
    expect(c1.inScopeCount).toBe(1);
    expect(c1.totalCount).toBe(2);
    expect(c1.requirements.find((r) => r.key === "G.c1.r2")!.inScope).toBe(
      false,
    );

    expect(c2.state).toBe("out");
    expect(c2.explicitOut).toBe(true);
    expect(c2.reason).toBe("n/a here");

    expect(c3.state).toBe("in");
    expect(c3.explicitOut).toBe(false);
    expect(tree.modules[0].state).toBe("mixed");
  });

  it("a category applicable but with every requirement scoped out reads 'out' with explicitOut false (derived N/A)", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 0, result: "", description: "", applicability: true },
    };
    const requirementProgress: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(0, false),
      "G.c1.r2": rp(0, false),
    };
    const tree = buildScopeTree({ modules, progress, requirementProgress });
    const c1 = tree.modules[0].categories.find((c) => c.key === "G.c1")!;
    expect(c1.state).toBe("out");
    expect(c1.explicitOut).toBe(false);
  });
});

describe("setCategoryApplicability / setRequirementApplicability", () => {
  it("sets (not toggles) category applicability and preserves the reason", () => {
    const prev: ProgressData = {
      level: 2,
      result: LevelResult[2],
      description: "",
      applicability: true,
      applicabilityReason: "keep me",
    };
    const out = setCategoryApplicability(prev, false);
    expect(out.applicability).toBe(false);
    expect(out.result).toBe(LevelResult[-1]);
    expect(out.applicabilityReason).toBe("keep me");
    const back = setCategoryApplicability(out, true);
    expect(back.applicability).toBe(true);
    expect(back.result).toBe(LevelResult[2]);
    expect(back.applicabilityReason).toBe("keep me");
  });

  it("sets requirement applicability and preserves other fields", () => {
    const prev: RequirementProgress = {
      level: 4,
      applicability: true,
      notes: "n",
      evidence: "e",
    };
    const out = setRequirementApplicability(prev, false);
    expect(out.applicability).toBe(false);
    expect(out.level).toBe(4);
    expect(out.notes).toBe("n");
    expect(out.evidence).toBe("e");
  });
});

describe("applyBulkScope", () => {
  const base: Assessment = {
    // minimal shape used by the reducer; extra required Assessment fields are
    // filled by the implementer from the type (id/dataVersion/meta/etc.).
  } as unknown as Assessment;

  it("sets category applicability across the named category keys, preserving other progress entries and requirementProgress reference when no requirement keys given", () => {
    const a: Assessment = {
      ...base,
      progress: {
        "G.c1": {
          level: 3,
          result: LevelResult[3],
          description: "",
          applicability: true,
        },
        "G.c2": {
          level: 1,
          result: LevelResult[1],
          description: "",
          applicability: true,
        },
      },
      requirementProgress: { "G.c1.r1": rp(3) },
    } as Assessment;
    const next = applyBulkScope(a, {
      categoryKeys: ["G.c1"],
      value: false,
      nowIso: "2026-07-08T00:00:00.000Z",
    });
    expect(next.progress["G.c1"].applicability).toBe(false);
    expect(next.progress["G.c2"].applicability).toBe(true); // untouched
    expect(next.requirementProgress).toBe(a.requirementProgress); // same reference (no req keys)
  });

  it("sets requirement applicability across the named requirement keys without touching progress", () => {
    const a: Assessment = {
      ...base,
      progress: {
        "G.c1": { level: 0, result: "", description: "", applicability: true },
      },
      requirementProgress: { "G.c1.r1": rp(3), "G.c1.r2": rp(2) },
    } as Assessment;
    const next = applyBulkScope(a, {
      requirementKeys: ["G.c1.r1"],
      value: false,
      nowIso: "2026-07-08T00:00:00.000Z",
    });
    expect(next.requirementProgress!["G.c1.r1"].applicability).toBe(false);
    expect(next.requirementProgress!["G.c1.r1"].level).toBe(3); // preserved
    expect(next.requirementProgress!["G.c1.r2"].applicability).toBe(true); // untouched
    expect(next.progress).toBe(a.progress); // same reference (no category keys)
  });
});

describe("captureScopeTemplate / applyScopeTemplate", () => {
  it("captures explicit-N/A category keys only (never derived-N/A) plus out-of-scope requirement keys", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 0, result: "", description: "", applicability: true }, // derived-N/A below
      "G.c2": {
        level: 0,
        result: "Not Applicable",
        description: "",
        applicability: false,
      }, // explicit
      "G.c3": { level: 0, result: "", description: "", applicability: true },
    };
    const requirementProgress: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(0, false),
      "G.c1.r2": rp(0, false), // c1 derived-N/A
    };
    const t = captureScopeTemplate(
      "T1",
      { modules, progress, requirementProgress },
      "2026-07-08T00:00:00.000Z",
      "tpl-1",
    );
    expect(t.outOfScopeCategoryKeys).toEqual(["G.c2"]); // NOT G.c1 (derived)
    expect(t.outOfScopeRequirementKeys.sort()).toEqual(["G.c1.r1", "G.c1.r2"]);
    expect(t.id).toBe("tpl-1");
    expect(t.name).toBe("T1");
  });

  it("apply sets applicability per template, preserves levels/notes, and a capture->apply round-trip keeps derived-N/A derived", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 0, result: "", description: "", applicability: true },
      "G.c2": {
        level: 0,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
      "G.c3": { level: 0, result: "", description: "", applicability: true },
    };
    const requirementProgress: Record<string, RequirementProgress> = {
      "G.c1.r1": rp(4, false),
      "G.c1.r2": rp(0, false),
      "G.c2.r3": rp(2),
    };
    const t = captureScopeTemplate(
      "T",
      { modules, progress, requirementProgress },
      "2026-07-08T00:00:00.000Z",
      "tpl-1",
    );
    const fresh: Assessment = {
      progress: {},
      requirementProgress: {},
    } as unknown as Assessment;
    const applied = applyScopeTemplate(
      fresh,
      t,
      modules,
      "2026-07-08T01:00:00.000Z",
    );
    // c2 explicit-out; c1/c3 stay applicable
    expect(applied.progress["G.c2"].applicability).toBe(false);
    expect(applied.progress["G.c1"].applicability).toBe(true);
    // requirement scope reproduced
    expect(applied.requirementProgress!["G.c1.r1"].applicability).toBe(false);
    expect(applied.requirementProgress!["G.c1.r2"].applicability).toBe(false);
    expect(applied.requirementProgress!["G.c2.r3"].applicability).toBe(true);
    // c1 remains derived-N/A (applicable + all reqs out), not upgraded to explicit
    const tree = buildScopeTree({
      modules,
      progress: applied.progress,
      requirementProgress: applied.requirementProgress!,
    });
    const c1 = tree.modules[0].categories.find((c) => c.key === "G.c1")!;
    expect(c1.explicitOut).toBe(false);
    expect(c1.state).toBe("out");
  });

  it("apply ignores template keys absent from the model and defaults model nodes absent from the template to in-scope", () => {
    const t: ScopeTemplate = {
      id: "x",
      name: "x",
      createdAt: "",
      updatedAt: "",
      outOfScopeCategoryKeys: ["G.zzz"],
      outOfScopeRequirementKeys: ["G.c9.r9"],
    };
    const a: Assessment = {
      progress: {},
      requirementProgress: {},
    } as unknown as Assessment;
    const applied = applyScopeTemplate(
      a,
      t,
      modules,
      "2026-07-08T00:00:00.000Z",
    );
    // unknown keys ignored; all real nodes default in-scope
    expect(applied.progress["G.c1"].applicability).toBe(true);
    expect(applied.requirementProgress!["G.c1.r1"].applicability).toBe(true);
    expect(applied.progress["G.zzz"]).toBeUndefined();
  });
});

describe("captureScopeTemplate dataVersion", () => {
  it("stamps the passed dataVersion", () => {
    const t = captureScopeTemplate(
      "T",
      { modules, progress: {}, requirementProgress: {} },
      "2026-07-14T00:00:00.000Z",
      "tpl-x",
      "2.0.0",
    );
    expect(t.dataVersion).toBe("2.0.0");
  });

  it("leaves dataVersion undefined when not passed", () => {
    const t = captureScopeTemplate(
      "T",
      { modules, progress: {}, requirementProgress: {} },
      "2026-07-14T00:00:00.000Z",
      "tpl-y",
    );
    expect(t.dataVersion).toBeUndefined();
  });
});
