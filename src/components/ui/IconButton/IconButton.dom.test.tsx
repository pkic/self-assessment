import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("defaults to type=button and ghost variant, uses label as aria-label", () => {
    render(<IconButton label="Close">×</IconButton>);
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).toHaveAttribute("aria-label", "Close");
    expect(btn.className).toContain("pkimm-icon-btn--ghost");
  });

  it("applies the requested variant + size and fires onClick", () => {
    const onClick = jest.fn();
    render(
      <IconButton label="Delete" variant="danger" size="sm" onClick={onClick}>
        🗑
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("pkimm-icon-btn--danger");
    expect(btn.className).toContain("pkimm-icon-btn--sm");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards type when explicitly set (e.g. submit)", () => {
    render(
      <IconButton label="Submit form" type="submit">
        ➜
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Submit form" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <IconButton label="Edit" variant="primary">
        ✎
      </IconButton>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
