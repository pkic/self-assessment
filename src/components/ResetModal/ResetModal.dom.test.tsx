import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ResetModal } from "./ResetModal";

expect.extend(toHaveNoViolations);

test("confirm is disabled until a scope is checked, then fires selected scopes", () => {
  const onConfirm = jest.fn();
  render(<ResetModal open fullMode onClose={() => {}} onConfirm={onConfirm} />);
  const confirm = screen.getByRole("button", { name: /^Reset$/ });
  expect(confirm).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Ratings/i }));
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);
  expect(onConfirm).toHaveBeenCalledWith({
    ratings: true,
    actionPlans: false,
    workspace: false,
    reportDetails: false,
  });
});

test("full view offers all four scopes; Select all toggles every one; jest-axe clean", async () => {
  const onConfirm = jest.fn();
  const { container } = render(
    <ResetModal open fullMode onClose={() => {}} onConfirm={onConfirm} />,
  );
  expect(
    screen.getByRole("checkbox", { name: /Ratings/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: /Action plans/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: /Workspace/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: /Report details/i }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /Select all/i }));
  fireEvent.click(screen.getByRole("button", { name: /^Reset$/ }));
  expect(onConfirm).toHaveBeenCalledWith({
    ratings: true,
    actionPlans: true,
    workspace: true,
    reportDetails: true,
  });
  expect(await axe(container)).toHaveNoViolations();
});

test("self view offers only Ratings + Report details (no Action plans / Workspace)", () => {
  render(
    <ResetModal
      open
      fullMode={false}
      onClose={() => {}}
      onConfirm={() => {}}
    />,
  );
  expect(
    screen.getByRole("checkbox", { name: /Ratings/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: /Report details/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: /Action plans/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: /Workspace/i }),
  ).not.toBeInTheDocument();
});

test("self-view Select all sets only the two self-view scopes", () => {
  const onConfirm = jest.fn();
  render(
    <ResetModal
      open
      fullMode={false}
      onClose={() => {}}
      onConfirm={onConfirm}
    />,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /Select all/i }));
  fireEvent.click(screen.getByRole("button", { name: /^Reset$/ }));
  expect(onConfirm).toHaveBeenCalledWith({
    ratings: true,
    actionPlans: false,
    workspace: false,
    reportDetails: true,
  });
});

test("a full→self mode flip while open never submits the now-hidden scopes", () => {
  const onConfirm = jest.fn();
  const { rerender } = render(
    <ResetModal open fullMode onClose={() => {}} onConfirm={onConfirm} />,
  );
  // Select every scope while in full view (incl. the full-only ones).
  fireEvent.click(screen.getByRole("checkbox", { name: /Select all/i }));
  // The view flips to self while the dialog stays mounted.
  rerender(
    <ResetModal
      open
      fullMode={false}
      onClose={() => {}}
      onConfirm={onConfirm}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Reset$/ }));
  expect(onConfirm).toHaveBeenCalledWith({
    ratings: true,
    actionPlans: false,
    workspace: false,
    reportDetails: true,
  });
});

test("does not render when closed", () => {
  render(
    <ResetModal
      open={false}
      fullMode
      onClose={() => {}}
      onConfirm={() => {}}
    />,
  );
  expect(screen.queryByText(/Reset assessment/i)).not.toBeInTheDocument();
});
