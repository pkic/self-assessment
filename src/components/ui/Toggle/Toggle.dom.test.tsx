import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("renders a checkbox with the accessible name set to label", () => {
    render(<Toggle checked={false} label="X applicable" onChange={() => {}} />);
    const checkbox = screen.getByRole("checkbox", { name: "X applicable" });
    expect(checkbox).toBeInTheDocument();
  });

  it("uses secondary accent only when asked", () => {
    const { rerender, container } = render(
      <Toggle checked label="X applicable" onChange={() => {}} />,
    );
    expect(
      container.querySelector(".pkimm-toggle-switch--secondary"),
    ).toBeNull();
    rerender(
      <Toggle
        checked
        accent="secondary"
        label="X applicable"
        onChange={() => {}}
      />,
    );
    expect(
      container.querySelector(".pkimm-toggle-switch--secondary"),
    ).not.toBeNull();
  });

  it("fires onChange when clicked", () => {
    const onChange = jest.fn();
    render(<Toggle checked={false} label="X applicable" onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "X applicable" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Toggle checked label="X applicable" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
