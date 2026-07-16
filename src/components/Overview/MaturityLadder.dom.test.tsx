import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { MaturityLadder } from "./MaturityLadder";
import { MATURITY_LEVELS } from "./overviewContent";

expect.extend(toHaveNoViolations);

test("renders all five maturity levels with names and descriptions", async () => {
  const { container } = render(<MaturityLadder />);
  for (const lvl of MATURITY_LEVELS) {
    expect(screen.getByText(lvl.name)).toBeInTheDocument();
    expect(screen.getByText(lvl.description)).toBeInTheDocument();
  }
  expect(
    screen.getByRole("list", { name: /five PKI maturity levels/i }),
  ).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});
