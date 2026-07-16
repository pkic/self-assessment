import { shouldLeaveActionPlansTab } from "./actionPlansTab";

test("redirects away from the action-plans tab only when the view is self", () => {
  expect(shouldLeaveActionPlansTab("action-plans", "self")).toBe(true);
  expect(shouldLeaveActionPlansTab("action-plans", "full")).toBe(false);
  expect(shouldLeaveActionPlansTab("report", "self")).toBe(false);
  expect(shouldLeaveActionPlansTab(null, "self")).toBe(false);
});
