import { resetAssessment, type ResetScopes } from "./resetAssessment";
import type { Assessment, ProgressData } from "../types/types";

const NONE: ResetScopes = {
  ratings: false,
  actionPlans: false,
  workspace: false,
  reportDetails: false,
};
const empty: Record<string, ProgressData> = {
  "G.c1": { level: 0, result: "", description: "", applicability: true },
};
const deps = { emptyProgress: empty };

const base = (): Assessment => ({
  id: "id1",
  name: "Keep",
  dataVersion: "2.0.0",
  progress: {
    "G.c1": { level: 3, result: "", description: "", applicability: true },
  },
  enabledExtensions: [{ id: "e", version: "1.0.0" }],
  assessmentName: "AN",
  assessorName: "Jane",
  useCaseDescription: "UC",
  requirementProgress: {
    "G.c1.r1": { level: 2, applicability: true, notes: "", evidence: "" },
  },
  organizationName: "Org",
  assessorCompany: "Co",
  assessorPosition: "internal",
  assessmentType: "self",
  startDate: "2026-01-01",
  targetDate: "2026-06-01",
  finishDate: "2026-05-01",
  pkiEnvironment: { components: "x" },
  workspace: { workingNotes: "wn" },
  actionPlans: { categories: { "G.c1": { targetLevel: 4 } } },
  sourceStructure: { byKey: {} },
  meta: { createdAt: "a", updatedAt: "b" },
});

test("empty selection returns the assessment unchanged (content-equal)", () => {
  expect(resetAssessment(base(), NONE, deps)).toEqual(base());
});

test("ratings resets progress (to emptyProgress) + requirementProgress; keeps everything else", () => {
  const r = resetAssessment(base(), { ...NONE, ratings: true }, deps);
  expect(r.progress).toEqual(empty);
  expect(r.requirementProgress).toEqual({});
  expect(r.workspace).toEqual({ workingNotes: "wn" });
  expect(r.actionPlans).toEqual({ categories: { "G.c1": { targetLevel: 4 } } });
  expect(r.organizationName).toBe("Org");
  expect(r.enabledExtensions).toEqual([{ id: "e", version: "1.0.0" }]);
  expect(r.name).toBe("Keep");
});

test("ratings preserves a hidden-extension progress key absent from emptyProgress", () => {
  const withHiddenExt: Assessment = {
    ...base(),
    progress: {
      ...base().progress,
      "ext-x.G.c1": {
        level: 4,
        result: "",
        description: "",
        applicability: true,
      },
    },
  };
  const r = resetAssessment(withHiddenExt, { ...NONE, ratings: true }, deps);
  expect(r.progress["G.c1"]).toEqual(empty["G.c1"]);
  expect(r.progress["ext-x.G.c1"]).toEqual({
    level: 4,
    result: "",
    description: "",
    applicability: true,
  });
});

test("actionPlans + workspace scopes clear only those", () => {
  const r = resetAssessment(
    base(),
    { ...NONE, actionPlans: true, workspace: true },
    deps,
  );
  expect(r.actionPlans).toBeUndefined();
  expect(r.workspace).toBeUndefined();
  expect(r.progress["G.c1"].level).toBe(3);
});

test("reportDetails clears names + metadata + pkiEnvironment; keeps ratings + name + enabledExtensions", () => {
  const r = resetAssessment(base(), { ...NONE, reportDetails: true }, deps);
  expect(r.assessmentName).toBe("");
  expect(r.assessorName).toBe("");
  expect(r.useCaseDescription).toBe("");
  expect(r.organizationName).toBeUndefined();
  expect(r.assessorCompany).toBeUndefined();
  expect(r.assessorPosition).toBeUndefined();
  expect(r.assessmentType).toBeUndefined();
  expect(r.startDate).toBeUndefined();
  expect(r.targetDate).toBeUndefined();
  expect(r.finishDate).toBeUndefined();
  expect(r.pkiEnvironment).toBeUndefined();
  expect(r.name).toBe("Keep");
  expect(r.enabledExtensions).toEqual([{ id: "e", version: "1.0.0" }]);
  expect(r.progress["G.c1"].level).toBe(3);
});

test("all scopes = full content reset", () => {
  const r = resetAssessment(
    base(),
    { ratings: true, actionPlans: true, workspace: true, reportDetails: true },
    deps,
  );
  expect(r.progress).toEqual(empty);
  expect(r.requirementProgress).toEqual({});
  expect(r.actionPlans).toBeUndefined();
  expect(r.workspace).toBeUndefined();
  expect(r.assessmentName).toBe("");
  expect(r.pkiEnvironment).toBeUndefined();
});
