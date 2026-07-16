import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { TextArea } from "./TextArea";

describe("TextArea", () => {
  it("associates the visible label with the textarea", () => {
    render(<TextArea label="Working notes" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Working notes")).toBeInTheDocument();
  });

  it("round-trips value and onChange", () => {
    const onChange = jest.fn();
    render(
      <TextArea label="Working notes" value="hello" onChange={onChange} />,
    );
    const textarea = screen.getByLabelText(
      "Working notes",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("hello");
    fireEvent.change(textarea, { target: { value: "hello world" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not adjust height on mount when autoGrow is set", () => {
    render(
      <TextArea label="Working notes" autoGrow value="" onChange={() => {}} />,
    );
    const textarea = screen.getByLabelText(
      "Working notes",
    ) as HTMLTextAreaElement;
    expect(textarea.style.height).toBe("");
  });

  it("adjusts style.height from scrollHeight on input when autoGrow is set", () => {
    render(
      <TextArea label="Working notes" autoGrow value="" onChange={() => {}} />,
    );
    const textarea = screen.getByLabelText(
      "Working notes",
    ) as HTMLTextAreaElement;
    expect(textarea.style.height).toBe("");
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 123,
    });
    fireEvent.input(textarea, { target: { value: "hello world" } });
    expect(textarea.style.height).toBe("123px");
  });

  it("does not adjust height on input when autoGrow is not set", () => {
    render(<TextArea label="Working notes" value="" onChange={() => {}} />);
    const textarea = screen.getByLabelText(
      "Working notes",
    ) as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 123,
    });
    fireEvent.input(textarea, { target: { value: "hello world" } });
    expect(textarea.style.height).toBe("");
  });

  it("calls the caller's onInput handler after adjusting height", () => {
    const onInput = jest.fn();
    render(
      <TextArea
        label="Working notes"
        autoGrow
        value=""
        onChange={() => {}}
        onInput={onInput}
      />,
    );
    const textarea = screen.getByLabelText(
      "Working notes",
    ) as HTMLTextAreaElement;
    fireEvent.input(textarea);
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <TextArea label="Working notes" value="" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  test("renders a hint referenced by the textarea's aria-describedby", () => {
    render(<TextArea label="Answer" hint="Your finding or note." />);
    const ta = screen.getByLabelText("Answer");
    const describedBy = ta.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      "Your finding or note.",
    );
  });

  test("adds no aria-describedby when hint is omitted", () => {
    render(<TextArea label="Answer" />);
    expect(screen.getByLabelText("Answer")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
