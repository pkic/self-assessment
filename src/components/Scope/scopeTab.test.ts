import { shouldLeaveScopeTab } from "./scopeTab";

test("redirects away from the scope tab when the view is self", () => {
  expect(shouldLeaveScopeTab("scope", "self")).toBe(true);
  expect(shouldLeaveScopeTab("scope", "full")).toBe(false);
  expect(shouldLeaveScopeTab("report", "self")).toBe(false);
  expect(shouldLeaveScopeTab(null, "self")).toBe(false);
});
