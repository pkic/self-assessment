import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ScopeView, type ScopeViewProps } from "./ScopeView";
import { AssessmentTargetProvider } from "../../contexts/AssessmentTargetContext";
import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../../types/types";

expect.extend(toHaveNoViolations);

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "c1",
        weight: 1,
        name: "Cat One",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "Req One",
            guidance: "",
            assessment: "",
            references: [],
          },
          {
            id: "r2",
            weight: 1,
            description: "Req Two",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
      {
        id: "c2",
        weight: 1,
        name: "Cat Two",
        description: "",
        levels: [],
        requirements: [],
      },
    ],
  },
];
const rp = (applicability: boolean): RequirementProgress => ({
  level: 0,
  applicability,
  notes: "",
  evidence: "",
});
const noop = () => {};
const handlerProps: ScopeViewProps = {
  templates: [],
  onSetCategory: noop,
  onSetRequirement: noop,
  onSetModule: noop,
  onSetCategoryRequirements: noop,
  onCategoryReason: noop,
  onRequirementReason: noop,
  onSaveTemplate: noop,
  onApplyTemplate: noop,
  onDeleteTemplate: noop,
  onExportTemplate: noop,
  onImportTemplateFile: noop,
};

const renderScope = (
  overrides: Partial<ScopeViewProps> = {},
  progress: Record<string, ProgressData> = {
    "G.c2": {
      level: 0,
      result: "Not Applicable",
      description: "",
      applicability: false,
    },
  },
  requirementProgress: Record<string, RequirementProgress> = {},
  coreModules: ModuleData[] = modules,
) =>
  render(
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={coreModules}
      progress={progress}
      requirementProgress={requirementProgress}
      enabledExtensions={[]}
    >
      <ScopeView {...handlerProps} {...overrides} />
    </AssessmentTargetProvider>,
  );

test("default state: modules expanded (categories shown), requirements hidden", () => {
  renderScope();
  // Category rows visible…
  expect(screen.getByText("Cat One")).toBeInTheDocument();
  // …but requirement rows hidden until the category is expanded.
  expect(screen.queryByText("Req One")).not.toBeInTheDocument();
});

test("expanding a category reveals its requirement rows; collapsing hides them", () => {
  renderScope();
  fireEvent.click(screen.getByRole("button", { name: "Cat One" }));
  expect(screen.getByText("Req One")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cat One" }));
  expect(screen.queryByText("Req One")).not.toBeInTheDocument();
});

test("collapsing a module hides its categories; expanding shows them", () => {
  renderScope();
  fireEvent.click(screen.getByRole("button", { name: "G — Governance" }));
  expect(screen.queryByText("Cat One")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "G — Governance" }));
  expect(screen.getByText("Cat One")).toBeInTheDocument();
});

test("Expand all reveals all category and requirement rows; Collapse all hides categories", () => {
  renderScope();
  fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
  expect(screen.queryByText("Cat One")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
  expect(screen.getByText("Cat One")).toBeInTheDocument();
  expect(screen.getByText("Req One")).toBeInTheDocument();
});

test("category pill shows In scope and clicking it fires onSetCategory(catKey, explicitOut)", () => {
  const onSetCategory = jest.fn();
  renderScope({ onSetCategory });
  // Cat One is in scope (explicitOut false) -> click excludes it.
  fireEvent.click(
    screen.getByRole("button", { name: /Cat One, activate to exclude/i }),
  );
  expect(onSetCategory).toHaveBeenCalledWith("G.c1", false);
});

test("a mixed category shows a Partial pill", () => {
  renderScope(
    {},
    {
      "G.c2": {
        level: 0,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    },
    { "G.c1.r1": rp(false) },
  );
  expect(screen.getByText(/Partial · 1 of 2/)).toBeInTheDocument();
});

test("module pill click fires onSetModule(moduleId, state !== 'in')", () => {
  const onSetModule = jest.fn();
  // Default fixture: c1 in, c2 out -> module is mixed -> state !== "in" is true.
  renderScope({ onSetModule });
  fireEvent.click(
    screen.getByRole("button", { name: /Governance, activate to include/i }),
  );
  expect(onSetModule).toHaveBeenCalledWith("G", true);
});

test("requirement pill click fires onSetRequirement(reqKey, !inScope)", () => {
  const onSetRequirement = jest.fn();
  renderScope({ onSetRequirement });
  fireEvent.click(screen.getByRole("button", { name: "Cat One" }));
  fireEvent.click(screen.getByRole("button", { name: /Req One/i }));
  expect(onSetRequirement).toHaveBeenCalledWith("G.c1.r1", false);
});

test("requirement pill is disabled under an explicitly out-of-scope category", () => {
  renderScope(
    {},
    {
      "G.c1": {
        level: 0,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    },
    {},
  );
  fireEvent.click(screen.getByRole("button", { name: "Cat One" }));
  const reqPill = screen.getByRole("button", {
    name: /Req One/i,
  }) as HTMLButtonElement;
  expect(reqPill.disabled).toBe(true);
});

test("pill labels read In scope and Excluded as visible text", () => {
  renderScope();
  // Cat One is in scope; Cat Two is explicitly out.
  expect(screen.getAllByText("In scope").length).toBeGreaterThan(0);
  expect(screen.getByText("Excluded")).toBeInTheDocument();
});

test("All req out in an expanded category fires onSetCategoryRequirements(catKey, false)", () => {
  const onSetCategoryRequirements = jest.fn();
  renderScope({ onSetCategoryRequirements });
  fireEvent.click(screen.getByRole("button", { name: "Cat One" }));
  fireEvent.click(screen.getByRole("button", { name: "All req out" }));
  expect(onSetCategoryRequirements).toHaveBeenCalledWith("G.c1", false);
});

test("an explicitly out-of-scope category reveals its reason textarea", () => {
  renderScope();
  expect(screen.getByLabelText(/Reason .*Cat Two/i)).toBeInTheDocument();
});

test("a derived-N/A category (all requirements excluded) shows the caption, not a reason textarea", () => {
  renderScope(
    {},
    {
      "G.c2": {
        level: 0,
        result: "Not Applicable",
        description: "",
        applicability: false,
      },
    },
    { "G.c1.r1": rp(false), "G.c1.r2": rp(false) },
  );
  expect(screen.getByText(/all requirements excluded/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Reason .*Cat One/i)).not.toBeInTheDocument();
});

test("a zero-requirement category renders as static text, not a disclosure button", () => {
  // Cat Two has no requirements; make it in-scope so it is not the reason case.
  renderScope({}, {});
  expect(
    screen.queryByRole("button", { name: "Cat Two" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Cat Two")).toBeInTheDocument();
});

test("the summary reports coverage from buildScopeCoverage", () => {
  const { container } = renderScope();
  const summary = container.querySelector(".pkimm-scope__summary");
  expect(summary).toHaveTextContent(/1 of 2 categories/i);
});

test("shows an empty state when no modules are loaded", () => {
  renderScope({}, {}, {}, []);
  expect(
    screen.getByText("No modules loaded for this assessment."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /activate to/i }),
  ).not.toBeInTheDocument();
});

test("excluded rows render an aria-hidden excluded icon", () => {
  // Default fixture: Cat Two is explicitly out -> its pill carries the icon.
  const { container } = renderScope();
  const icon = container.querySelector(".pkimm-scope__pill-icon");
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute("aria-hidden", "true");
});

test("an all-in-scope tree renders no excluded icon", () => {
  const { container } = renderScope({}, {});
  expect(
    container.querySelector(".pkimm-scope__pill-icon"),
  ).not.toBeInTheDocument();
});

test("no axe violations across in-scope, excluded, partial, and derived-N/A states", async () => {
  const naProgress: Record<string, ProgressData> = {
    "G.c2": {
      level: 0,
      result: "Not Applicable",
      description: "",
      applicability: false,
    },
  };
  // In-scope + explicit-out, with a category expanded to show requirement rows.
  const base = renderScope();
  fireEvent.click(screen.getByRole("button", { name: "Cat One" }));
  expect(await axe(base.container)).toHaveNoViolations();
  base.unmount();
  // Partial category (one requirement out).
  const partial = renderScope({}, naProgress, { "G.c1.r1": rp(false) });
  expect(await axe(partial.container)).toHaveNoViolations();
  partial.unmount();
  // Derived not-applicable category (all requirements out).
  const derived = renderScope({}, naProgress, {
    "G.c1.r1": rp(false),
    "G.c1.r2": rp(false),
  });
  expect(await axe(derived.container)).toHaveNoViolations();
});

it("Export is disabled until a template is selected, then calls onExportTemplate", () => {
  const onExportTemplate = jest.fn();
  renderScope({
    onExportTemplate,
    templates: [
      {
        id: "t1",
        name: "T1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        outOfScopeCategoryKeys: [],
        outOfScopeRequirementKeys: [],
      },
    ],
  });
  const exportBtn = screen.getByRole("button", { name: /export/i });
  expect(exportBtn).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: /scope template/i }), {
    target: { value: "t1" },
  });
  fireEvent.click(screen.getByRole("button", { name: /export/i }));
  expect(onExportTemplate).toHaveBeenCalledWith("t1");
});

it("Import reads the chosen file's text and calls onImportTemplateFile", async () => {
  const onImportTemplateFile = jest.fn();
  renderScope({ onImportTemplateFile });
  const input = screen.getByLabelText(
    /import scope template/i,
  ) as HTMLInputElement;
  // jsdom's File has no .text() — build a File-shaped object with one, exactly
  // as ComparisonPanel.dom.test.tsx does, so the file.text().then(...) path runs.
  const file = new File(["kind: pkimm-scope-template"], "t.yaml", {
    type: "text/yaml",
  }) as File & { text: () => Promise<string> };
  file.text = () => Promise.resolve("kind: pkimm-scope-template");
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(onImportTemplateFile).toHaveBeenCalledWith(
      "kind: pkimm-scope-template",
    ),
  );
  expect(input.value).toBe("");
});
