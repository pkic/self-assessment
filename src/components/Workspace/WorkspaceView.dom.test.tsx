import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { WorkspaceView } from "./WorkspaceView";
import {
  SUGGESTED_INTAKE_QUESTIONS,
  SUGGESTED_CHECKLIST_TASKS,
} from "../../utils/workspace";
import type { Workspace } from "../../types/types";

expect.extend(toHaveNoViolations);

const baseWorkspace: Workspace = {
  workingNotes: "Some notes",
  artifacts: [{ id: "art-1", title: "Firewall diagram", locator: "s3://x" }],
  pocs: [{ id: "poc-1", name: "Jane Doe", role: "CISO", contact: "jane@x" }],
  checklist: [
    { itemId: "chk-1", label: "Collect policy doc", done: false },
    { itemId: "chk-2", label: "Interview CISO", done: true },
  ],
  intake: [{ questionId: "q-1", question: "Scope?", answer: "All of PKI" }],
  orphanedEntries: [
    {
      originalKey: "G.strategy-and-vision.old-req",
      requirementName: "Old requirement",
      payload: { level: 3, applicability: true, notes: "n", evidence: "" },
    },
  ],
};

const requirementChoices = [
  { key: "G.strategy-and-vision.req-1", label: "Req 1", assessed: false },
  { key: "G.strategy-and-vision.req-2", label: "Req 2", assessed: true },
];

const renderStatic = (
  overrides: Partial<Workspace> = {},
  onChange = jest.fn(),
) =>
  render(
    <WorkspaceView
      workspace={{ ...baseWorkspace, ...overrides }}
      requirementChoices={requirementChoices}
      onWorkspaceChange={onChange}
      onRescueOrphan={jest.fn()}
      onDiscardOrphan={jest.fn()}
    />,
  );

const Harness: React.FC<{ initial?: Workspace }> = ({ initial }) => {
  const [ws, setWs] = useState<Workspace>(initial ?? baseWorkspace);
  return (
    <WorkspaceView
      workspace={ws}
      requirementChoices={requirementChoices}
      onWorkspaceChange={setWs}
      onRescueOrphan={jest.fn()}
      onDiscardOrphan={jest.fn()}
    />
  );
};

// A record's disclosure and its remove IconButton both include the summary in
// their accessible name, so disclosures are queried with the `expanded` filter
// (only disclosures carry aria-expanded).
test("records are collapsed by default (fields hidden, summaries shown)", () => {
  renderStatic();
  expect(
    screen.getByRole("button", { name: /Firewall diagram/, expanded: false }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Jane Doe/, expanded: false }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("expanding a record reveals its labeled fields", () => {
  renderStatic();
  fireEvent.click(
    screen.getByRole("button", { name: /Firewall diagram/, expanded: false }),
  );
  expect(screen.getByLabelText("Title")).toHaveValue("Firewall diagram");
  expect(screen.getByLabelText("Locator")).toHaveValue("s3://x");
});

test("an empty record shows an Untitled summary", () => {
  render(<Harness initial={{ ...baseWorkspace, pocs: [] }} />);
  fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
  expect(screen.getByText("Untitled contact")).toBeInTheDocument();
});

test("adding a record auto-expands it and focuses its first field", () => {
  render(<Harness initial={{ ...baseWorkspace, pocs: [] }} />);
  fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
  const name = screen.getByLabelText("Name");
  expect(name).toBeInTheDocument();
  expect(document.activeElement).toBe(name);
});

test("editing an expanded field fires onWorkspaceChange", () => {
  const onChange = jest.fn();
  renderStatic({}, onChange);
  fireEvent.click(
    screen.getByRole("button", { name: /Jane Doe/, expanded: false }),
  );
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "PKI lead" },
  });
  expect(onChange).toHaveBeenCalled();
  const calls = onChange.mock.calls;
  const next = calls[calls.length - 1][0] as Workspace;
  expect(next.pocs?.[0].role).toBe("PKI lead");
});

test("removing a record fires onWorkspaceChange without it", () => {
  const onChange = jest.fn();
  renderStatic({}, onChange);
  fireEvent.click(
    screen.getByRole("button", { name: /Remove .*Firewall diagram/i }),
  );
  const next = onChange.mock.calls[0][0] as Workspace;
  expect(next.artifacts).toHaveLength(0);
});

test("Load suggested questions appends the curated set", () => {
  render(<Harness initial={{ ...baseWorkspace, intake: [] }} />);
  fireEvent.click(
    screen.getByRole("button", { name: /load suggested questions/i }),
  );
  // Each seeded question renders collapsed; its text is in the summary span.
  SUGGESTED_INTAKE_QUESTIONS.forEach((q) => {
    expect(screen.getByText(q)).toBeInTheDocument();
  });
});

test("Load suggested tasks appends the curated checklist set", () => {
  render(<Harness initial={{ ...baseWorkspace, checklist: [] }} />);
  fireEvent.click(
    screen.getByRole("button", { name: /load suggested tasks/i }),
  );
  // Checklist labels render as editable inputs (value), not text nodes.
  expect(
    screen.getByDisplayValue(SUGGESTED_CHECKLIST_TASKS[0]),
  ).toBeInTheDocument();
});

test("Load suggested tasks a second time adds nothing (dedupe)", () => {
  render(<Harness initial={{ ...baseWorkspace, checklist: [] }} />);
  const loadBtn = () =>
    screen.getByRole("button", { name: /load suggested tasks/i });
  fireEvent.click(loadBtn());
  const afterFirst = screen.getAllByRole("checkbox").length;
  expect(afterFirst).toBe(SUGGESTED_CHECKLIST_TASKS.length);
  fireEvent.click(loadBtn());
  expect(screen.getAllByRole("checkbox").length).toBe(afterFirst);
});

test("checklist shows the done count and marks done items", () => {
  const { container } = renderStatic();
  expect(screen.getByText(/1 of 2 done/i)).toBeInTheDocument();
  expect(
    container.querySelector(".pkimm-workspace__task-label--done"),
  ).toBeInTheDocument();
});

test("toggling a checklist item flips done", () => {
  const onChange = jest.fn();
  renderStatic({}, onChange);
  fireEvent.click(screen.getByRole("checkbox", { name: "Collect policy doc" }));
  const next = onChange.mock.calls[0][0] as Workspace;
  expect(next.checklist?.find((c) => c.itemId === "chk-1")?.done).toBe(true);
});

test("renders the purpose intro and per-section counts", () => {
  renderStatic();
  expect(
    screen.getByText(/never affects the maturity score/i),
  ).toBeInTheDocument();
  expect(screen.getByText("1 question")).toBeInTheDocument();
  expect(screen.getByText("1 artifact")).toBeInTheDocument();
  expect(screen.getByText("1 contact")).toBeInTheDocument();
});

test("orphaned entries can be rescued", () => {
  const onRescue = jest.fn();
  render(
    <WorkspaceView
      workspace={baseWorkspace}
      requirementChoices={requirementChoices}
      onWorkspaceChange={jest.fn()}
      onRescueOrphan={onRescue}
      onDiscardOrphan={jest.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Rescue" }));
  expect(onRescue).toHaveBeenCalledWith(
    "G.strategy-and-vision.old-req",
    "G.strategy-and-vision.req-1",
  );
});

test("rescuing onto an already-assessed requirement confirms first", () => {
  const onRescue = jest.fn();
  const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <WorkspaceView
      workspace={baseWorkspace}
      requirementChoices={requirementChoices}
      onWorkspaceChange={jest.fn()}
      onRescueOrphan={onRescue}
      onDiscardOrphan={jest.fn()}
    />,
  );
  // Pick the already-assessed target, then rescue: a declined confirm blocks it.
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "G.strategy-and-vision.req-2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Rescue" }));
  expect(confirmSpy).toHaveBeenCalled();
  expect(onRescue).not.toHaveBeenCalled();
  confirmSpy.mockRestore();
});

test("orphaned entries can be discarded", () => {
  const onDiscard = jest.fn();
  render(
    <WorkspaceView
      workspace={baseWorkspace}
      requirementChoices={requirementChoices}
      onWorkspaceChange={jest.fn()}
      onRescueOrphan={jest.fn()}
      onDiscardOrphan={onDiscard}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  expect(onDiscard).toHaveBeenCalledWith("G.strategy-and-vision.old-req");
});

test("renders without crashing when workspace is undefined", () => {
  render(
    <WorkspaceView
      workspace={undefined}
      requirementChoices={requirementChoices}
      onWorkspaceChange={jest.fn()}
      onRescueOrphan={jest.fn()}
      onDiscardOrphan={jest.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: /add question/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("0 questions")).toBeInTheDocument();
});

test("no axe violations (records collapsed, one expanded, checklist)", async () => {
  const { container } = renderStatic();
  expect(await axe(container)).toHaveNoViolations();
  fireEvent.click(
    screen.getByRole("button", { name: /Jane Doe/, expanded: false }),
  );
  expect(await axe(container)).toHaveNoViolations();
});
