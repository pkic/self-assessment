import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { ImportCollisionModal } from "./ImportCollisionModal";
import type { Assessment } from "../../types/types";

const makeAssessment = (
  id: string,
  name: string,
  updatedAt: string,
): Assessment => ({
  id,
  name,
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: name,
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: { createdAt: updatedAt, updatedAt },
});

describe("ImportCollisionModal", () => {
  it("renders as a focus-trapped dialog and shows the file is NEWER by N days", () => {
    const existing = makeAssessment(
      "id-1",
      "Local copy",
      "2026-07-01T00:00:00.000Z",
    );
    const incoming = makeAssessment(
      "id-1",
      "Local copy",
      "2026-07-06T00:00:00.000Z", // 5 days after existing
    );
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByText(/newer than your local copy by 5 days/i),
    ).toBeInTheDocument();
  });

  it("has an accessible name on the dialog node and no axe violations", async () => {
    const existing = makeAssessment(
      "id-1",
      "Local copy",
      "2026-07-01T00:00:00.000Z",
    );
    const incoming = makeAssessment(
      "id-1",
      "Local copy",
      "2026-07-06T00:00:00.000Z",
    );
    const { container } = render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: /assessment already exists/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the file is OLDER by N days when incoming predates the local copy", () => {
    const existing = makeAssessment(
      "id-1",
      "Local copy",
      "2026-07-06T00:00:00.000Z",
    );
    const incoming = makeAssessment(
      "id-1",
      "Local copy",
      "2026-07-01T00:00:00.000Z", // 5 days before existing
    );
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/older than your local copy by 5 days/i),
    ).toBeInTheDocument();
  });

  it("fires onReplace when Replace is clicked", () => {
    const onReplace = jest.fn();
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={onReplace}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /replace/i }));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it("fires onKeepBoth when Keep both is clicked", () => {
    const onKeepBoth = jest.fn();
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={onKeepBoth}
        onCancel={jest.fn()}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /keep both/i }));
    expect(onKeepBoth).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel when Cancel is clicked", () => {
    const onCancel = jest.fn();
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={onCancel}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel on Escape and restores focus to the previously focused element", () => {
    const onCancel = jest.fn();
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");

    const trigger = document.createElement("button");
    trigger.textContent = "Import file";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={onCancel}
        canMerge
        onMerge={jest.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it("traps Tab focus within the dialog", () => {
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        canMerge
        onMerge={jest.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("fires onMerge with the chosen strategy when canMerge", () => {
    const onMerge = jest.fn();
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        canMerge
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        onMerge={onMerge}
      />,
    );
    fireEvent.change(screen.getByLabelText("Merge strategy"), {
      target: { value: "prefer-newest" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^merge$/i }));
    expect(onMerge).toHaveBeenCalledWith("prefer-newest");
  });

  it("hides the Merge control and shows a note when versions differ", () => {
    const existing = makeAssessment("id-1", "A", "2026-07-01T00:00:00.000Z");
    const incoming = makeAssessment("id-1", "A", "2026-07-02T00:00:00.000Z");
    render(
      <ImportCollisionModal
        existing={existing}
        incoming={incoming}
        canMerge={false}
        onReplace={jest.fn()}
        onKeepBoth={jest.fn()}
        onCancel={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /^merge$/i })).toBeNull();
    expect(screen.getByText(/different model version/i)).toBeInTheDocument();
  });
});
