import { shouldLeaveWorkspaceTab } from "./workspaceTab";

test("redirects away from the workspace tab when the view is self", () => {
  expect(shouldLeaveWorkspaceTab("workspace", "self")).toBe(true);
  expect(shouldLeaveWorkspaceTab("workspace", "full")).toBe(false);
  expect(shouldLeaveWorkspaceTab("report", "self")).toBe(false);
  expect(shouldLeaveWorkspaceTab(null, "self")).toBe(false);
});
