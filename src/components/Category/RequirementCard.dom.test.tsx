import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequirementCard } from "./RequirementCard";
import type { WorkspaceLinks } from "./RequirementCard";
import type { RequirementView } from "../../utils/requirementFilter";

const view = (over: Partial<RequirementView> = {}): RequirementView => ({
  moduleId: "G",
  categoryId: "c1",
  requirementId: "r1",
  key: "G.c1.r1",
  description: "Key ceremony",
  guidance: "roots guidance",
  assessment: "criteria text",
  weight: 2,
  level: 0,
  applicability: true,
  completed: false,
  flagged: false,
  ...over,
});

const noop = () => {};
const baseProps = {
  progress: undefined,
  referenceIds: [],
  onToggleApplicability: noop,
  onFieldChange: noop as never,
  onNavigate: noop,
};

test("renders name, weight, and a text-labelled status chip without any ordinal", () => {
  render(<RequirementCard view={view()} onLevelChange={noop} {...baseProps} />);
  expect(screen.getByText("Key ceremony")).toBeInTheDocument();
  expect(screen.getByText(/weight 2/i)).toBeInTheDocument();
  expect(screen.getByText("Not Assessed")).toBeInTheDocument(); // chip text label
  expect(screen.queryByText(/#\d/)).toBeNull(); // no positional ordinal anywhere in the header
});

test("the requirement description renders as the card's prominent title element", () => {
  const { container } = render(
    <RequirementCard view={view()} onLevelChange={noop} {...baseProps} />,
  );
  const title = container.querySelector(".pkimm-requirement-card__title");
  expect(title).not.toBeNull();
  expect(title).toHaveTextContent("Key ceremony");
  // It stays a non-heading element (no broken heading outline).
  expect(title?.tagName).not.toMatch(/^H[1-6]$/);
});

test("the card root carries a status-level class for the accent bar", () => {
  const { container } = render(
    <RequirementCard
      view={view({ level: 3, applicability: true })}
      onLevelChange={noop}
      {...baseProps}
    />,
  );
  expect(
    container.querySelector(".pkimm-requirement-card.level-3"),
  ).not.toBeNull();
});

test("level radiogroup: clicking a level fires onLevelChange", () => {
  const onLevelChange = jest.fn();
  render(
    <RequirementCard
      view={view()}
      onLevelChange={onLevelChange}
      {...baseProps}
    />,
  );
  fireEvent.click(screen.getByRole("radio", { name: /level 3/i }));
  expect(onLevelChange).toHaveBeenCalledWith(3);
});

test("keyboard: pressing 4 on the card sets level 4, f toggles flag, n navigates next", () => {
  const onLevelChange = jest.fn();
  const onFieldChange = jest.fn();
  const onNavigate = jest.fn();
  render(
    <RequirementCard
      view={view()}
      onLevelChange={onLevelChange}
      {...baseProps}
      onFieldChange={onFieldChange}
      onNavigate={onNavigate}
    />,
  );
  const card = screen.getByTestId("requirement-card-G.c1.r1");
  fireEvent.keyDown(card, { key: "4" });
  expect(onLevelChange).toHaveBeenCalledWith(4);
  fireEvent.keyDown(card, { key: "f" });
  expect(onFieldChange).toHaveBeenCalledWith("flagged", true);
  fireEvent.keyDown(card, { key: "n" });
  expect(onNavigate).toHaveBeenCalledWith("next");
});

test("typing in the notes textarea does not trigger the level hotkeys", () => {
  const onLevelChange = jest.fn();
  render(
    <RequirementCard
      view={view()}
      onLevelChange={onLevelChange}
      {...baseProps}
      progress={{ level: 0, applicability: true, notes: "", evidence: "" }}
    />,
  );
  const notes = screen.getByLabelText(/Rationale/i);
  fireEvent.keyDown(notes, { key: "3" });
  expect(onLevelChange).not.toHaveBeenCalled();
});

test("out-of-scope requirement shows the applicability reason field", () => {
  render(
    <RequirementCard
      view={view({ applicability: false })}
      onLevelChange={noop}
      {...baseProps}
      progress={{ level: 0, applicability: false, notes: "", evidence: "" }}
    />,
  );
  expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
});

test("clicking the completed control fires onFieldChange('completed', true)", () => {
  const onFieldChange = jest.fn();
  render(
    <RequirementCard
      view={view()}
      onLevelChange={noop}
      {...baseProps}
      onFieldChange={onFieldChange}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /complete/i }));
  expect(onFieldChange).toHaveBeenCalledWith("completed", true);
});

test("in-scope control is a pill toggle button, not a checkbox", () => {
  const onToggleApplicability = jest.fn();
  render(
    <RequirementCard
      view={view()}
      onLevelChange={noop}
      {...baseProps}
      onToggleApplicability={onToggleApplicability}
    />,
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  const toggle = screen.getByRole("button", { name: /in scope/i });
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(toggle).toHaveTextContent("In scope");
  fireEvent.click(toggle);
  expect(onToggleApplicability).toHaveBeenCalledTimes(1);
});

test("out-of-scope in-scope pill reads 'Not applicable' and aria-pressed is false", () => {
  render(
    <RequirementCard
      view={view({ applicability: false })}
      onLevelChange={noop}
      {...baseProps}
      progress={{ level: 0, applicability: false, notes: "", evidence: "" }}
    />,
  );
  const toggle = screen.getByRole("button", { name: /in scope/i });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(toggle).toHaveTextContent("Not applicable");
});

const workspaceLinks: WorkspaceLinks = {
  pocs: [{ id: "poc1", name: "Jane Doe", role: "PKI Admin" }],
  artifacts: [{ id: "art1", title: "CPS document" }],
};

test("with workspaceLinks (POC + artifact), renders a Workspace links group", () => {
  render(
    <RequirementCard
      view={view()}
      onLevelChange={noop}
      {...baseProps}
      workspaceLinks={workspaceLinks}
    />,
  );
  expect(screen.getByText(/workspace links/i)).toBeInTheDocument();
  expect(
    screen.getByRole("combobox", { name: /point of contact/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/interview date/i)).toBeInTheDocument();
});

test("selecting a POC fires onFieldChange('pocId', <id>)", () => {
  const onFieldChange = jest.fn();
  const { container } = render(
    <RequirementCard
      view={view()}
      onLevelChange={noop}
      {...baseProps}
      onFieldChange={onFieldChange}
      workspaceLinks={workspaceLinks}
    />,
  );
  (container.querySelector("details") as HTMLDetailsElement).open = true;
  fireEvent.change(
    screen.getByRole("combobox", { name: /point of contact/i }),
    {
      target: { value: "poc1" },
    },
  );
  expect(onFieldChange).toHaveBeenCalledWith("pocId", "poc1");
});

test("setting the interview date fires onFieldChange('interviewDate', <value>)", () => {
  const onFieldChange = jest.fn();
  const { container } = render(
    <RequirementCard
      view={view()}
      onLevelChange={noop}
      {...baseProps}
      onFieldChange={onFieldChange}
      workspaceLinks={workspaceLinks}
    />,
  );
  (container.querySelector("details") as HTMLDetailsElement).open = true;
  fireEvent.change(screen.getByLabelText(/interview date/i), {
    target: { value: "2026-07-08" },
  });
  expect(onFieldChange).toHaveBeenCalledWith("interviewDate", "2026-07-08");
});

test("with no workspaceLinks, the Workspace links group is absent (quick cards unchanged)", () => {
  render(<RequirementCard view={view()} onLevelChange={noop} {...baseProps} />);
  expect(screen.queryByText(/workspace links/i)).toBeNull();
});

test("with empty pocs and artifacts, the Workspace links group is absent", () => {
  render(
    <RequirementCard
      view={view()}
      onLevelChange={noop}
      {...baseProps}
      workspaceLinks={{ pocs: [], artifacts: [] }}
    />,
  );
  expect(screen.queryByText(/workspace links/i)).toBeNull();
});

test("the notes and evidence fields carry guidance placeholders", () => {
  render(<RequirementCard view={view()} onLevelChange={noop} {...baseProps} />);
  expect(
    screen.getByPlaceholderText(/how this level is met/i),
  ).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText(/documents, systems, or records/i),
  ).toBeInTheDocument();
});

test("the not-applicable reason carries a placeholder when out of scope", () => {
  render(
    <RequirementCard
      view={view({ applicability: false })}
      onLevelChange={noop}
      {...baseProps}
    />,
  );
  expect(
    screen.getByPlaceholderText(/why this requirement doesn't apply/i),
  ).toBeInTheDocument();
});

test("a flagged card shows the flag icon next to the 'Flagged' label", () => {
  const { container } = render(
    <RequirementCard
      view={view({ flagged: true })}
      onLevelChange={noop}
      {...baseProps}
    />,
  );
  const flagButton = screen.getByRole("button", { name: /unflag/i });
  expect(flagButton).toHaveTextContent("Flagged");
  expect(container.querySelector(".pkimm-flag-toggle svg")).not.toBeNull();
});

test("an unflagged card shows plain 'Flag' text with no icon", () => {
  const { container } = render(
    <RequirementCard view={view()} onLevelChange={noop} {...baseProps} />,
  );
  const flagButton = screen.getByRole("button", { name: /flag requirement/i });
  expect(flagButton).toHaveTextContent("Flag");
  expect(container.querySelector(".pkimm-flag-toggle svg")).toBeNull();
});

test("a completed card shows the check icon next to the 'Completed' label", () => {
  const { container } = render(
    <RequirementCard
      view={view({ completed: true })}
      onLevelChange={noop}
      {...baseProps}
    />,
  );
  const completeButton = screen.getByRole("button", { name: /completed/i });
  expect(completeButton).toHaveTextContent("Completed");
  expect(container.querySelector(".pkimm-completed-toggle svg")).not.toBeNull();
});

test("an incomplete card shows plain 'Mark complete' text with no icon", () => {
  const { container } = render(
    <RequirementCard view={view()} onLevelChange={noop} {...baseProps} />,
  );
  const completeButton = screen.getByRole("button", {
    name: /mark complete/i,
  });
  expect(completeButton).toHaveTextContent("Mark complete");
  expect(container.querySelector(".pkimm-completed-toggle svg")).toBeNull();
});
