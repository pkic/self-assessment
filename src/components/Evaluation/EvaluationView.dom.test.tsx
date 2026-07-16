import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { EvaluationView } from "./EvaluationView";
import { AssessmentTargetProvider } from "../../contexts/AssessmentTargetContext";
import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../../types/types";

expect.extend(toHaveNoViolations);

const renderEvaluation = (
  target: {
    coreModules?: ModuleData[];
    progress?: Record<string, ProgressData>;
    requirementProgress?: Record<string, RequirementProgress>;
  } = {},
) =>
  render(
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={target.coreModules ?? []}
      progress={target.progress ?? {}}
      requirementProgress={target.requirementProgress ?? {}}
      enabledExtensions={[]}
    >
      <EvaluationView />
    </AssessmentTargetProvider>,
  );

const coreModules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "strategy-and-vision",
        weight: 3,
        name: "Strategy and vision",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "r1",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
    ],
  },
];

// A category whose requirement progress lands its effective level at 2 (via
// calculateEffectiveCategoryLevel), with one rated requirement (level 2) low
// enough to limit it — used to exercise the "Gap to next level" section.
const gapModules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "strategy-and-vision",
        weight: 3,
        name: "Strategy and vision",
        description: "",
        levels: [
          { number: 1, name: "Initial", description: "Initial criteria" },
          { number: 2, name: "Foundational", description: "L2 criteria" },
          {
            number: 3,
            name: "Defined",
            description: "Documented policies criteria",
          },
          { number: 4, name: "Managed", description: "L4 criteria" },
          { number: 5, name: "Optimized", description: "L5 criteria" },
        ],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "Policy is documented and approved",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
    ],
  },
];

test("shows a read-only-summary intro", () => {
  renderEvaluation({ coreModules });
  expect(screen.getByText(/read-only summary/i)).toBeInTheDocument();
});

test("level distribution matrix is always-visible: module rows and a total row render directly, with no axe violations", async () => {
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.strategy-and-vision.r1": {
      level: 4,
      applicability: true,
      notes: "",
      evidence: "",
    },
  };
  const { container } = renderEvaluation({ coreModules, requirementProgress });

  expect(screen.getByText("G — Governance")).toBeInTheDocument();
  expect(screen.getByText("Total")).toBeInTheDocument();

  expect(await axe(container)).toHaveNoViolations();
});

test("shows the category-grain note when no requirements are rated", () => {
  // Self-declared category level, no requirementProgress → category grain.
  const progress: Record<string, ProgressData> = {
    "G.strategy-and-vision": {
      level: 3,
      result: "Managed",
      description: "",
      applicability: true,
    },
  };
  renderEvaluation({ coreModules, progress });
  expect(screen.getByText(/category-level/i)).toBeInTheDocument();
});

test("renders the maturity-summary hero and the merged completeness-and-coverage tiles", () => {
  const progress: Record<string, ProgressData> = {
    "G.strategy-and-vision": {
      level: 3,
      result: "Managed",
      description: "",
      applicability: true,
    },
  };
  renderEvaluation({ coreModules, progress });

  expect(screen.getByText("Maturity summary")).toBeInTheDocument();
  expect(screen.getByText(/Overall maturity/i)).toBeInTheDocument();
  // The module name appears as a maturity-bar label (among other places).
  expect(screen.getAllByText("Governance").length).toBeGreaterThan(0);

  expect(screen.getByText("Completeness and coverage")).toBeInTheDocument();
  expect(screen.getByText("Categories assessed")).toBeInTheDocument();
  expect(
    screen.getByText("In-scope requirements assessed"),
  ).toBeInTheDocument();
  expect(screen.getByText("Categories in scope")).toBeInTheDocument();
  expect(screen.getByText("Requirements in scope")).toBeInTheDocument();
});

test("sections are exposed as named regions for assistive tech, with no axe violations", async () => {
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.strategy-and-vision.r1": {
      level: 4,
      applicability: true,
      notes: "",
      evidence: "",
    },
  };
  const { container } = renderEvaluation({ coreModules, requirementProgress });

  expect(
    screen.getByRole("region", { name: "Maturity summary" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "Completeness and coverage" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "Level distribution" }),
  ).toBeInTheDocument();

  expect(await axe(container)).toHaveNoViolations();
});

test("renders the gap-to-next-level section for a category below the top level, with no axe violations", async () => {
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.strategy-and-vision.r1": {
      level: 2,
      applicability: true,
      notes: "",
      evidence: "",
    },
  };
  const { container } = renderEvaluation({
    coreModules: gapModules,
    requirementProgress,
  });

  expect(screen.getByText("Gap to next level")).toBeInTheDocument();
  expect(
    screen.getByText(/Strategy and vision — to reach/i),
  ).toBeInTheDocument();
  // Next-level (L3) criteria from the category rubric.
  expect(screen.getByText("Documented policies criteria")).toBeInTheDocument();
  // The rated-but-capping requirement appears under the "Raise" group.
  expect(screen.getByText("Raise")).toBeInTheDocument();
  expect(
    screen.getByText(/Policy is documented and approved — at 2 - Foundational/),
  ).toBeInTheDocument();

  expect(await axe(container)).toHaveNoViolations();
});

test("omits the gap-to-next-level section when no category qualifies (self-only, no requirement data)", () => {
  const progress: Record<string, ProgressData> = {
    "G.strategy-and-vision": {
      level: 3,
      result: "Managed",
      description: "",
      applicability: true,
    },
  };
  renderEvaluation({ coreModules, progress });
  expect(screen.queryByText("Gap to next level")).not.toBeInTheDocument();
});
