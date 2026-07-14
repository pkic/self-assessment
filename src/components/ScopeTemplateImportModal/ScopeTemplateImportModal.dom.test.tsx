import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ScopeTemplateImportModal } from "./ScopeTemplateImportModal";
import type {
  ScopeTemplateFile,
  TemplateCompatibility,
} from "../../utils/scopeTemplateFile";

expect.extend(toHaveNoViolations);

const file: ScopeTemplateFile = {
  kind: "pkimm-scope-template",
  formatVersion: 1,
  dataVersion: "1.0.0",
  name: "Retail scope",
  outOfScopeCategoryKeys: ["G.c2"],
  outOfScopeRequirementKeys: ["G.c1.r1"],
};
const mismatch: TemplateCompatibility = {
  versionMatch: false,
  matchedCategories: 0,
  unmatchedCategories: 1,
  matchedRequirements: 0,
  unmatchedRequirements: 1,
};

test("renders name, version line, and match/skip counts; wires confirm/cancel", () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <ScopeTemplateImportModal
      file={file}
      compatibility={mismatch}
      modelVersion="2.0.0"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  expect(screen.getByText("Retail scope")).toBeInTheDocument();
  // Assert the full version line, not two loose version matches.
  expect(
    screen.getByText(/Made for model 1\.0\.0.*you're on 2\.0\.0/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Made for model 1\.0\.0.*you're on 2\.0\.0/).className,
  ).toContain("pkimm-scope-import__version--warn");
  fireEvent.click(screen.getByRole("button", { name: /add to templates/i }));
  expect(onConfirm).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
  expect(onClose).toHaveBeenCalled();
});

test("no axe violations", async () => {
  const { container } = render(
    <ScopeTemplateImportModal
      file={file}
      compatibility={mismatch}
      modelVersion="2.0.0"
      onConfirm={jest.fn()}
      onClose={jest.fn()}
    />,
  );
  expect(await axe(container)).toHaveNoViolations();
});
