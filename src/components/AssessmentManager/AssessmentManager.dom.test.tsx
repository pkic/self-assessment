import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { AssessmentManager } from "./AssessmentManager";
import type { Assessment, ModuleData, SavedState } from "../../types/types";

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "strategy",
        name: "Strategy",
        description: "",
        weight: 5,
        levels: [{ number: 1, name: "Initial", description: "d1" }],
        requirements: [],
      },
    ],
  },
];

const mk = (id: string, over: Partial<Assessment> = {}): Assessment => ({
  id,
  name: `Assessment ${id}`,
  dataVersion: "2.0.0",
  progress: {
    "G.strategy": {
      level: 1,
      result: "",
      description: "",
      applicability: true,
    },
  },
  enabledExtensions: [],
  assessmentName: `Assessment ${id}`,
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  ...over,
});

const baseProps = (
  over: Partial<React.ComponentProps<typeof AssessmentManager>> = {},
) => {
  const state: SavedState = {
    stateSchemaVersion: 1,
    activeId: "a1",
    assessments: [mk("a1"), mk("a2", { dataVersion: "1.0.0" })],
  };
  return {
    state,
    loadedDataVersion: "2.0.0",
    data: { version: "2.0.0", modules } as never,
    extensionsData: [],
    onSelect: jest.fn(),
    onCreateNew: jest.fn(),
    onRename: jest.fn(),
    onDuplicate: jest.fn(),
    onDelete: jest.fn(),
    onDownload: jest.fn(),
    onUpload: jest.fn(),
    hasLegacyData: false,
    onListRevisions: jest.fn(async () => []),
    onRestoreRevision: jest.fn(async () => {}),
    storageEstimate: null,
    ...over,
  };
};

test("renders one list item per assessment (valid list semantics)", () => {
  render(<AssessmentManager {...baseProps()} />);
  const list = screen.getByRole("list");
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
});

test("Open fires onSelect and is disabled on the active card", () => {
  const onSelect = jest.fn();
  render(<AssessmentManager {...baseProps({ onSelect })} />);
  const cards = screen.getAllByRole("article");
  const activeOpen = within(cards[0]).getByRole("button", { name: /Open/i });
  expect(activeOpen).toBeDisabled();
  fireEvent.click(within(cards[1]).getByRole("button", { name: /Open/i }));
  expect(onSelect).toHaveBeenCalledWith("a2");
});

test("a scorable card shows a maturity level + 'N of M assessed'", () => {
  render(<AssessmentManager {...baseProps()} />);
  const cards = screen.getAllByRole("article");
  expect(within(cards[0]).getByText(/of .* assessed/i)).toBeInTheDocument();
});

test("an incompatible-version card shows 'Migrate to score'", () => {
  render(<AssessmentManager {...baseProps()} />);
  const cards = screen.getAllByRole("article");
  expect(within(cards[1]).getByText(/Migrate to score/i)).toBeInTheDocument();
});

test("the ⋮ menu exposes Rename/Duplicate/Download/History/Delete and Delete confirms", () => {
  const onDelete = jest.fn();
  jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<AssessmentManager {...baseProps({ onDelete })} />);
  const cards = screen.getAllByRole("article");
  fireEvent.click(
    within(cards[1]).getByRole("button", { name: /More actions/i }),
  );
  ["Rename", "Duplicate", "Download", "History", "Delete"].forEach((n) =>
    expect(
      screen.getByRole("menuitem", { name: new RegExp(n, "i") }),
    ).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }));
  expect(onDelete).toHaveBeenCalledWith("a2");
  (window.confirm as jest.Mock).mockRestore();
});

test("empty state when no assessments", () => {
  render(
    <AssessmentManager
      {...baseProps({
        state: { stateSchemaVersion: 1, activeId: null, assessments: [] },
      })}
    />,
  );
  expect(screen.getByText(/No assessments saved/i)).toBeInTheDocument();
});

test("no accessibility violations", async () => {
  const { container } = render(<AssessmentManager {...baseProps()} />);
  expect(await axe(container)).toHaveNoViolations();
});
