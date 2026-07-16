import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { WorkspaceLinksSection } from "./WorkspaceLinksSection";
import type { WorkspaceLinks } from "./RequirementCard";
import type { RequirementProgress } from "../../types/types";

expect.extend(toHaveNoViolations);

const workspaceLinks: WorkspaceLinks = {
  pocs: [{ id: "poc1", name: "Jane Doe", role: "PKI Admin" }],
  artifacts: [
    { id: "art1", title: "CPS document" },
    { id: "art2", title: "Key ceremony log" },
  ],
};

const baseProgress: RequirementProgress = {
  level: 0,
  applicability: true,
  notes: "",
  evidence: "",
  pocId: "poc1",
  artifactIds: ["art1"],
};

const renderSection = (
  progress: RequirementProgress | undefined = baseProgress,
  onFieldChange = jest.fn(),
) =>
  render(
    <WorkspaceLinksSection
      idPrefix="G.cat.req1"
      workspaceLinks={workspaceLinks}
      links={progress}
      onFieldChange={onFieldChange}
    />,
  );

const openDetails = (container: HTMLElement): void => {
  (container.querySelector("details") as HTMLDetailsElement).open = true;
};

test("collapsed by default: summary shown, details closed", () => {
  const { container } = renderSection();
  expect(
    screen.getByText(/Workspace links — Jane Doe · CPS document/),
  ).toBeInTheDocument();
  const details = container.querySelector("details");
  expect(details).not.toBeNull();
  expect((details as HTMLDetailsElement).open).toBe(false);
});

test("the add reveal (search box) is not mounted until Add artifact is clicked", () => {
  const { container } = renderSection();
  openDetails(container);
  expect(screen.queryByRole("searchbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add artifact" }));
  expect(screen.getByRole("searchbox")).toBeInTheDocument();
});

test("a linked artifact shows as a chip and its remove button clears it", () => {
  const onFieldChange = jest.fn();
  const { container } = renderSection(baseProgress, onFieldChange);
  openDetails(container);
  fireEvent.click(screen.getByRole("button", { name: "Remove CPS document" }));
  expect(onFieldChange).toHaveBeenCalledWith("artifactIds", []);
});

test("Add artifact opens a click-to-add list of only unlinked artifacts; no checkboxes", () => {
  const { container } = renderSection();
  openDetails(container);
  fireEvent.click(screen.getByRole("button", { name: "Add artifact" }));
  // The linked artifact (CPS document) is a chip, not an add row.
  expect(screen.queryByRole("button", { name: "Add CPS document" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Add Key ceremony log" }),
  ).toBeInTheDocument();
  // No checkboxes anywhere in the editor.
  expect(screen.queryByRole("checkbox")).toBeNull();
});

test("the add list filters by search and shows a no-match message", () => {
  const { container } = renderSection();
  openDetails(container);
  fireEvent.click(screen.getByRole("button", { name: "Add artifact" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "key" } });
  expect(
    screen.getByRole("button", { name: "Add Key ceremony log" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
  expect(screen.getByText(/no artifacts match/i)).toBeInTheDocument();
});

test("clicking an add row adds its id", () => {
  const onFieldChange = jest.fn();
  const { container } = renderSection(baseProgress, onFieldChange);
  openDetails(container);
  fireEvent.click(screen.getByRole("button", { name: "Add artifact" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Key ceremony log" }));
  expect(onFieldChange).toHaveBeenCalledWith("artifactIds", ["art1", "art2"]);
});

test("when every artifact is linked, the add list shows an all-attached message", () => {
  const { container } = renderSection({
    ...baseProgress,
    artifactIds: ["art1", "art2"],
  });
  openDetails(container);
  fireEvent.click(screen.getByRole("button", { name: "Add artifact" }));
  expect(screen.getByText(/all artifacts attached/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Add Key/ })).toBeNull();
});

test("POC select and interview date write via onFieldChange", () => {
  const onFieldChange = jest.fn();
  // Start with no POC so the change is a real none -> poc1 transition.
  const { container } = renderSection(
    { ...baseProgress, pocId: undefined },
    onFieldChange,
  );
  openDetails(container);
  fireEvent.change(
    screen.getByRole("combobox", { name: /point of contact/i }),
    { target: { value: "poc1" } },
  );
  expect(onFieldChange).toHaveBeenCalledWith("pocId", "poc1");
  fireEvent.change(screen.getByLabelText(/interview date/i), {
    target: { value: "2026-08-01" },
  });
  expect(onFieldChange).toHaveBeenCalledWith("interviewDate", "2026-08-01");
});

test("clearing the POC select writes pocId undefined", () => {
  const onFieldChange = jest.fn();
  const { container } = renderSection(baseProgress, onFieldChange);
  openDetails(container);
  fireEvent.change(
    screen.getByRole("combobox", { name: /point of contact/i }),
    { target: { value: "" } },
  );
  expect(onFieldChange).toHaveBeenCalledWith("pocId", undefined);
});

test("works with a plain category-grain links object", () => {
  const onFieldChange = jest.fn();
  render(
    <WorkspaceLinksSection
      idPrefix="ext1.G.strategy-and-vision"
      workspaceLinks={{
        pocs: [{ id: "p1", name: "Dana" }],
        artifacts: [{ id: "a1", title: "Policy doc" }],
      }}
      links={{ pocId: undefined, artifactIds: [], interviewDate: undefined }}
      onFieldChange={onFieldChange}
    />,
  );
  fireEvent.click(screen.getByText(/Workspace links/i));
  fireEvent.change(
    screen.getByRole("combobox", { name: /point of contact/i }),
    { target: { value: "p1" } },
  );
  expect(onFieldChange).toHaveBeenCalledWith("pocId", "p1");
});

test("no axe violations collapsed, expanded, and add-list-open", async () => {
  const { container } = renderSection();
  expect(await axe(container)).toHaveNoViolations();
  const details = container.querySelector("details") as HTMLDetailsElement;
  details.open = true;
  expect(await axe(container)).toHaveNoViolations();
  fireEvent.click(screen.getByRole("button", { name: "Add artifact" }));
  expect(await axe(container)).toHaveNoViolations();
});
