import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { TabNav } from "./TabNav";

const baseProps = {
  modules: [
    { id: "G", name: "Governance" },
    { id: "M", name: "Management" },
  ],
  currentTab: "overview",
  fullMode: false,
  onSelect: () => {},
};

describe("TabNav", () => {
  it("renders the scroll strip, not the burger", () => {
    const { container } = render(<TabNav {...baseProps} />);
    expect(container.querySelector(".pkimm-burger-menu")).toBeNull();
    expect(container.querySelector(".pkimm-tabs-scroller")).not.toBeNull();
    expect(container.querySelector("nav.pkimm-tabs")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Governance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Assessments" }),
    ).toBeInTheDocument();
  });

  it("fires onSelect with the tab id", () => {
    const onSelect = jest.fn();
    render(<TabNav {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Governance" }));
    expect(onSelect).toHaveBeenCalledWith("G");
  });

  it("gates full-mode tabs; the extensions tab is always present", () => {
    const { rerender } = render(<TabNav {...baseProps} />);
    expect(screen.queryByRole("button", { name: "Scope" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Extensions" }),
    ).toBeInTheDocument();
    rerender(<TabNav {...baseProps} fullMode />);
    expect(screen.getByRole("button", { name: "Scope" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Action plans" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Evaluation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Extensions" }),
    ).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<TabNav {...baseProps} fullMode />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders full-mode content tabs in workflow order", () => {
    render(<TabNav {...baseProps} fullMode />);
    const names = screen.getAllByRole("button").map((b) => b.textContent);
    const idx = (n: string) => names.indexOf(n);
    // Scope + Workspace come right after Overview, before the modules
    expect(idx("Overview")).toBeLessThan(idx("Scope"));
    expect(idx("Scope")).toBeLessThan(idx("Workspace"));
    expect(idx("Workspace")).toBeLessThan(idx("Governance"));
    // Action plans + Evaluation come after the modules, before Report
    expect(idx("Management")).toBeLessThan(idx("Action plans"));
    expect(idx("Action plans")).toBeLessThan(idx("Evaluation"));
    expect(idx("Evaluation")).toBeLessThan(idx("Report"));
  });
});
