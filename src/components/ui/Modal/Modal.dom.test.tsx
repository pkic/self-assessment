import React, { useRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders nothing when open=false", () => {
    render(
      <Modal open={false} title="Hidden" titleId="hidden-title">
        <button type="button">Inside</button>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders role=dialog aria-modal and wires aria-labelledby from title/titleId", () => {
    render(
      <Modal open title="My title" titleId="my-title">
        <button type="button">Inside</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "my-title");
    expect(screen.getByText("My title")).toHaveAttribute("id", "my-title");
  });

  it("renders no heading when title/titleId are omitted", () => {
    render(
      <Modal open>
        <button type="button">Inside</button>
      </Modal>,
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders no default chrome (no close button)", () => {
    render(
      <Modal open title="Chrome check" titleId="chrome-title">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("focuses the first focusable element on mount", () => {
    render(
      <Modal open title="Focus test" titleId="focus-title">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "First" }),
    );
  });

  it("focuses initialFocusRef when provided", () => {
    const Harness: React.FC = () => {
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <Modal
          open
          title="Initial focus"
          titleId="initial-focus-title"
          initialFocusRef={ref as React.RefObject<HTMLElement>}
        >
          <button type="button">First</button>
          <button type="button" ref={ref}>
            Preferred
          </button>
        </Modal>
      );
    };
    render(<Harness />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Preferred" }),
    );
  });

  it("restores focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open modal";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <Modal open title="Restore focus" titleId="restore-title">
        <button type="button">Inside</button>
      </Modal>,
    );
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it("calls onClose on Escape when dismissable (default)", () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Escape test" titleId="escape-title">
        <button type="button">Inside</button>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is a no-op and does not throw on Escape when dismissable=false with no onClose", () => {
    render(
      <Modal
        open
        dismissable={false}
        title="Non-dismissable"
        titleId="non-dismissable-title"
      >
        <button type="button">Inside</button>
      </Modal>,
    );
    expect(() => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    }).not.toThrow();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("traps Tab focus within the dialog", () => {
    render(
      <Modal open title="Tab trap" titleId="tab-trap-title">
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("calls onClose on overlay mousedown when dismissable (default)", () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal
        open
        onClose={onClose}
        title="Overlay test"
        titleId="overlay-title"
      >
        <button type="button">Inside</button>
      </Modal>,
    );
    const overlay = container.querySelector(".pkimm-modal-overlay");
    expect(overlay).not.toBeNull();
    fireEvent.mouseDown(overlay as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on overlay mousedown when dismissable=false", () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal
        open
        onClose={onClose}
        dismissable={false}
        title="Overlay non-dismissable"
        titleId="overlay-non-dismissable-title"
      >
        <button type="button">Inside</button>
      </Modal>,
    );
    const overlay = container.querySelector(".pkimm-modal-overlay");
    expect(overlay).not.toBeNull();
    fireEvent.mouseDown(overlay as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call onClose when mousedown originates inside the dialog", () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Inside click" titleId="inside-title">
        <button type="button">Inside</button>
      </Modal>,
    );
    fireEvent.mouseDown(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Modal open title="Accessible modal" titleId="a11y-title">
        <p>Some content</p>
        <button type="button">Close</button>
      </Modal>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("applies the right-drawer placement class when placement='right'", () => {
    render(
      <Modal open placement="right" titleId="t">
        <h2 id="t">X</h2>
      </Modal>,
    );
    expect(
      document.querySelector(".pkimm-modal-overlay--right"),
    ).not.toBeNull();
  });

  it("defaults to centered (no right class)", () => {
    render(
      <Modal open titleId="t">
        <h2 id="t">X</h2>
      </Modal>,
    );
    expect(document.querySelector(".pkimm-modal-overlay--right")).toBeNull();
  });

  it("right placement traps focus (Tab wraps) and dismisses on Escape", () => {
    const onClose = jest.fn();
    render(
      <Modal open placement="right" onClose={onClose} titleId="t">
        <h2 id="t">X</h2>
        <button>a</button>
        <button>b</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "t");
    const [a, b] = screen.getAllByRole("button");
    b.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(a); // wraps last → first
    a.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(b); // wraps first → last
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("applies a custom className to the dialog and keeps the base class", () => {
    render(
      <Modal open className="pkimm-share-modal" titleId="t">
        <h2 id="t">X</h2>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("pkimm-modal");
    expect(dialog).toHaveClass("pkimm-share-modal");
  });
});
