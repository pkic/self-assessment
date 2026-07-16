import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Category } from "./Category";
import { RequirementFinder } from "./RequirementFinder";
import type {
  CategoryData,
  ExtensionCategoryData,
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../../types/types";

expect.extend(toHaveNoViolations);

// §6.9 capstone: renders the full-view Category (a couple of requirements,
// one Not Applicable) alongside the RequirementFinder and asserts axe finds
// no violations across both. This is the guard for every color-coded chip
// carrying a text label (Tasks 5/7/9) plus the radiogroup/labels/roles added
// across Tasks 6-7.
const category: CategoryData = {
  id: "c1",
  weight: 1,
  name: "Strategy and vision",
  description: "",
  levels: [],
  requirements: [
    {
      id: "r1",
      weight: 2,
      description: "The organization maintains a documented PKI strategy",
      guidance: "Guidance for r1",
      assessment: "Assessment criteria for r1",
      references: [],
    },
    {
      id: "r2",
      weight: 1,
      description: "Key ceremonies are scripted and witnessed",
      guidance: "",
      assessment: "",
      references: [],
    },
  ],
};

const requirementProgress: Record<string, RequirementProgress> = {
  "G.c1.r1": { level: 4, applicability: true, notes: "", evidence: "" },
  "G.c1.r2": {
    level: 0,
    applicability: false,
    notes: "",
    evidence: "",
    applicabilityReason: "Not in scope for this deployment",
  },
};

const moduleData: ModuleData = {
  id: "G",
  name: "Governance",
  description: "",
  categories: [category],
};

const noop = () => {};

test("full-view Category + RequirementFinder have no axe violations", async () => {
  const { container } = render(
    <>
      <RequirementFinder
        module={moduleData}
        requirementProgress={requirementProgress}
        filter={{ text: "", statuses: new Set() }}
        onFilterChange={noop}
        onJump={noop}
      />
      <Category
        moduleId="G"
        category={category}
        view="full"
        progress={{}}
        requirementProgress={requirementProgress}
        onLevelChange={noop}
        onApplicabilityChange={noop}
        onRequirementLevelChange={noop}
        onRequirementApplicabilityChange={noop}
        onRequirementFieldChange={noop as never}
        onClearRequirementAssessments={noop}
      />
    </>,
  );

  expect(await axe(container)).toHaveNoViolations();
});

test("extension full card with Evidence + Workspace links has no axe violations", async () => {
  const extCategory: ExtensionCategoryData = {
    id: "c1",
    weight: 1,
    guidance: "Extension guidance",
    assessment: "Extension assessment criteria",
    references: [],
    levels: [{ number: 1, name: "Initial", description: "" }],
  };
  const progress: Record<string, ProgressData> = {
    "ext1.G.c1": {
      level: 2,
      result: "",
      description: "",
      applicability: true,
      notes: "some notes",
      evidence: "some evidence",
    },
  };
  const { container } = render(
    <Category
      moduleId="G"
      category={category}
      view="full"
      extCategory={extCategory}
      extensionId="ext1"
      progress={progress}
      workspaceLinks={{
        pocs: [{ id: "p1", name: "Dana", role: "Architect" }],
        artifacts: [{ id: "a1", title: "Policy doc" }],
      }}
      onLevelChange={noop}
      onApplicabilityChange={noop}
      onCategoryNotes={noop}
      onCategoryFieldChange={noop as never}
    />,
  );
  expect(await axe(container)).toHaveNoViolations();
});
