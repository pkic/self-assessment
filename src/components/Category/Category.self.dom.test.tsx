import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Category } from "./Category";
import type {
  CategoryData,
  ExtensionCategoryData,
  ProgressData,
  RequirementProgress,
} from "../../types/types";

const category: CategoryData = {
  id: "c1",
  weight: 1,
  name: "Strategy",
  description: "",
  levels: [
    { number: 1, name: "Initial", description: "" },
    { number: 2, name: "Foundational", description: "" },
    { number: 3, name: "Defined", description: "" },
    { number: 4, name: "Managed", description: "" },
    { number: 5, name: "Optimized", description: "" },
  ],
  requirements: [
    {
      id: "r1",
      weight: 2,
      description: "R1",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "r2",
      weight: 1,
      description: "R2",
      guidance: "",
      assessment: "",
      references: [],
    },
  ],
};
const noop = () => {};

test("self view shows a Calculated badge when requirement data is present", () => {
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
    "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
  };
  // effective = (4*2 + 2*1)/3 = 3.33 -> display 3 ("3 - Advanced")
  render(
    <Category
      moduleId="G"
      category={category}
      progress={{}}
      requirementProgress={requirementProgress}
      onLevelChange={noop}
      onApplicabilityChange={noop}
    />,
  );
  expect(screen.getByText(/Calculated: 3 - Advanced/)).toBeInTheDocument();
});

test("self view adds a self-declared chip when the self value differs from the calculated one", () => {
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
    "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
  };
  const progress: Record<string, ProgressData> = {
    "G.c1": { level: 5, applicability: true, result: "", description: "" },
  };
  render(
    <Category
      moduleId="G"
      category={category}
      progress={progress}
      requirementProgress={requirementProgress}
      onLevelChange={noop}
      onApplicabilityChange={noop}
    />,
  );
  expect(screen.getByText(/Calculated: 3 - Advanced/)).toBeInTheDocument();
  expect(screen.getByText(/Self-declared: 5 - Optimized/)).toBeInTheDocument();
});

test("self view omits the self-declared chip when the self value matches the calculated one", () => {
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
    "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
  };
  const progress: Record<string, ProgressData> = {
    "G.c1": { level: 3, applicability: true, result: "", description: "" },
  };
  render(
    <Category
      moduleId="G"
      category={category}
      progress={progress}
      requirementProgress={requirementProgress}
      onLevelChange={noop}
      onApplicabilityChange={noop}
    />,
  );
  expect(screen.getByText(/Calculated: 3 - Advanced/)).toBeInTheDocument();
  expect(screen.queryByText(/Self-declared:/)).toBeNull();
});

test("self view shows no Calculated badge when there is no requirement data", () => {
  const progress: Record<string, ProgressData> = {
    "G.c1": {
      level: 2,
      applicability: true,
      result: "",
      description: "",
    },
  };
  render(
    <Category
      moduleId="G"
      category={category}
      progress={progress}
      onLevelChange={noop}
      onApplicabilityChange={noop}
    />,
  );
  expect(screen.queryByText(/Calculated:/)).toBeNull();
});

// Category-level "not applicable" reason capture (self view).
describe("category not-applicable reason (self view)", () => {
  test("shows no reason field while the category is in scope", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 2, applicability: true, result: "", description: "" },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={noop}
      />,
    );
    expect(
      screen.queryByText(/Reason this category is not applicable/i),
    ).toBeNull();
    expect(
      screen.queryByRole("textbox", {
        name: /reason this category is not applicable/i,
      }),
    ).toBeNull();
  });

  test("shows a reason textarea once the category is toggled Not Applicable", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": {
        level: 0,
        applicability: false,
        result: "Not Applicable",
        description: "",
      },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={noop}
      />,
    );
    expect(
      screen.getByText(/Reason this category is not applicable/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("typing in the reason textarea fires onCategoryReason with moduleId/categoryId/value", () => {
    const onCategoryReason = jest.fn();
    const progress: Record<string, ProgressData> = {
      "G.c1": {
        level: 0,
        applicability: false,
        result: "Not Applicable",
        description: "",
      },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={onCategoryReason}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Outsourced to a third party" },
    });
    expect(onCategoryReason).toHaveBeenCalledWith(
      "G",
      "c1",
      "Outsourced to a third party",
      undefined,
    );
  });

  test("prefills the textarea with the stored applicabilityReason", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": {
        level: 0,
        applicability: false,
        result: "Not Applicable",
        description: "",
        applicabilityReason: "Existing reason",
      },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={noop}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Existing reason");
  });

  test("passes the extensionId through for an extension-relevance category", () => {
    const onCategoryReason = jest.fn();
    const extCategory: ExtensionCategoryData = {
      id: "c1",
      weight: 1,
      guidance: "",
      assessment: "",
      references: [],
      levels: [{ number: 1, name: "Initial", description: "" }],
    };
    const progress: Record<string, ProgressData> = {
      "ext1.G.c1": {
        level: 0,
        applicability: false,
        result: "Not Applicable",
        description: "",
      },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        extCategory={extCategory}
        extensionId="ext1"
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={onCategoryReason}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Not relevant to this extension" },
    });
    expect(onCategoryReason).toHaveBeenCalledWith(
      "G",
      "c1",
      "Not relevant to this extension",
      "ext1",
    );
  });
});

describe("category notes (self view)", () => {
  test("shows a Notes textarea for an applicable core category", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 2, applicability: true, result: "", description: "" },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryNotes={noop}
      />,
    );
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("typing in the notes textarea fires onCategoryNotes with moduleId/categoryId/value", () => {
    const onCategoryNotes = jest.fn();
    const progress: Record<string, ProgressData> = {
      "G.c1": { level: 2, applicability: true, result: "", description: "" },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryNotes={onCategoryNotes}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Some rationale" },
    });
    expect(onCategoryNotes).toHaveBeenCalledWith(
      "G",
      "c1",
      "Some rationale",
      undefined,
    );
  });

  test("prefills the textarea with the stored notes", () => {
    const progress: Record<string, ProgressData> = {
      "G.c1": {
        level: 2,
        applicability: true,
        result: "",
        description: "",
        notes: "Existing notes",
      },
    };
    render(
      <Category
        moduleId="G"
        category={category}
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryNotes={noop}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Existing notes");
  });

  test("renders Notes on an extension relevance card and writes with extensionId", () => {
    const extCategory: ExtensionCategoryData = {
      id: "c1",
      weight: 1,
      guidance: "",
      assessment: "",
      references: [],
      levels: [{ number: 1, name: "Initial", description: "" }],
    };
    const progress: Record<string, ProgressData> = {
      "ext1.G.c1": {
        level: 0,
        applicability: true,
        result: "",
        description: "",
      },
    };
    const onCategoryNotes = jest.fn();
    render(
      <Category
        moduleId="G"
        category={category}
        extCategory={extCategory}
        extensionId="ext1"
        progress={progress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryNotes={onCategoryNotes}
      />,
    );
    const notes = screen
      .getByText("Notes")
      .closest("label")!
      .querySelector("textarea")!;
    fireEvent.change(notes, { target: { value: "x" } });
    expect(onCategoryNotes).toHaveBeenCalledWith("G", "c1", "x", "ext1");
  });
});
