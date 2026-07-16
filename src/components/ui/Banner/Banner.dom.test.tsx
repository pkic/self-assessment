import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Banner } from "./Banner";

describe("Banner", () => {
  it("renders title and children with role=status for info tone", () => {
    render(
      <Banner tone="info" title="Heads up">
        Some detail
      </Banner>,
    );
    const el = screen.getByRole("status");
    expect(el.className).toContain("pkimm-banner--info");
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Some detail")).toBeInTheDocument();
  });

  it("uses role=status for success tone", () => {
    render(<Banner tone="success">All good</Banner>);
    const el = screen.getByRole("status");
    expect(el.className).toContain("pkimm-banner--success");
  });

  it("uses role=alert and the danger class for danger tone", () => {
    render(<Banner tone="danger">Something failed</Banner>);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("pkimm-banner--danger");
  });

  it("merges an additional className onto the root element", () => {
    render(
      <Banner tone="info" className="pkimm-legacy-prompt__banner">
        Spaced out
      </Banner>,
    );
    const el = screen.getByRole("status");
    expect(el.className).toContain("pkimm-banner");
    expect(el.className).toContain("pkimm-banner--info");
    expect(el.className).toContain("pkimm-legacy-prompt__banner");
  });

  it("renders no dismiss control when onDismiss is not provided", () => {
    render(<Banner tone="info">No dismiss</Banner>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a dismiss IconButton and fires onDismiss when clicked", () => {
    const onDismiss = jest.fn();
    render(
      <Banner tone="info" onDismiss={onDismiss}>
        Dismissible
      </Banner>,
    );
    const btn = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations for each tone", async () => {
    const { container: infoContainer } = render(
      <Banner tone="info" title="Info">
        Body
      </Banner>,
    );
    expect(await axe(infoContainer)).toHaveNoViolations();

    const { container: dangerContainer } = render(
      <Banner tone="danger" title="Danger" onDismiss={() => {}}>
        Body
      </Banner>,
    );
    expect(await axe(dangerContainer)).toHaveNoViolations();
  });
});
