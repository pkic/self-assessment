import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates the visible label with the input", () => {
    render(
      <TextField label="Organization name" value="" onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
  });

  it("round-trips value and onChange", () => {
    const onChange = jest.fn();
    render(
      <TextField label="Organization name" value="Acme" onChange={onChange} />,
    );
    const input = screen.getByLabelText(
      "Organization name",
    ) as HTMLInputElement;
    expect(input.value).toBe("Acme");
    fireEvent.change(input, { target: { value: "Acme Corp" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <TextField label="Organization name" value="" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps the accessible name but hides the label text when hideLabel", () => {
    const { getByLabelText, container } = render(
      <TextField
        label="Artifact title"
        hideLabel
        value=""
        onChange={() => {}}
      />,
    );
    // still reachable by its accessible name
    expect(getByLabelText("Artifact title")).toBeInTheDocument();
    // the label span carries the visually-hidden class
    expect(container.querySelector(".pkimm-field__label")).toHaveClass(
      "pkimm-visually-hidden",
    );
  });

  it("has no axe violations with hideLabel", async () => {
    const { container } = render(
      <TextField
        label="Artifact title"
        hideLabel
        value=""
        onChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("applies fieldClassName to the field wrapper label", () => {
    const { container } = render(
      <TextField
        label="X"
        fieldClassName="pkimm-x-bound"
        value=""
        onChange={() => {}}
      />,
    );
    const label = container.querySelector("label.pkimm-field");
    expect(label).toHaveClass("pkimm-x-bound");
  });

  test("renders a hint referenced by the input's aria-describedby", () => {
    render(<TextField label="Contact" hint="Email, Slack, or phone." />);
    const input = screen.getByLabelText("Contact");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy as string);
    expect(hint).toHaveTextContent("Email, Slack, or phone.");
    expect(hint).toHaveClass("pkimm-field__hint");
  });

  test("adds no aria-describedby when hint is omitted", () => {
    render(<TextField label="Contact" />);
    expect(screen.getByLabelText("Contact")).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  test("composes a caller-supplied aria-describedby with the hint id", () => {
    render(<TextField label="Contact" hint="help" aria-describedby="ext-1" />);
    const describedBy = screen
      .getByLabelText("Contact")
      .getAttribute("aria-describedby");
    expect(describedBy).toContain("ext-1");
    const ids = (describedBy as string).split(" ");
    expect(ids).toHaveLength(2);
  });
});
