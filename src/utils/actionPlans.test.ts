import {
  addActionPlan,
  addPlanListItem,
  updatePlanListItem,
  removePlanListItem,
  addPlanTask,
  togglePlanTask,
  updatePlanTaskLabel,
  removePlanTask,
  normalizeActionPlans,
  normalizeAssessmentActionPlans,
  updateActionPlanField,
  removeActionPlan,
} from "./actionPlans";
import type { ActionPlans } from "../types/types";

describe("addActionPlan", () => {
  it("seeds categories[key] = { targetLevel } on an undefined ActionPlans", () => {
    const next = addActionPlan(undefined, "G.c1", 3);
    expect(next.categories).toEqual({ "G.c1": { targetLevel: 3 } });
  });
  it("adds a plan preserving existing category entries", () => {
    const ap = {
      categories: { "G.c1": { targetLevel: 2, objectives: "x" } },
    } as unknown as ActionPlans;
    const next = addActionPlan(ap, "M.c2", 4);
    expect(next.categories!["G.c1"]).toEqual({
      targetLevel: 2,
      objectives: "x",
    });
    expect(next.categories!["M.c2"]).toEqual({ targetLevel: 4 });
  });
  it("is a same-reference no-op when the category is already planned", () => {
    const ap: ActionPlans = { categories: { "G.c1": { targetLevel: 2 } } };
    expect(addActionPlan(ap, "G.c1", 5)).toBe(ap); // does not clobber the existing plan
  });
});

describe("updateActionPlanField", () => {
  const ap: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 }, "M.c2": { targetLevel: 3 } },
  };
  it("merges a field onto the entry, preserving its other fields and other entries", () => {
    const next = updateActionPlanField(
      ap,
      "G.c1",
      "responsibility",
      "Team lead",
    );
    expect(next.categories!["G.c1"]).toEqual({
      targetLevel: 2,
      responsibility: "Team lead",
    });
    expect(next.categories!["M.c2"]).toEqual({ targetLevel: 3 }); // untouched
  });
  it("updates targetLevel as a number", () => {
    const next = updateActionPlanField(ap, "G.c1", "targetLevel", 4);
    expect(next.categories!["G.c1"].targetLevel).toBe(4);
  });
  it("is a no-op returning ap unchanged when the category has no plan", () => {
    expect(updateActionPlanField(ap, "O.zzz", "responsibility", "x")).toBe(ap);
  });
});

describe("removeActionPlan", () => {
  it("deletes one entry, preserving the rest", () => {
    const ap: ActionPlans = {
      categories: { "G.c1": { targetLevel: 2 }, "M.c2": { targetLevel: 3 } },
    };
    const next = removeActionPlan(ap, "G.c1");
    expect(next.categories).toEqual({ "M.c2": { targetLevel: 3 } });
  });
  it("is a no-op returning ap unchanged when the category has no plan", () => {
    const ap: ActionPlans = { categories: { "G.c1": { targetLevel: 2 } } };
    expect(removeActionPlan(ap, "O.zzz")).toBe(ap);
  });
});

let n = 0;
const makeId = () => `id-${++n}`;
beforeEach(() => {
  n = 0;
});

const seeded = (): ActionPlans => addActionPlan(undefined, "G.c1", 3);

test("addPlanListItem appends an item with injected id and empty text", () => {
  const ap = addPlanListItem(seeded(), "G.c1", "objectives", makeId);
  expect(ap.categories!["G.c1"].objectives).toEqual([{ id: "id-1", text: "" }]);
});

test("updatePlanListItem sets the matching item's text", () => {
  let ap = addPlanListItem(seeded(), "G.c1", "outputs", makeId);
  ap = updatePlanListItem(ap, "G.c1", "outputs", "id-1", "Runbook");
  expect(ap.categories!["G.c1"].outputs).toEqual([
    { id: "id-1", text: "Runbook" },
  ]);
});

test("removePlanListItem drops the matching item", () => {
  let ap = addPlanListItem(seeded(), "G.c1", "objectives", makeId);
  ap = addPlanListItem(ap, "G.c1", "objectives", makeId);
  ap = removePlanListItem(ap, "G.c1", "objectives", "id-1");
  expect(ap.categories!["G.c1"].objectives).toEqual([{ id: "id-2", text: "" }]);
});

test("list reducers no-op (same ref) when the plan is absent", () => {
  const ap = seeded();
  expect(addPlanListItem(ap, "MISSING", "objectives", makeId)).toBe(ap);
});

test("task reducers add/toggle/update/remove", () => {
  let ap = addPlanTask(seeded(), "G.c1", makeId);
  expect(ap.categories!["G.c1"].tasks).toEqual([
    { itemId: "id-1", label: "", done: false },
  ]);
  ap = updatePlanTaskLabel(ap, "G.c1", "id-1", "Inventory HSMs");
  ap = togglePlanTask(ap, "G.c1", "id-1");
  expect(ap.categories!["G.c1"].tasks).toEqual([
    { itemId: "id-1", label: "Inventory HSMs", done: true },
  ]);
  ap = removePlanTask(ap, "G.c1", "id-1");
  expect(ap.categories!["G.c1"].tasks).toEqual([]);
});

test("normalizeActionPlans coerces legacy string objectives/outputs/tasks", () => {
  const legacy = {
    categories: {
      "G.c1": {
        targetLevel: 3,
        objectives: "Formalise lifecycle",
        outputs: "Runbook",
        tasks: "Inventory HSMs",
      },
    },
  } as unknown as ActionPlans;
  const out = normalizeActionPlans(legacy)!;
  expect(out.categories!["G.c1"]).toEqual({
    targetLevel: 3,
    objectives: [{ id: "obj-0", text: "Formalise lifecycle" }],
    outputs: [{ id: "out-0", text: "Runbook" }],
    tasks: [{ itemId: "task-0", label: "Inventory HSMs", done: false }],
  });
});

test("normalize folds a valid date schedule into targetDate; a non-date into comments", () => {
  const a = normalizeActionPlans({
    categories: { "G.c1": { targetLevel: 2, schedule: "2026-09-30" } },
  } as unknown as ActionPlans)!;
  expect(a.categories!["G.c1"].targetDate).toBe("2026-09-30");
  expect("schedule" in a.categories!["G.c1"]).toBe(false);

  const b = normalizeActionPlans({
    categories: {
      "G.c1": { targetLevel: 2, schedule: "Q3 phased", comments: "note" },
    },
  } as unknown as ActionPlans)!;
  expect(b.categories!["G.c1"].targetDate).toBeUndefined();
  expect(b.categories!["G.c1"].comments).toBe("note\nQ3 phased");
});

test("normalize rejects an invalid date schedule (2026-99-99 → comments)", () => {
  const a = normalizeActionPlans({
    categories: { "G.c1": { targetLevel: 2, schedule: "2026-99-99" } },
  } as unknown as ActionPlans)!;
  expect(a.categories!["G.c1"].targetDate).toBeUndefined();
  expect(a.categories!["G.c1"].comments).toBe("2026-99-99");
});

test("normalize is idempotent on new-shape data and drops empty fields", () => {
  const newShape: ActionPlans = {
    categories: {
      "G.c1": {
        targetLevel: 3,
        objectives: [{ id: "o1", text: "x" }],
        tasks: [{ itemId: "t1", label: "y", done: true }],
      },
    },
  };
  expect(normalizeActionPlans(newShape)).toEqual(newShape);
  const empty = normalizeActionPlans({
    categories: { "G.c1": { targetLevel: 1, objectives: "" } },
  } as unknown as ActionPlans)!;
  expect(empty.categories!["G.c1"].objectives).toBeUndefined();
});

test("normalizeAssessmentActionPlans normalizes actionPlans and preserves other fields", () => {
  const assessment = {
    id: "a1",
    name: "One",
    actionPlans: {
      categories: { "G.c1": { targetLevel: 2, objectives: "Do it" } },
    } as unknown as ActionPlans,
  };
  const out = normalizeAssessmentActionPlans(assessment);
  expect(out.id).toBe("a1");
  expect(out.name).toBe("One");
  expect(out.actionPlans!.categories!["G.c1"].objectives).toEqual([
    { id: "obj-0", text: "Do it" },
  ]);
});
