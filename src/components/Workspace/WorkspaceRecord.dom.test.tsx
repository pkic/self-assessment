import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { WorkspaceRecord } from "./WorkspaceRecord";

expect.extend(toHaveNoViolations);

const base = {
  recordKey: "poc:p-1",
  onToggle: jest.fn(),
  onRemove: jest.fn(),
  removeLabel: "Remove Jane Smith",
  summary: "Jane Smith",
};

// The remove IconButton's aria-label also contains the summary ("Remove Jane
// Smith"), so the disclosure is disambiguated by the `expanded` filter (only
// the disclosure carries aria-expanded); the remove button by its exact name.
test("collapsed: body is not rendered and aria-expanded is false", () => {
  render(
    <WorkspaceRecord {...base} open={false}>
      <input aria-label="Name" />
    </WorkspaceRecord>,
  );
  expect(
    screen.getByRole("button", { name: /Jane Smith/, expanded: false }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("open: body is rendered and aria-expanded is true", () => {
  render(
    <WorkspaceRecord {...base} open={true}>
      <input aria-label="Name" />
    </WorkspaceRecord>,
  );
  expect(
    screen.getByRole("button", { name: /Jane Smith/, expanded: true }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});

test("disclosure fires onToggle; remove fires onRemove", () => {
  const onToggle = jest.fn();
  const onRemove = jest.fn();
  render(
    <WorkspaceRecord
      {...base}
      open={false}
      onToggle={onToggle}
      onRemove={onRemove}
    >
      <div />
    </WorkspaceRecord>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Jane Smith/, expanded: false }),
  );
  expect(onToggle).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove Jane Smith" }));
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test("secondary text and the wrapper data-record-id are present", () => {
  const { container } = render(
    <WorkspaceRecord {...base} open={false} secondary="PKI operations lead">
      <div />
    </WorkspaceRecord>,
  );
  expect(
    screen.getByRole("button", {
      name: /Jane Smith · PKI operations lead/,
      expanded: false,
    }),
  ).toBeInTheDocument();
  expect(
    container.querySelector('[data-record-id="poc:p-1"]'),
  ).toBeInTheDocument();
});

test("muted applies the muted summary class", () => {
  const { container } = render(
    <WorkspaceRecord {...base} open={false} muted summary="Untitled contact">
      <div />
    </WorkspaceRecord>,
  );
  expect(
    container.querySelector(".pkimm-ws-record__summary--muted"),
  ).toBeInTheDocument();
});

test("no axe violations (collapsed and open)", async () => {
  const collapsed = render(
    <WorkspaceRecord {...base} open={false}>
      <div />
    </WorkspaceRecord>,
  );
  expect(await axe(collapsed.container)).toHaveNoViolations();
  collapsed.unmount();
  const open = render(
    <WorkspaceRecord {...base} open={true}>
      <input aria-label="Name" />
    </WorkspaceRecord>,
  );
  expect(await axe(open.container)).toHaveNoViolations();
});
