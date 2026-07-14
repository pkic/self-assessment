import { shouldLeaveEvaluationTab } from "./evaluationTab";

test("leaves the Evaluation tab when the view drops out of full", () => {
  expect(shouldLeaveEvaluationTab("evaluation", "self")).toBe(true);
});

test("stays on the Evaluation tab while still in full view", () => {
  expect(shouldLeaveEvaluationTab("evaluation", "full")).toBe(false);
});

test("is a no-op when a different tab is active", () => {
  expect(shouldLeaveEvaluationTab("report", "self")).toBe(false);
});

test("is a no-op when no tab is active yet", () => {
  expect(shouldLeaveEvaluationTab(null, "self")).toBe(false);
});
