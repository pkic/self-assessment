import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { StatusPill } from "./StatusPill";

expect.extend(toHaveNoViolations);

test("renders a type=button whose accessible name is its visible text", () => {
  render(<StatusPill tone="success">In scope</StatusPill>);
  const btn = screen.getByRole("button", { name: "In scope" });
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveAttribute("type", "button");
});

test("applies the tone class", () => {
  render(<StatusPill tone="warning">Partial</StatusPill>);
  expect(screen.getByRole("button")).toHaveClass(
    "pkimm-status-pill",
    "pkimm-status-pill--warning",
  );
});

test("fires onClick", () => {
  const onClick = jest.fn();
  render(
    <StatusPill tone="neutral" onClick={onClick}>
      Excluded
    </StatusPill>,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("forwards disabled and does not fire onClick when disabled", () => {
  const onClick = jest.fn();
  render(
    <StatusPill tone="success" disabled onClick={onClick}>
      In scope
    </StatusPill>,
  );
  const btn = screen.getByRole("button") as HTMLButtonElement;
  expect(btn.disabled).toBe(true);
  fireEvent.click(btn);
  expect(onClick).not.toHaveBeenCalled();
});

test("the accessible name contains the visible label plus visually-hidden context", () => {
  render(
    <StatusPill tone="warning">
      Partial · 3 of 4
      <span className="pkimm-visually-hidden"> — Compliance</span>
    </StatusPill>,
  );
  // Visible label text is present in the accessible name (Label in Name).
  expect(
    screen.getByRole("button", { name: /Partial · 3 of 4 — Compliance/ }),
  ).toBeInTheDocument();
});

test("no axe violations", async () => {
  const { container } = render(
    <StatusPill tone="success">In scope</StatusPill>,
  );
  expect(await axe(container)).toHaveNoViolations();
});
