import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RequirementFinder } from "./RequirementFinder";
import type { ModuleData } from "../../types/types";

const moduleData: ModuleData = {
  id: "G",
  name: "Governance",
  description: "",
  categories: [
    {
      id: "c1",
      weight: 1,
      name: "Strategy",
      description: "",
      levels: [],
      requirements: [
        {
          id: "r1",
          weight: 1,
          description: "Key ceremony",
          guidance: "",
          assessment: "",
          references: [],
        },
        {
          id: "r2",
          weight: 1,
          description: "HSM policy",
          guidance: "",
          assessment: "",
          references: [],
        },
      ],
    },
  ],
};
const empty = { text: "", statuses: new Set<never>() };

test("typing filters the jump list", () => {
  const onFilterChange = jest.fn();
  render(
    <RequirementFinder
      module={moduleData}
      requirementProgress={undefined}
      filter={empty}
      onFilterChange={onFilterChange}
      onJump={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "ceremony" },
  });
  expect(onFilterChange).toHaveBeenCalled();
});

test("clicking a jump-list row fires onJump with the requirement key", () => {
  const onJump = jest.fn();
  render(
    <RequirementFinder
      module={moduleData}
      requirementProgress={undefined}
      filter={{ text: "hsm", statuses: new Set() }}
      onFilterChange={jest.fn()}
      onJump={onJump}
    />,
  );
  const list = screen.getByRole("list", { name: /matching requirements/i });
  fireEvent.click(within(list).getByText(/HSM policy/));
  expect(onJump).toHaveBeenCalledWith("G.c1.r2");
});

test("status chips are toggle buttons with text labels and aria-pressed", () => {
  render(
    <RequirementFinder
      module={moduleData}
      requirementProgress={undefined}
      filter={empty}
      onFilterChange={jest.fn()}
      onJump={jest.fn()}
    />,
  );
  const chip = screen.getByRole("button", { name: /not assessed/i });
  expect(chip).toHaveAttribute("aria-pressed", "false");
});
