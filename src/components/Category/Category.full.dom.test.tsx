import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { Category } from "./Category";
import type {
  CategoryData,
  ExtensionCategoryData,
  ProgressData,
  RequirementProgress,
} from "../../types/types";
import type { RequirementFilterState } from "../../utils/requirementFilter";

const category: CategoryData = {
  id: "c1",
  weight: 1,
  name: "Strategy",
  description: "",
  levels: [],
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
const rp: Record<string, RequirementProgress> = {
  "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
  "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
};
const noop = () => {};

// Fixture for the filter-aware navigation test: 3 requirements so a
// middle one can be filtered out while a 3rd remains visible.
const category3: CategoryData = {
  id: "c1",
  weight: 1,
  name: "Strategy",
  description: "",
  levels: [],
  requirements: [
    {
      id: "r1",
      weight: 1,
      description: "Keep this one",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "r2",
      weight: 1,
      description: "Hide this one",
      guidance: "",
      assessment: "",
      references: [],
    },
    {
      id: "r3",
      weight: 1,
      description: "Keep this one too",
      guidance: "",
      assessment: "",
      references: [],
    },
  ],
};
const rp3: Record<string, RequirementProgress> = {
  "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
  "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
  "G.c1.r3": { level: 1, applicability: true, notes: "", evidence: "" },
};
// Text filter matches r1/r3's description ("keep this one...") but not
// r2's ("hide this one"), so r2 is hidden from visibleViews.
const hideMiddleFilter: RequirementFilterState = {
  text: "keep this one",
  statuses: new Set(),
};

test("full view always shows the category description", () => {
  const categoryWithDescription: CategoryData = {
    ...category,
    description: "This category covers strategic alignment.",
  };
  render(
    <Category
      moduleId="G"
      category={categoryWithDescription}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  const description = document.querySelector(".pkimm-category-description");
  expect(description).toBeInTheDocument();
  expect(description).toHaveTextContent(
    "This category covers strategic alignment.",
  );
});

test("sub-header renders Next unassessed and Show calculation as secondary buttons", () => {
  render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  const nextUnassessed = screen.getByRole("button", {
    name: /next unassessed/i,
  });
  const showCalculation = screen.getByRole("button", {
    name: /show calculation/i,
  });
  expect(nextUnassessed.tagName).toBe("BUTTON");
  expect(showCalculation.tagName).toBe("BUTTON");
  expect(nextUnassessed).toHaveClass("pkimm-btn--secondary");
  expect(showCalculation).toHaveClass("pkimm-btn--secondary");
});

test("full view renders a card per requirement and a live sticky level", () => {
  render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  expect(screen.getByTestId("requirement-card-G.c1.r1")).toBeInTheDocument();
  expect(screen.getByTestId("requirement-card-G.c1.r2")).toBeInTheDocument();
  // effective = (4*2 + 2*1)/3 = 3.33 → display 3
  expect(screen.getByText(/2 of 2 assessed/)).toBeInTheDocument();
});

test("Show calculation opens a popover listing the assessed requirements and the arithmetic", () => {
  render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /show calculation/i }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/= 3/)).toBeInTheDocument(); // floored display
});

test("Show calculation popover has an accessible name and no axe violations", async () => {
  const { container } = render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /show calculation/i }));
  const dialog = screen.getByRole("dialog", { name: /show calculation/i });
  expect(dialog).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("Clear requirement assessments fires the handler", () => {
  const onClear = jest.fn();
  render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={onClear}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
  fireEvent.click(
    screen.getByRole("menuitem", { name: /clear requirement assessments/i }),
  );
  expect(onClear).toHaveBeenCalledWith("G", "c1");
});

test("pressing n on a card moves focus to the next requirement card", () => {
  render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      progress={{}}
      requirementProgress={rp}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  const first = screen.getByTestId("requirement-card-G.c1.r1");
  first.focus();
  fireEvent.keyDown(first, { key: "n" });
  expect(screen.getByTestId("requirement-card-G.c1.r2")).toHaveFocus();
});

test("Next unassessed skips a filtered-out unassessed card and focuses the next visible unassessed one", () => {
  // r1 is unassessed (level 0) but hidden by the filter; r2 is filtered out
  // too; r3 is unassessed and visible. Without the filter-aware fix,
  // nextUnassessedKey(views) would resolve to r1 — which has no cardRefs
  // entry since it isn't rendered — making focusCard silently no-op.
  const category3Unassessed: CategoryData = {
    id: "c1",
    weight: 1,
    name: "Strategy",
    description: "",
    levels: [],
    requirements: [
      {
        id: "r1",
        weight: 1,
        description: "Hide this one",
        guidance: "",
        assessment: "",
        references: [],
      },
      {
        id: "r2",
        weight: 1,
        description: "Also hide this one",
        guidance: "",
        assessment: "",
        references: [],
      },
      {
        id: "r3",
        weight: 1,
        description: "Keep this one",
        guidance: "",
        assessment: "",
        references: [],
      },
    ],
  };
  const rpUnassessed: Record<string, RequirementProgress> = {
    "G.c1.r1": { level: 0, applicability: true, notes: "", evidence: "" },
    "G.c1.r2": { level: 2, applicability: true, notes: "", evidence: "" },
    "G.c1.r3": { level: 0, applicability: true, notes: "", evidence: "" },
  };
  const hideR1AndR2Filter: RequirementFilterState = {
    text: "keep this one",
    statuses: new Set(),
  };
  render(
    <Category
      moduleId="G"
      category={category3Unassessed}
      view="full"
      progress={{}}
      requirementProgress={rpUnassessed}
      requirementFilter={hideR1AndR2Filter}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  // r1 and r2 are hidden by the filter — only r3 renders.
  expect(screen.queryByTestId("requirement-card-G.c1.r1")).toBeNull();
  expect(screen.queryByTestId("requirement-card-G.c1.r2")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /next unassessed/i }));
  expect(screen.getByTestId("requirement-card-G.c1.r3")).toHaveFocus();
});

test("pressing n skips a filtered-out card and focuses the next visible one", () => {
  render(
    <Category
      moduleId="G"
      category={category3}
      view="full"
      progress={{}}
      requirementProgress={rp3}
      requirementFilter={hideMiddleFilter}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onRequirementLevelChange={noop}
      onRequirementApplicabilityChange={noop}
      onRequirementFieldChange={noop as never}
      onClearRequirementAssessments={noop}
    />,
  );
  // r2 is hidden by the filter — only r1 and r3 render.
  expect(screen.queryByTestId("requirement-card-G.c1.r2")).toBeNull();
  const first = screen.getByTestId("requirement-card-G.c1.r1");
  first.focus();
  fireEvent.keyDown(first, { key: "n" });
  expect(screen.getByTestId("requirement-card-G.c1.r3")).toHaveFocus();
  expect(screen.queryByTestId("requirement-card-G.c1.r2")).toBeNull();
});

// Category-level "not applicable" reason capture (full view).
describe("category not-applicable reason (full view)", () => {
  test("shows no reason field while the category is in scope", () => {
    render(
      <Category
        moduleId="G"
        category={category}
        view="full"
        progress={{}}
        requirementProgress={rp}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={noop}
        onRequirementLevelChange={noop}
        onRequirementApplicabilityChange={noop}
        onRequirementFieldChange={noop as never}
        onClearRequirementAssessments={noop}
      />,
    );
    expect(
      screen.queryByText(/Reason this category is not applicable/i),
    ).toBeNull();
  });

  test("shows a reason textarea once the category is toggled Not Applicable, and reports edits", () => {
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
        view="full"
        progress={progress}
        requirementProgress={rp}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onCategoryReason={onCategoryReason}
        onRequirementLevelChange={noop}
        onRequirementApplicabilityChange={noop}
        onRequirementFieldChange={noop as never}
        onClearRequirementAssessments={noop}
      />,
    );
    const textarea = screen.getByLabelText(
      /Reason this category is not applicable/i,
    );
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "Out of scope for us" } });
    expect(onCategoryReason).toHaveBeenCalledWith(
      "G",
      "c1",
      "Out of scope for us",
    );
    // isApplicable === false also suppresses the sticky level / requirement
    // list, so no requirement cards should render alongside the reason field.
    expect(screen.queryByTestId("requirement-card-G.c1.r1")).toBeNull();
  });
});

test("extension full card: Evidence + Workspace links write with extensionId", () => {
  const extCategory: ExtensionCategoryData = {
    id: "c1",
    weight: 1,
    guidance: "",
    assessment: "",
    references: [],
    levels: [{ number: 1, name: "Initial", description: "" }],
  };
  const progress: Record<string, ProgressData> = {
    "ext1.G.c1": { level: 2, result: "", description: "", applicability: true },
  };
  const onCategoryFieldChange = jest.fn();
  render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      extCategory={extCategory}
      extensionId="ext1"
      progress={progress}
      workspaceLinks={{
        pocs: [{ id: "p1", name: "Dana" }],
        artifacts: [{ id: "a1", title: "Doc" }],
      }}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onCategoryFieldChange={onCategoryFieldChange}
    />,
  );
  const ev = screen
    .getByText("Evidence")
    .closest("label")!
    .querySelector("textarea")!;
  fireEvent.change(ev, { target: { value: "z" } });
  expect(onCategoryFieldChange).toHaveBeenCalledWith(
    "G",
    "c1",
    "evidence",
    "z",
    "ext1",
  );
  expect(screen.getByText(/Workspace links/i)).toBeInTheDocument();
});

test("core self card has no category-grain Evidence field", () => {
  render(
    <Category
      moduleId="G"
      category={category}
      view="self"
      progress={{
        "G.c1": { level: 2, result: "", description: "", applicability: true },
      }}
      onLevelChange={noop}
      onApplicabilityChange={noop}
    />,
  );
  expect(screen.queryByText("Evidence")).toBeNull();
});
