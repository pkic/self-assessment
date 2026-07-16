import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { ReportGeneratingModal } from "./ReportGeneratingModal";

describe("ReportGeneratingModal", () => {
  it("renders a focus-trapped dialog with the generating status when open", async () => {
    const { container } = render(<ReportGeneratingModal open={true} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/generating report…/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing when not open", () => {
    const { container } = render(<ReportGeneratingModal open={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not unmount or dismiss on Escape (non-dismissable)", () => {
    render(<ReportGeneratingModal open={true} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/generating report…/i)).toBeInTheDocument();
  });
});
