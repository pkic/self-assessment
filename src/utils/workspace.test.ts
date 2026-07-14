import type {
  Assessment,
  Workspace,
  RequirementProgress,
} from "../types/types";
import {
  isDefaultRequirementProgress,
  addArtifact,
  updateArtifact,
  removeArtifact,
  addPoc,
  updatePoc,
  removePoc,
  addChecklistItem,
  updateChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  addIntakeItem,
  updateIntakeItem,
  removeIntakeItem,
  setWorkingNotes,
  rescueOrphanedEntry,
  discardOrphanedEntry,
  loadSuggestedIntake,
  loadSuggestedChecklist,
  SUGGESTED_INTAKE_QUESTIONS,
  SUGGESTED_CHECKLIST_TASKS,
} from "./workspace";

describe("isDefaultRequirementProgress", () => {
  it("is true for undefined", () => {
    expect(isDefaultRequirementProgress(undefined)).toBe(true);
  });

  it("is true for the default shape (level 0, applicable, no notes/evidence)", () => {
    const rp: RequirementProgress = {
      level: 0,
      applicability: true,
      notes: "",
      evidence: "",
    };
    expect(isDefaultRequirementProgress(rp)).toBe(true);
  });

  it("is false when level > 0", () => {
    const rp: RequirementProgress = {
      level: 2,
      applicability: true,
      notes: "",
      evidence: "",
    };
    expect(isDefaultRequirementProgress(rp)).toBe(false);
  });

  it("is false when applicability is false", () => {
    const rp: RequirementProgress = {
      level: 0,
      applicability: false,
      notes: "",
      evidence: "",
    };
    expect(isDefaultRequirementProgress(rp)).toBe(false);
  });

  it("is false when notes is non-empty", () => {
    const rp: RequirementProgress = {
      level: 0,
      applicability: true,
      notes: "some rationale",
      evidence: "",
    };
    expect(isDefaultRequirementProgress(rp)).toBe(false);
  });

  it("is false when evidence is non-empty", () => {
    const rp: RequirementProgress = {
      level: 0,
      applicability: true,
      notes: "",
      evidence: "some evidence",
    };
    expect(isDefaultRequirementProgress(rp)).toBe(false);
  });
});

describe("artifact reducers", () => {
  it("addArtifact initializes artifacts on an undefined workspace", () => {
    const result = addArtifact(undefined, {
      id: "a1",
      title: "Policy doc",
      locator: "https://example.com/policy",
    });
    expect(result.artifacts).toEqual([
      { id: "a1", title: "Policy doc", locator: "https://example.com/policy" },
    ]);
  });

  it("addArtifact preserves other workspace keys", () => {
    const ws: Workspace = { workingNotes: "keep me" };
    const result = addArtifact(ws, {
      id: "a1",
      title: "Policy doc",
      locator: "loc",
    });
    expect(result.workingNotes).toBe("keep me");
  });

  it("updateArtifact merges a patch by id, leaving others untouched", () => {
    const ws: Workspace = {
      artifacts: [
        { id: "a1", title: "Old title", locator: "loc1" },
        { id: "a2", title: "Other", locator: "loc2" },
      ],
    };
    const result = updateArtifact(ws, "a1", { title: "New title" });
    expect(result.artifacts).toEqual([
      { id: "a1", title: "New title", locator: "loc1" },
      { id: "a2", title: "Other", locator: "loc2" },
    ]);
  });

  it("removeArtifact drops the matching id and keeps the rest", () => {
    const ws: Workspace = {
      artifacts: [
        { id: "a1", title: "One", locator: "loc1" },
        { id: "a2", title: "Two", locator: "loc2" },
      ],
    };
    const result = removeArtifact(ws, "a1");
    expect(result.artifacts).toEqual([
      { id: "a2", title: "Two", locator: "loc2" },
    ]);
  });
});

describe("poc reducers", () => {
  it("addPoc initializes pocs on an undefined workspace", () => {
    const result = addPoc(undefined, { id: "p1", name: "Jane" });
    expect(result.pocs).toEqual([{ id: "p1", name: "Jane" }]);
  });

  it("updatePoc merges a patch by id, leaving others untouched", () => {
    const ws: Workspace = {
      pocs: [
        { id: "p1", name: "Jane", role: "CISO" },
        { id: "p2", name: "Bob" },
      ],
    };
    const result = updatePoc(ws, "p1", { role: "CTO" });
    expect(result.pocs).toEqual([
      { id: "p1", name: "Jane", role: "CTO" },
      { id: "p2", name: "Bob" },
    ]);
  });

  it("removePoc drops the matching id and keeps the rest", () => {
    const ws: Workspace = {
      pocs: [
        { id: "p1", name: "Jane" },
        { id: "p2", name: "Bob" },
      ],
    };
    const result = removePoc(ws, "p1");
    expect(result.pocs).toEqual([{ id: "p2", name: "Bob" }]);
  });
});

describe("checklist reducers", () => {
  it("addChecklistItem initializes checklist on an undefined workspace and stamps done:false, custom:true", () => {
    const result = addChecklistItem(undefined, {
      itemId: "c1",
      label: "Collect CP/CPS",
    });
    expect(result.checklist).toEqual([
      { itemId: "c1", label: "Collect CP/CPS", done: false, custom: true },
    ]);
  });

  it("updateChecklistItem merges a patch by itemId, leaving others untouched", () => {
    const ws: Workspace = {
      checklist: [
        { itemId: "c1", label: "Old label", done: false, custom: true },
        { itemId: "c2", label: "Other", done: true },
      ],
    };
    const result = updateChecklistItem(ws, "c1", { label: "New label" });
    expect(result.checklist).toEqual([
      { itemId: "c1", label: "New label", done: false, custom: true },
      { itemId: "c2", label: "Other", done: true },
    ]);
  });

  it("toggleChecklistItem flips done for the matching item only", () => {
    const ws: Workspace = {
      checklist: [
        { itemId: "c1", label: "One", done: false },
        { itemId: "c2", label: "Two", done: false },
      ],
    };
    const result = toggleChecklistItem(ws, "c1");
    expect(result.checklist).toEqual([
      { itemId: "c1", label: "One", done: true },
      { itemId: "c2", label: "Two", done: false },
    ]);
  });

  it("removeChecklistItem drops the matching itemId and keeps the rest", () => {
    const ws: Workspace = {
      checklist: [
        { itemId: "c1", label: "One", done: false },
        { itemId: "c2", label: "Two", done: false },
      ],
    };
    const result = removeChecklistItem(ws, "c1");
    expect(result.checklist).toEqual([
      { itemId: "c2", label: "Two", done: false },
    ]);
  });
});

describe("intake reducers", () => {
  it("addIntakeItem initializes intake on an undefined workspace", () => {
    const result = addIntakeItem(undefined, {
      questionId: "q1",
      question: "What is your org size?",
      answer: "500",
    });
    expect(result.intake).toEqual([
      { questionId: "q1", question: "What is your org size?", answer: "500" },
    ]);
  });

  it("updateIntakeItem merges a patch by questionId, leaving others untouched", () => {
    const ws: Workspace = {
      intake: [
        { questionId: "q1", question: "Q1", answer: "A1" },
        { questionId: "q2", question: "Q2", answer: "A2" },
      ],
    };
    const result = updateIntakeItem(ws, "q1", { answer: "Updated A1" });
    expect(result.intake).toEqual([
      { questionId: "q1", question: "Q1", answer: "Updated A1" },
      { questionId: "q2", question: "Q2", answer: "A2" },
    ]);
  });

  it("removeIntakeItem drops the matching questionId and keeps the rest", () => {
    const ws: Workspace = {
      intake: [
        { questionId: "q1", question: "Q1", answer: "A1" },
        { questionId: "q2", question: "Q2", answer: "A2" },
      ],
    };
    const result = removeIntakeItem(ws, "q1");
    expect(result.intake).toEqual([
      { questionId: "q2", question: "Q2", answer: "A2" },
    ]);
  });
});

describe("setWorkingNotes", () => {
  it("sets workingNotes on an undefined workspace", () => {
    const result = setWorkingNotes(undefined, "some notes");
    expect(result.workingNotes).toBe("some notes");
  });

  it("overwrites existing workingNotes while preserving other keys", () => {
    const ws: Workspace = {
      workingNotes: "old notes",
      artifacts: [{ id: "a1", title: "T", locator: "L" }],
    };
    const result = setWorkingNotes(ws, "new notes");
    expect(result.workingNotes).toBe("new notes");
    expect(result.artifacts).toEqual([{ id: "a1", title: "T", locator: "L" }]);
  });
});

const rp = (level: number): RequirementProgress => ({
  level,
  applicability: true,
  notes: "",
  evidence: "",
});

const makeAssessment = (workspace: Workspace | undefined): Assessment => ({
  id: "id-1",
  name: "Assessment",
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: "Assessment",
  assessorName: "",
  useCaseDescription: "",
  requirementProgress: { "G.other.r1": rp(1) },
  workspace,
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-07-05T10:00:00.000Z",
    updatedAt: "2026-07-05T10:00:00.000Z",
  },
});

describe("rescueOrphanedEntry", () => {
  it("moves the orphaned payload to the target requirement key and removes it from orphanedEntries", () => {
    const a = makeAssessment({
      orphanedEntries: [{ originalKey: "G.old.r1", payload: rp(3) }],
    });
    const result = rescueOrphanedEntry(a, "G.old.r1", "G.new.r1");
    expect(result.requirementProgress?.["G.new.r1"]).toEqual(rp(3));
    expect(result.workspace?.orphanedEntries).toEqual([]);
  });

  it("preserves other requirement entries", () => {
    const a = makeAssessment({
      orphanedEntries: [{ originalKey: "G.old.r1", payload: rp(3) }],
    });
    const result = rescueOrphanedEntry(a, "G.old.r1", "G.new.r1");
    expect(result.requirementProgress?.["G.other.r1"]).toEqual(rp(1));
  });

  it("preserves other orphaned entries", () => {
    const a = makeAssessment({
      orphanedEntries: [
        { originalKey: "G.old.r1", payload: rp(3) },
        { originalKey: "G.old.r2", payload: rp(4) },
      ],
    });
    const result = rescueOrphanedEntry(a, "G.old.r1", "G.new.r1");
    expect(result.workspace?.orphanedEntries).toEqual([
      { originalKey: "G.old.r2", payload: rp(4) },
    ]);
  });

  it("is a no-op when the originalKey is not found", () => {
    const a = makeAssessment({
      orphanedEntries: [{ originalKey: "G.old.r1", payload: rp(3) }],
    });
    const result = rescueOrphanedEntry(a, "G.missing", "G.new.r1");
    expect(result).toBe(a);
  });
});

describe("discardOrphanedEntry", () => {
  it("removes only the matching orphaned entry", () => {
    const a = makeAssessment({
      orphanedEntries: [
        { originalKey: "G.old.r1", payload: rp(3) },
        { originalKey: "G.old.r2", payload: rp(4) },
      ],
    });
    const result = discardOrphanedEntry(a, "G.old.r1");
    expect(result.workspace?.orphanedEntries).toEqual([
      { originalKey: "G.old.r2", payload: rp(4) },
    ]);
  });

  it("does not touch requirementProgress", () => {
    const a = makeAssessment({
      orphanedEntries: [{ originalKey: "G.old.r1", payload: rp(3) }],
    });
    const result = discardOrphanedEntry(a, "G.old.r1");
    expect(result.requirementProgress).toEqual(a.requirementProgress);
  });
});

describe("loadSuggestedIntake / loadSuggestedChecklist", () => {
  let n = 0;
  const makeId = () => `gen-${n++}`;
  beforeEach(() => {
    n = 0;
  });

  it("seeds the full curated intake set on an empty workspace", () => {
    const ws = loadSuggestedIntake(undefined, makeId);
    expect(ws.intake).toHaveLength(6);
    expect(ws.intake?.map((i) => i.question)).toEqual(
      SUGGESTED_INTAKE_QUESTIONS,
    );
    // Pin representative approved content so a wrong constant is caught.
    expect(ws.intake?.[0].question).toContain(
      "Which PKI best describes your scope",
    );
    expect(ws.intake?.every((i) => i.answer === "")).toBe(true);
  });

  it("seeds the full curated checklist set with done:false, custom:true", () => {
    const ws = loadSuggestedChecklist(undefined, makeId);
    expect(ws.checklist).toHaveLength(8);
    expect(ws.checklist?.map((c) => c.label)).toContain(
      "Complete the Scope section",
    );
    expect(
      ws.checklist?.every((c) => c.done === false && c.custom === true),
    ).toBe(true);
  });

  it("dedupes intake by normalized question text (case/space-insensitive)", () => {
    const seeded = loadSuggestedIntake(undefined, makeId);
    // Mutate one question's casing/spacing; re-loading must not duplicate it.
    const tweaked: Workspace = {
      intake: [
        {
          questionId: "x",
          question: `  ${SUGGESTED_INTAKE_QUESTIONS[0].toUpperCase()}  `,
          answer: "a",
        },
      ],
    };
    const after = loadSuggestedIntake(tweaked, makeId);
    expect(after.intake).toHaveLength(SUGGESTED_INTAKE_QUESTIONS.length);
    // Loading the fully-seeded set again adds nothing.
    const again = loadSuggestedIntake(seeded, makeId);
    expect(again.intake).toHaveLength(SUGGESTED_INTAKE_QUESTIONS.length);
  });

  it("dedupes checklist by normalized label and appends only new items", () => {
    const ws: Workspace = {
      checklist: [
        { itemId: "x", label: SUGGESTED_CHECKLIST_TASKS[0], done: true },
      ],
    };
    const after = loadSuggestedChecklist(ws, makeId);
    expect(after.checklist).toHaveLength(SUGGESTED_CHECKLIST_TASKS.length);
    // The pre-existing (done:true) item is preserved, not reset.
    expect(after.checklist?.[0]).toMatchObject({ done: true });
  });
});
