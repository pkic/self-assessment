import React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children in a pkimm-card div with the default md padding modifier", () => {
    render(<Card>Content</Card>);
    const el = screen.getByText("Content");
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("pkimm-card");
    expect(el.className).toContain("pkimm-card--pad-md");
    expect(el.className).not.toContain("pkimm-card--elevated");
  });

  it("applies the requested padding modifier class", () => {
    const { rerender, container } = render(<Card padding="sm">A</Card>);
    expect(container.firstElementChild?.className).toContain(
      "pkimm-card--pad-sm",
    );
    rerender(<Card padding="lg">A</Card>);
    expect(container.firstElementChild?.className).toContain(
      "pkimm-card--pad-lg",
    );
  });

  it("adds the elevated shadow class only when elevated is set", () => {
    const { container } = render(<Card elevated>Content</Card>);
    expect(container.firstElementChild?.className).toContain(
      "pkimm-card--elevated",
    );
  });

  it("forwards native div attributes and merges className", () => {
    render(
      <Card className="custom" data-testid="card" aria-label="Panel">
        Content
      </Card>,
    );
    const el = screen.getByTestId("card");
    expect(el.className).toContain("custom");
    expect(el).toHaveAttribute("aria-label", "Panel");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Card>Some content</Card>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders as a named section landmark", () => {
    const { getByRole } = render(
      <Card as="section" aria-labelledby="sec-h">
        <h2 id="sec-h">Maturity summary</h2>
      </Card>,
    );
    expect(
      getByRole("region", { name: "Maturity summary" }),
    ).toBeInTheDocument();
  });

  it("emits no padding class when padding is none", () => {
    const { container } = render(<Card padding="none">x</Card>);
    const el = container.querySelector(".pkimm-card")!;
    expect(el.className).not.toMatch(/pkimm-card--pad-/);
  });

  it("emits the padding class for a normal padding", () => {
    const { container } = render(<Card padding="sm">x</Card>);
    expect(container.querySelector(".pkimm-card")).toHaveClass(
      "pkimm-card--pad-sm",
    );
  });
});
