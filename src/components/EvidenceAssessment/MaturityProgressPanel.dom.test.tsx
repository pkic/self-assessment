import React from "react";
import { render, screen } from "@testing-library/react";
import { MaturityProgressPanel } from "./MaturityProgressPanel";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";

const score: GatedMaturityScore = {
  achievedLevel: 0,
  nextLevel: 1,
  criteriaMet: 1,
  criteriaTotal: 4,
  questionsAnswered: 0,
  questionsTotal: 0,
  questionFindingCounts: {},
  evidenceFiles: 0,
  levelResults: [
    { level: 0, met: true, criteriaMet: 1, criteriaTotal: 1, blockers: [] },
    {
      level: 1,
      met: false,
      criteriaMet: 0,
      criteriaTotal: 3,
      blockers: [
        "1.1.1: not-assessed",
        "1.1.2: evidence is required",
        "1.1.3: partial",
      ],
    },
  ],
};

describe("MaturityProgressPanel", () => {
  it("lists outstanding criteria by position and only explains actionable reasons", () => {
    render(
      <MaturityProgressPanel
        levels={[
          { number: 0, name: "None" },
          { number: 1, name: "Initial" },
        ]}
        score={score}
        criterionText={
          new Map([
            ["1.1.1", "First criterion"],
            ["1.1.2", "Second criterion"],
            ["1.1.3", "Third criterion"],
          ])
        }
        statuses={[
          { value: "not-assessed", label: "Not assessed" },
          { value: "partial", label: "Partial" },
        ]}
        findings={[]}
        scoringRule="Cumulative."
        selectedLevel={0}
        onSelectLevel={() => undefined}
      />,
    );
    expect(screen.getByLabelText("Criterion 1.1.2")).toHaveTextContent("2");
    expect(screen.queryByText("Not assessed")).not.toBeInTheDocument();
    expect(screen.getByText("Evidence is required")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
  });
});
