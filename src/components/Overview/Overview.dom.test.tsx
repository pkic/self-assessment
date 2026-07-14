import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Overview } from "./Overview";

expect.extend(toHaveNoViolations);

test("self view: quick-start guidance, ladder, resources, title; no in-Overview Continue button", async () => {
  const { container } = render(<Overview view="self" />);
  expect(screen.getByText(/no evidence required/i)).toBeInTheDocument();
  expect(screen.getByText("Initial")).toBeInTheDocument();
  expect(screen.getByText("PKI maturity model")).toBeInTheDocument();
  // Title drops "self-assessment"; the Self/Full pill conveys the type.
  expect(
    screen.getByRole("heading", { name: "PKI Maturity Model" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Self assessment")).toBeInTheDocument();
  // The Continue CTA now lives in Assessment.tsx, not inside Overview.
  expect(
    screen.queryByRole("button", { name: /Continue/i }),
  ).not.toBeInTheDocument();
  // Points to the always-available Help button, regardless of view.
  expect(screen.getByText(/Open the \? button/i)).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("full view: full step flow + Full pill; same title", async () => {
  const { container } = render(<Overview view="full" />);
  expect(
    screen.getByText(/points of contact for interviews/i),
  ).toBeInTheDocument();
  expect(screen.getByText("Scope")).toBeInTheDocument();
  expect(screen.getByText("Action plans")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "PKI Maturity Model" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Full assessment")).toBeInTheDocument();
  expect(screen.getByText(/Open the \? button/i)).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});
