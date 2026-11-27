import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MultiSelectField } from "./MultiSelectField";
import type { EvidenceQuestionField } from "./types";

const field: EvidenceQuestionField = {
  key: "algorithms",
  label: "Algorithms",
  type: "multiselect",
  required: true,
  allowCustom: true,
  options: [
    { value: "ML-KEM-768", label: "ML-KEM-768" },
    { value: "ML-DSA-65", label: "ML-DSA-65" },
  ],
};

const Harness: React.FC<{ initial?: string[] }> = ({ initial = [] }) => {
  const [value, setValue] = useState(initial);
  return <MultiSelectField field={field} value={value} onChange={setValue} />;
};

describe("MultiSelectField", () => {
  it("adds and removes entries that are not listed", async () => {
    const { container } = render(<Harness initial={["ML-KEM-768"]} />);
    expect(screen.getByLabelText("ML-KEM-768")).toBeChecked();

    const input = screen.getByLabelText("Not listed? Add it");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "  FN-DSA-512 " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("FN-DSA-512")).toBeInTheDocument();
    expect(input).toHaveValue("");

    // A listed option typed by hand is not added twice.
    fireEvent.change(input, { target: { value: "ML-KEM-768" } });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Remove FN-DSA-512" }));
    expect(screen.queryByText("FN-DSA-512")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers no free entry when the field doesn't allow it", () => {
    render(
      <MultiSelectField
        field={{ ...field, allowCustom: false }}
        value={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByLabelText("Not listed? Add it")).toBeNull();
  });
});
