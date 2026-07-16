import React, { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders an accessible checkbox named by label", () => {
    render(
      <Checkbox checked={false} label="Include category" onChange={() => {}} />,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Include category" });
    expect(checkbox).toBeInTheDocument();
  });

  it("sets the DOM node's indeterminate property when indeterminate is true", () => {
    render(
      <Checkbox
        checked
        indeterminate
        label="Include category"
        onChange={() => {}}
      />,
    );
    const checkbox = screen.getByLabelText(
      "Include category",
    ) as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it("clears the DOM node's indeterminate property when indeterminate is false or unset", () => {
    render(<Checkbox checked label="Include category" onChange={() => {}} />);
    const checkbox = screen.getByLabelText(
      "Include category",
    ) as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(false);
  });

  it("forwards a ref that resolves to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Checkbox
        ref={ref}
        checked
        label="Include category"
        onChange={() => {}}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByLabelText("Include category"));
  });

  it("fires onChange when clicked", () => {
    const onChange = jest.fn();
    render(
      <Checkbox checked={false} label="Include category" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Include category" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Checkbox checked label="Include category" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("names the control from labelledBy and emits no aria-label", () => {
    const { getByRole } = render(
      <>
        <span id="cb-name">Governance</span>
        <Checkbox labelledBy="cb-name" checked={false} onChange={() => {}} />
      </>,
    );
    const box = getByRole("checkbox", { name: "Governance" });
    expect(box).toBeInTheDocument();
    expect(box).not.toHaveAttribute("aria-label");
    expect(box).toHaveAttribute("aria-labelledby", "cb-name");
  });

  it("has no axe violations when named via labelledBy", async () => {
    const { container } = render(
      <>
        <span id="cb-name2">Governance</span>
        <Checkbox labelledBy="cb-name2" checked onChange={() => {}} />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
