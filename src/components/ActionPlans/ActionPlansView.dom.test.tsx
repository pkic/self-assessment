import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ActionPlansView, type ActionPlansViewProps } from "./ActionPlansView";
import { AssessmentTargetProvider } from "../../contexts/AssessmentTargetContext";
import {
  addActionPlan,
  updateActionPlanField,
  removeActionPlan,
  addPlanListItem,
  updatePlanListItem,
  removePlanListItem,
  addPlanTask,
  togglePlanTask,
  updatePlanTaskLabel,
  removePlanTask,
} from "../../utils/actionPlans";
import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
  ActionPlans,
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
        levels: [
          { number: 1, name: "Initial", description: "" },
          { number: 2, name: "Foundational", description: "level 2 crit" },
        ],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "Req One",
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

const pocs = [
  { id: "poc-1", name: "Jane Doe", role: "CISO" },
  { id: "poc-2", name: "Bob Lee" },
];

const noop = () => {};
const handlerProps: ActionPlansViewProps = {
  actionPlans: undefined,
  pocs: [],
  onAddPlan: noop,
  onUpdatePlanField: noop,
  onRemovePlan: noop,
  onAddListItem: noop,
  onUpdateListItem: noop,
  onRemoveListItem: noop,
  onAddTask: noop,
  onToggleTask: noop,
  onUpdateTaskLabel: noop,
  onRemoveTask: noop,
};

const renderView = (
  overrides: Partial<ActionPlansViewProps> = {},
  progress: Record<string, ProgressData> = {},
  requirementProgress: Record<string, RequirementProgress> = {},
) =>
  render(
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={modules}
      progress={progress}
      requirementProgress={requirementProgress}
      enabledExtensions={[]}
    >
      <ActionPlansView {...handlerProps} {...overrides} />
    </AssessmentTargetProvider>,
  );

// The overview pill and the plan card's own disclosure both include the
// category name (and, once expanded content exists, overlapping level-name
// text) in their accessible name, so — mirroring how WorkspaceView's tests
// disambiguate a record's disclosure from its remove button — every lookup
// below either scopes to a container (pills live only in
// .pkimm-action-plans__pills) or filters by `expanded` (only the disclosure
// button carries aria-expanded; the pill does not).
const getCardHeader = (name: RegExp, expanded: boolean) =>
  screen.getByRole("button", { name, expanded });

const getPill = (name: RegExp) => {
  const container = document.querySelector(".pkimm-action-plans__pills");
  return within(container as HTMLElement).getByRole("button", { name });
};

// A stateful wrapper that runs every callback through the real action-plan
// reducers, like WorkspaceView.dom.test.tsx's Harness — so collapse/expand,
// pill-jump, and every field edit exercise the actual data flow instead of a
// bare jest.fn().
const Harness: React.FC<{
  initial?: ActionPlans;
  pocs?: { id: string; name: string; role?: string }[];
  requirementProgress?: Record<string, RequirementProgress>;
}> = ({ initial, pocs: pocList = pocs, requirementProgress = {} }) => {
  const [actionPlans, setActionPlans] = useState<ActionPlans | undefined>(
    initial,
  );
  let idSeq = 0;
  const makeId = () => `id-${idSeq++}`;
  return (
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={modules}
      progress={{}}
      requirementProgress={requirementProgress}
      enabledExtensions={[]}
    >
      <ActionPlansView
        actionPlans={actionPlans}
        pocs={pocList}
        onAddPlan={(key, targetLevel) =>
          setActionPlans((ap) => addActionPlan(ap, key, targetLevel))
        }
        onUpdatePlanField={(key, field, value) =>
          setActionPlans((ap) => updateActionPlanField(ap, key, field, value))
        }
        onRemovePlan={(key) =>
          setActionPlans((ap) => removeActionPlan(ap, key))
        }
        onAddListItem={(key, field) =>
          setActionPlans((ap) => addPlanListItem(ap, key, field, makeId))
        }
        onUpdateListItem={(key, field, id, text) =>
          setActionPlans((ap) => updatePlanListItem(ap, key, field, id, text))
        }
        onRemoveListItem={(key, field, id) =>
          setActionPlans((ap) => removePlanListItem(ap, key, field, id))
        }
        onAddTask={(key) =>
          setActionPlans((ap) => addPlanTask(ap, key, makeId))
        }
        onToggleTask={(key, itemId) =>
          setActionPlans((ap) => togglePlanTask(ap, key, itemId))
        }
        onUpdateTaskLabel={(key, itemId, label) =>
          setActionPlans((ap) => updatePlanTaskLabel(ap, key, itemId, label))
        }
        onRemoveTask={(key, itemId) =>
          setActionPlans((ap) => removePlanTask(ap, key, itemId))
        }
      />
    </AssessmentTargetProvider>
  );
};

test("renders an empty state and the add-plan row", () => {
  renderView();
  expect(screen.getByText(/no action plans yet/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/add a plan for/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add plan/i })).toBeInTheDocument();
});

test("shows an intro noting action plans are optional and don't affect the score", () => {
  renderView();
  expect(screen.getByText(/doesn't affect the score/i)).toBeInTheDocument();
});

test("adding a plan creates a collapsed card, auto-expanded", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText(/add a plan for/i), {
    target: { value: "G.c1" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^add plan$/i }));

  // The new plan's disclosure is expanded automatically.
  expect(getCardHeader(/Cat One/, true)).toBeInTheDocument();
  // Target level defaults to current + 1 (current is unassessed => 0 => 1).
  expect(
    screen.getByRole("combobox", { name: /Target level for Cat One/i }),
  ).toHaveValue("1");
});

test("an overview pill expands a collapsed plan and shows level names", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 3 } },
  };
  render(<Harness initial={actionPlans} />);

  // Collapsed on mount.
  expect(getCardHeader(/Cat One/, false)).toBeInTheDocument();

  const pill = getPill(/Cat One/);
  expect(pill.textContent).toMatch(/Not Assessed/);
  expect(pill.textContent).toMatch(/3 - Advanced/);
  fireEvent.click(pill);

  expect(getCardHeader(/Cat One/, true)).toBeInTheDocument();
});

test("collapsed summary shows a gap hint when there are no tasks", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 3 } },
  };
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.c1.r1": { level: 1, applicability: true, notes: "", evidence: "" },
  };
  render(
    <Harness initial={actionPlans} requirementProgress={requirementProgress} />,
  );
  const header = getCardHeader(/Cat One/, false);
  expect(
    within(header).getByText(/To reach Foundational/i),
  ).toBeInTheDocument();
});

test("collapsed summary shows 'No tasks yet' with no gap and no tasks", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c2": { targetLevel: 2 } },
  };
  render(<Harness initial={actionPlans} />);
  const header = getCardHeader(/Cat Two/, false);
  expect(within(header).getByText(/No tasks yet/i)).toBeInTheDocument();
});

test("collapsed summary shows task progress once tasks exist", () => {
  const actionPlans: ActionPlans = {
    categories: {
      "G.c1": {
        targetLevel: 3,
        tasks: [
          { itemId: "t1", label: "Do a thing", done: true },
          { itemId: "t2", label: "Do another", done: false },
        ],
      },
    },
  };
  render(<Harness initial={actionPlans} />);
  const header = getCardHeader(/Cat One/, false);
  expect(within(header).getByText(/1 of 2 tasks/i)).toBeInTheDocument();
});

test("collapsed header shows target date and responsible person when set", () => {
  const actionPlans: ActionPlans = {
    categories: {
      "G.c1": {
        targetLevel: 3,
        targetDate: "2027-03-31",
        responsiblePocId: "poc-1",
      },
    },
  };
  render(<Harness initial={actionPlans} />);
  const header = getCardHeader(/Cat One/, false);
  expect(within(header).getByText("2027-03-31")).toBeInTheDocument();
  expect(within(header).getByText("Jane Doe")).toBeInTheDocument();
});

test("collapsed header omits the meta line when no date or owner is set", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 3 } },
  };
  const { container } = render(<Harness initial={actionPlans} />);
  expect(container.querySelector(".pkimm-action-plans__meta")).toBeNull();
});

test("objective add, edit, and remove round-trip through the reducers", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 } },
  };
  render(<Harness initial={actionPlans} />);
  fireEvent.click(getCardHeader(/Cat One/, false));

  fireEvent.click(screen.getByRole("button", { name: /add objective/i }));
  const field = screen.getByLabelText(/Objective 1 for Cat One/i);
  expect(field).toBeInTheDocument();

  fireEvent.change(field, { target: { value: "Formalize key ceremonies" } });
  expect(field).toHaveValue("Formalize key ceremonies");

  fireEvent.click(
    screen.getByRole("button", { name: /Remove Formalize key ceremonies/i }),
  );
  expect(
    screen.queryByLabelText(/Objective 1 for Cat One/i),
  ).not.toBeInTheDocument();
});

test("task add, toggle, and remove round-trip; done count updates", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 } },
  };
  render(<Harness initial={actionPlans} />);
  fireEvent.click(getCardHeader(/Cat One/, false));

  fireEvent.click(screen.getByRole("button", { name: /add task/i }));
  const label = screen.getByLabelText(/Edit task for Cat One/i);
  fireEvent.change(label, { target: { value: "Inventory HSMs" } });

  const checkbox = screen.getByRole("checkbox", { name: "Inventory HSMs" });
  expect(screen.getByText(/0 of 1 done/i)).toBeInTheDocument();

  fireEvent.click(checkbox);
  expect(screen.getByText(/1 of 1 done/i)).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: /Remove Inventory HSMs/i }),
  );
  expect(
    screen.queryByRole("checkbox", { name: "Inventory HSMs" }),
  ).not.toBeInTheDocument();
});

test("picking a POC writes responsiblePocId and clears responsibility", () => {
  const onUpdatePlanField = jest.fn();
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2, responsibility: "Some team" } },
  };
  renderView({ actionPlans, pocs, onUpdatePlanField });
  fireEvent.click(getCardHeader(/Cat One/, false));

  fireEvent.change(
    screen.getByRole("combobox", { name: /Responsibility for Cat One/i }),
    {
      target: { value: "poc-1" },
    },
  );
  expect(onUpdatePlanField).toHaveBeenCalledWith(
    "G.c1",
    "responsiblePocId",
    "poc-1",
  );
  expect(onUpdatePlanField).toHaveBeenCalledWith(
    "G.c1",
    "responsibility",
    undefined,
  );
});

test("choosing Custom reveals a text field that writes responsibility", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 } },
  };
  render(<Harness initial={actionPlans} />);
  fireEvent.click(getCardHeader(/Cat One/, false));

  fireEvent.change(
    screen.getByRole("combobox", { name: /Responsibility for Cat One/i }),
    {
      target: { value: "__custom__" },
    },
  );

  const customField = screen.getByLabelText(
    /Custom responsibility for Cat One/i,
  );
  fireEvent.change(customField, { target: { value: "Security team" } });
  expect(customField).toHaveValue("Security team");
});

test("choosing none clears both responsiblePocId and responsibility", () => {
  const onUpdatePlanField = jest.fn();
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2, responsiblePocId: "poc-1" } },
  };
  renderView({ actionPlans, pocs, onUpdatePlanField });
  fireEvent.click(getCardHeader(/Cat One/, false));

  fireEvent.change(
    screen.getByRole("combobox", { name: /Responsibility for Cat One/i }),
    {
      target: { value: "" },
    },
  );
  expect(onUpdatePlanField).toHaveBeenCalledWith(
    "G.c1",
    "responsiblePocId",
    undefined,
  );
  expect(onUpdatePlanField).toHaveBeenCalledWith(
    "G.c1",
    "responsibility",
    undefined,
  );
});

test("no POCs reveals a plain responsibility text field directly", () => {
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 } },
  };
  renderView({ actionPlans, pocs: [] });
  fireEvent.click(getCardHeader(/Cat One/, false));
  expect(
    screen.queryByRole("combobox", { name: /Responsibility for Cat One/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByLabelText(/Responsibility for Cat One/i),
  ).toBeInTheDocument();
});

test("target date writes targetDate", () => {
  const onUpdatePlanField = jest.fn();
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 } },
  };
  renderView({ actionPlans, onUpdatePlanField });
  fireEvent.click(getCardHeader(/Cat One/, false));

  fireEvent.change(screen.getByLabelText("Target date"), {
    target: { value: "2026-08-01" },
  });
  expect(onUpdatePlanField).toHaveBeenCalledWith(
    "G.c1",
    "targetDate",
    "2026-08-01",
  );
});

test("remove plan fires onRemovePlan", () => {
  const onRemovePlan = jest.fn();
  const actionPlans: ActionPlans = {
    categories: { "G.c1": { targetLevel: 2 } },
  };
  renderView({ actionPlans, onRemovePlan });
  fireEvent.click(
    screen.getByRole("button", { name: /Remove plan for Cat One/i }),
  );
  expect(onRemovePlan).toHaveBeenCalledWith("G.c1");
});

test("Expand all / Collapse all toggles every plan", () => {
  const actionPlans: ActionPlans = {
    categories: {
      "G.c1": { targetLevel: 2 },
      "G.c2": { targetLevel: 3 },
    },
  };
  render(<Harness initial={actionPlans} />);
  fireEvent.click(screen.getByRole("button", { name: /^expand all$/i }));
  expect(getCardHeader(/Cat One/, true)).toBeInTheDocument();
  expect(getCardHeader(/Cat Two/, true)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /^collapse all$/i }));
  expect(getCardHeader(/Cat One/, false)).toBeInTheDocument();
  expect(getCardHeader(/Cat Two/, false)).toBeInTheDocument();
});

test("shows a note (and no picker) when every in-scope category is already planned", () => {
  renderView({
    actionPlans: {
      categories: { "G.c1": { targetLevel: 2 }, "G.c2": { targetLevel: 3 } },
    },
  });
  expect(screen.getByText(/already have an action plan/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/add a plan for/i)).not.toBeInTheDocument();
});

test("renders with no axe violations (empty, collapsed, expanded)", async () => {
  const { container: empty } = renderView();
  expect(await axe(empty)).toHaveNoViolations();

  const actionPlans: ActionPlans = {
    categories: {
      "G.c1": {
        targetLevel: 3,
        objectives: [{ id: "o1", text: "Formalize ceremonies" }],
        outputs: [{ id: "out1", text: "Runbook" }],
        tasks: [{ itemId: "t1", label: "Inventory HSMs", done: false }],
        responsiblePocId: "poc-1",
        targetDate: "2026-08-01",
        resources: "Two engineers",
        comments: "On track",
      },
    },
  };
  const { container: collapsed } = renderView({ actionPlans, pocs });
  expect(await axe(collapsed)).toHaveNoViolations();

  fireEvent.click(
    within(collapsed).getByRole("button", {
      name: /Cat One/,
      expanded: false,
    }),
  );
  expect(await axe(collapsed)).toHaveNoViolations();
});
