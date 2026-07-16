import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ComparisonPanel, type ComparisonPanelProps } from "./ComparisonPanel";
import {
  AssessmentTargetProvider,
  useAssessmentTarget,
} from "../../contexts/AssessmentTargetContext";
import type {
  ComparisonResult,
  ReconciliationRow,
} from "../../utils/comparison";

expect.extend(toHaveNoViolations);

const noop = () => {};

const baseProps: ComparisonPanelProps = {
  baselineOptions: [{ id: "a1", name: "Baseline One" }],
  activeBaselineLabel: null,
  comparison: null,
  reconciliation: [],
  unmappedNames: [],
  aligned: false,
  onSelectStored: noop,
  onSelectFile: noop,
  onClear: noop,
};

// Test-only helper: selects the given extension as the active target on
// mount, mirroring UnifiedReport.dom.test.tsx's TargetSwitcher — there is no
// prop on AssessmentTargetProvider to seed a non-original initial target.
const TargetSwitcher: React.FC<{ extensionId: string }> = ({ extensionId }) => {
  const { setTarget } = useAssessmentTarget();
  React.useEffect(() => {
    setTarget({ kind: "extension", id: extensionId });
  }, [extensionId, setTarget]);
  return null;
};

const renderPanel = (
  overrides: Partial<ComparisonPanelProps> = {},
  activeExtensionId?: string,
) =>
  render(
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={[]}
      progress={{}}
      requirementProgress={{}}
      enabledExtensions={[]}
    >
      {activeExtensionId && <TargetSwitcher extensionId={activeExtensionId} />}
      <ComparisonPanel {...baseProps} {...overrides} />
    </AssessmentTargetProvider>,
  );

const comparison: ComparisonResult = {
  overall: { current: 3, baseline: 2, delta: 1, direction: "up" },
  modules: [
    {
      moduleId: "G",
      module: "Governance",
      d: { current: 3, baseline: 2, delta: 1, direction: "up" },
    },
  ],
  categories: [
    {
      key: "G.c1",
      module: "Governance",
      categoryName: "Cat One",
      d: { current: 2, baseline: 3, delta: -1, direction: "down" },
    },
    {
      key: "G.c2",
      module: "Governance",
      categoryName: "Cat Two",
      d: { current: -1, baseline: 2, delta: -3, direction: "down" },
    },
  ],
};

const reconciliation: ReconciliationRow[] = [
  {
    key: "G.c1",
    categoryName: "Cat One",
    targetLevel: 3,
    achieved: 2,
    status: "not-met",
  },
];

test("empty state renders the control row and a one-line explanation", () => {
  renderPanel();
  expect(
    screen.getByRole("combobox", { name: /compare to/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Compare to a file/i)).toBeInTheDocument();
  expect(
    screen.getByText(
      /Select a saved assessment or a file to compare this assessment against a baseline\./i,
    ),
  ).toBeInTheDocument();
});

test("selecting a stored option fires onSelectStored(id)", () => {
  const onSelectStored = jest.fn();
  renderPanel({ onSelectStored });
  const select = screen.getByRole("combobox", { name: /compare to/i });
  fireEvent.change(select, { target: { value: "a1" } });
  expect(onSelectStored).toHaveBeenCalledWith("a1");
});

test("choosing a file reads its text and fires onSelectFile(text)", async () => {
  const onSelectFile = jest.fn();
  renderPanel({ onSelectFile });
  const input = screen.getByLabelText(/Compare to a file/i) as HTMLInputElement;
  // jsdom's File has no .text() — build a File-shaped object with one so the
  // component's file.text().then(...) codepath can be exercised directly.
  const file = new File(["hello baseline"], "baseline.json", {
    type: "application/json",
  }) as File & { text: () => Promise<string> };
  file.text = () => Promise.resolve("hello baseline");
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(onSelectFile).toHaveBeenCalledWith("hello baseline"),
  );
  expect(input.value).toBe("");
});

test("Clear comparison button fires onClear when a baseline is active", () => {
  const onClear = jest.fn();
  renderPanel({ activeBaselineLabel: "Baseline One", onClear });
  fireEvent.click(screen.getByRole("button", { name: /Clear comparison/i }));
  expect(onClear).toHaveBeenCalled();
});

test("Clear comparison button is absent with no active baseline", () => {
  renderPanel();
  expect(
    screen.queryByRole("button", { name: /Clear comparison/i }),
  ).not.toBeInTheDocument();
});

test("with a comparison, the overall hero shows baseline/current badges and the change word", () => {
  renderPanel({ comparison, activeBaselineLabel: "Baseline One" });
  // Hero: baseline (2) and current (3) level badges + the change phrase.
  expect(screen.getByText("2 - Foundational")).toBeInTheDocument();
  expect(screen.getByText("3 - Advanced")).toBeInTheDocument();
  expect(screen.getByText("Improved +1")).toBeInTheDocument();
  // comparison is populated: the empty-state explanation must not render.
  expect(
    screen.queryByText(
      /Select a saved assessment or a file to compare this assessment against a baseline\./i,
    ),
  ).not.toBeInTheDocument();
});

test("the movement tally counts comparable categories by direction (N/A excluded)", () => {
  // Fixture: Cat One is a decline; Cat Two is N/A (current -1) so it is not
  // counted in any of the three tallies.
  renderPanel({ comparison, activeBaselineLabel: "Baseline One" });
  expect(screen.getByText("0 improved")).toBeInTheDocument();
  expect(screen.getByText("1 declined")).toBeInTheDocument();
  expect(screen.getByText("0 unchanged")).toBeInTheDocument();
});

test("module and category dumbbell rows expose a visually-hidden summary", () => {
  renderPanel({ comparison, activeBaselineLabel: "Baseline One" });
  // Module name renders as a dumbbell-row name and as the category group head.
  expect(screen.getAllByText("Governance").length).toBeGreaterThan(0);
  expect(
    screen.getByText(
      "Governance: baseline 2 - Foundational, current 3 - Advanced, improved by 1",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Cat One: baseline 3 - Advanced, current 2 - Foundational, declined by 1",
    ),
  ).toBeInTheDocument();
});

test("a same-direction overall renders the No change phrase", () => {
  const sameComparison: ComparisonResult = {
    overall: { current: 3, baseline: 3, delta: 0, direction: "same" },
    modules: [],
    categories: [],
  };
  renderPanel({
    comparison: sameComparison,
    activeBaselineLabel: "Baseline One",
  });
  expect(screen.getByText("No change")).toBeInTheDocument();
});

test("reconciliation section is absent when reconciliation is empty", () => {
  renderPanel({ comparison, activeBaselineLabel: "Baseline One" });
  expect(
    screen.queryByText("Action plan reconciliation"),
  ).not.toBeInTheDocument();
});

test("a category that is N/A on one side shows Not comparable", () => {
  renderPanel({ comparison, activeBaselineLabel: "Baseline One" });
  expect(screen.getByText("Cat Two")).toBeInTheDocument();
  // Visible track replacement + the row's screen-reader summary.
  expect(screen.getByText("Not comparable")).toBeInTheDocument();
  expect(screen.getByText("Cat Two: not comparable")).toBeInTheDocument();
});

test("aligned + unmappedNames shows the cross-version note", () => {
  renderPanel({
    comparison,
    activeBaselineLabel: "Baseline One",
    aligned: true,
    unmappedNames: ["Old Category"],
  });
  expect(
    screen.getByText(
      /Baseline aligned from a different model version by name matching; 1 item\(s\) couldn't be matched\./,
    ),
  ).toBeInTheDocument();
});

test("aligned with no unmappedNames shows the note without a count", () => {
  renderPanel({
    comparison,
    activeBaselineLabel: "Baseline One",
    aligned: true,
    unmappedNames: [],
  });
  expect(
    screen.getByText(
      /Baseline aligned from a different model version by name matching\./,
    ),
  ).toBeInTheDocument();
});

test("reconciliation shows the met-count summary and a status pill", () => {
  renderPanel({
    comparison,
    activeBaselineLabel: "Baseline One",
    reconciliation,
  });
  // The sole row is not-met, so 0 of 1 targets are met.
  expect(screen.getByText("0 of 1 targets met")).toBeInTheDocument();
  const recon = screen
    .getByText("Action plan reconciliation")
    .closest(".pkimm-comparison__recon") as HTMLElement;
  expect(recon).not.toBeNull();
  const row = within(recon)
    .getByText("Cat One")
    .closest(".pkimm-comparison__recon-row") as HTMLElement;
  expect(row).not.toBeNull();
  expect(within(row).getByText("Not met")).toBeInTheDocument();
  expect(
    within(row).getByText(/Target 3 - Advanced · Now 2 - Foundational/),
  ).toBeInTheDocument();
});

test("renders nothing under an extension target (self-gate)", () => {
  renderPanel({ comparison, activeBaselineLabel: "Baseline One" }, "ext-1");
  expect(
    screen.queryByRole("combobox", { name: /compare to/i }),
  ).not.toBeInTheDocument();
});

test("renders with no axe violations (empty state)", async () => {
  const { container } = renderPanel();
  expect(await axe(container)).toHaveNoViolations();
});

test("renders with no axe violations (populated state)", async () => {
  const { container } = renderPanel({
    comparison,
    activeBaselineLabel: "Baseline One",
    aligned: true,
    unmappedNames: ["Old Category"],
    reconciliation,
  });
  expect(await axe(container)).toHaveNoViolations();
});
