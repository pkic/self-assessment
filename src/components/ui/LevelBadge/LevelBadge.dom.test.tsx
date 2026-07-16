import React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { LevelBadge } from "./LevelBadge";
import LevelResult from "../../../enums/LevelResult";

describe("LevelBadge", () => {
  it("renders the Not Applicable label and class for level -1", () => {
    render(<LevelBadge level={-1} />);
    const el = screen.getByText("Not Applicable");
    expect(el.className).toContain("pkimm-level-badge");
    expect(el.className).toContain("pkimm-level-badge---1");
  });

  it("renders the Not Assessed label and class for level 0", () => {
    render(<LevelBadge level={0} />);
    const el = screen.getByText("Not Assessed");
    expect(el.className).toContain("pkimm-level-badge--0");
  });

  it.each([1, 2, 3, 4, 5])(
    "renders the LevelResult label and per-level class for level %i",
    (level) => {
      render(<LevelBadge level={level} />);
      const el = screen.getByText(LevelResult[level]);
      expect(el.className).toContain(`pkimm-level-badge--${level}`);
    },
  );

  it("defaults to the soft variant and applies the requested variant class", () => {
    const { rerender, container } = render(<LevelBadge level={3} />);
    expect(container.firstElementChild?.className).toContain(
      "pkimm-level-badge--soft",
    );
    rerender(<LevelBadge level={3} variant="solid" />);
    expect(container.firstElementChild?.className).toContain(
      "pkimm-level-badge--solid",
    );
    rerender(<LevelBadge level={3} variant="text" />);
    expect(container.firstElementChild?.className).toContain(
      "pkimm-level-badge--text",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<LevelBadge level={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
