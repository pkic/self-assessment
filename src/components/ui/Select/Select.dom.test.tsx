import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Select } from "./Select";

describe("Select", () => {
  it("associates the visible label with the select", () => {
    render(
      <Select label="Report type" value="assessment" onChange={() => {}}>
        <option value="assessment">Assessment</option>
        <option value="detailed">Detailed</option>
      </Select>,
    );
    expect(screen.getByLabelText("Report type")).toBeInTheDocument();
  });

  it("renders children options", () => {
    render(
      <Select label="Report type" value="assessment" onChange={() => {}}>
        <option value="assessment">Assessment</option>
        <option value="detailed">Detailed</option>
      </Select>,
    );
    const select = screen.getByLabelText("Report type") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["assessment", "detailed"]);
  });

  it("fires onChange with the new value", () => {
    const onChange = jest.fn();
    render(
      <Select label="Report type" value="assessment" onChange={onChange}>
        <option value="assessment">Assessment</option>
        <option value="detailed">Detailed</option>
      </Select>,
    );
    const select = screen.getByLabelText("Report type") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "detailed" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Select label="Report type" value="assessment" onChange={() => {}}>
        <option value="assessment">Assessment</option>
        <option value="detailed">Detailed</option>
      </Select>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps the accessible name but hides the label text when hideLabel", () => {
    const { getByLabelText, container } = render(
      <Select label="Target level" hideLabel value={1} onChange={() => {}}>
        <option value={1}>1</option>
      </Select>,
    );
    expect(getByLabelText("Target level")).toBeInTheDocument();
    expect(container.querySelector(".pkimm-field__label")).toHaveClass(
      "pkimm-visually-hidden",
    );
  });

  it("has no axe violations with hideLabel", async () => {
    const { container } = render(
      <Select label="Target level" hideLabel value={1} onChange={() => {}}>
        <option value={1}>1</option>
      </Select>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("applies fieldClassName to the field wrapper label", () => {
    const { container } = render(
      <Select
        label="X"
        fieldClassName="pkimm-x-bound"
        value=""
        onChange={() => {}}
      >
        <option value="">x</option>
      </Select>,
    );
    const label = container.querySelector("label.pkimm-field");
    expect(label).toHaveClass("pkimm-x-bound");
  });
});
