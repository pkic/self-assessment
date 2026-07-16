import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { RequirementCard } from "./RequirementCard";
import { HelpProvider } from "../Help/HelpProvider";
import type { RequirementView } from "../../utils/requirementFilter";

expect.extend(toHaveNoViolations);

const view: RequirementView = {
  moduleId: "G",
  categoryId: "c1",
  requirementId: "r1",
  key: "G.c1.r1",
  description: "The organization maintains a documented PKI strategy",
  guidance: "",
  assessment: "",
  weight: 1,
  level: 0,
  applicability: true,
  completed: false,
  flagged: false,
};

const noop = () => {};

const renderCard = () =>
  render(
    <HelpProvider
      helpContext={{
        tab: "G",
        view: "full",
        target: "original",
        moduleIds: ["G"],
      }}
    >
      <RequirementCard
        view={view}
        progress={undefined}
        referenceIds={[]}
        onLevelChange={noop}
        onToggleApplicability={noop}
        onFieldChange={noop as never}
      />
    </HelpProvider>,
  );

test("a visible help trigger sits beside the level radiogroup, outside it, and opens the help panel", async () => {
  const { container } = renderCard();

  const radiogroup = screen.getByRole("radiogroup");
  const children = Array.from(radiogroup.children);
  expect(children.length).toBeGreaterThan(0);
  children.forEach((child) => {
    expect(child).toHaveAttribute("role", "radio");
  });

  const helpButton = screen.getByRole("button", { name: /help.*level/i });
  expect(helpButton).toBeInTheDocument();
  expect(radiogroup).not.toContainElement(helpButton);

  fireEvent.click(helpButton);
  expect(screen.getByRole("dialog")).toBeInTheDocument();

  expect(await axe(container)).toHaveNoViolations();
});

test("a requirement-level applicability help trigger sits outside the in-scope toggle", () => {
  renderCard();

  const applicabilityHelp = screen.getByRole("button", {
    name: /help.*applicab/i,
  });
  const toggle = screen.getByRole("button", { name: /in scope/i });
  expect(applicabilityHelp).not.toBe(toggle);

  fireEvent.click(applicabilityHelp);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
