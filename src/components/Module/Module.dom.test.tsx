import React from "react";
import { render, screen } from "@testing-library/react";
import { Module } from "./Module";
import { AssessmentTargetProvider } from "../../contexts/AssessmentTargetContext";
import type { ModuleData } from "../../types/types";

const moduleData: ModuleData = {
  id: "G",
  name: "Governance",
  description: "Module description",
  categories: [
    {
      id: "c1",
      weight: 1,
      name: "Strategy",
      description: "",
      levels: [],
      requirements: [],
    },
  ],
};

const noop = () => {};

const renderModule = (view?: "self" | "full") =>
  render(
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={[moduleData]}
      progress={{}}
      requirementProgress={{}}
      enabledExtensions={[]}
    >
      <Module
        module={moduleData}
        view={view}
        progress={{}}
        onLevelChange={noop}
        onApplicabilityChange={noop}
      />
    </AssessmentTargetProvider>,
  );

test("full view shows a rating intro that points to Help and mentions requirements", () => {
  renderModule("full");
  expect(screen.getByText(/open Help/i)).toBeInTheDocument();
  expect(screen.getByText(/each requirement/i)).toBeInTheDocument();
});

test("self view shows a view-appropriate rating intro that also points to Help", () => {
  renderModule(undefined);
  expect(screen.getByText(/open Help/i)).toBeInTheDocument();
  expect(screen.getByText(/each category/i)).toBeInTheDocument();
});

test("rating intro renders once per module, not once per category", () => {
  const twoCategoryModule: ModuleData = {
    ...moduleData,
    categories: [
      { ...moduleData.categories[0], id: "c1" },
      { ...moduleData.categories[0], id: "c2", name: "Second" },
    ],
  };
  render(
    <AssessmentTargetProvider
      availableExtensions={[]}
      coreModules={[twoCategoryModule]}
      progress={{}}
      requirementProgress={{}}
      enabledExtensions={[]}
    >
      <Module
        module={twoCategoryModule}
        progress={{}}
        onLevelChange={noop}
        onApplicabilityChange={noop}
      />
    </AssessmentTargetProvider>,
  );
  expect(screen.getAllByText(/open Help/i)).toHaveLength(1);
});
