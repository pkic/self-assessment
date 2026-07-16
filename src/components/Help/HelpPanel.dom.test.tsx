import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { HelpProvider, useHelp } from "./HelpProvider";
import type { HelpContext } from "./helpTopics";

expect.extend(toHaveNoViolations);

const ctx = (over: Partial<HelpContext> = {}): HelpContext => ({
  tab: "G",
  view: "full",
  target: "original",
  moduleIds: ["G"],
  ...over,
});
const Opener: React.FC<{ topic?: undefined; section?: string }> = ({
  section,
}) => {
  const { openHelp } = useHelp();
  return <button onClick={() => openHelp(undefined, section)}>open</button>;
};
const setup = (c: HelpContext) =>
  render(
    <HelpProvider helpContext={c}>
      <Opener />
    </HelpProvider>,
  );

test("opens to the context-resolved topic (rating for a module tab)", () => {
  setup(ctx());
  fireEvent.click(screen.getByText("open"));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Rating a requirement")).toBeInTheDocument();
});

test("extension target resolves to extension-rating", () => {
  setup(ctx({ target: "extension" }));
  fireEvent.click(screen.getByText("open"));
  expect(screen.getByText("Rating an extension category")).toBeInTheDocument();
});

test("Self and Full render different bodies", () => {
  setup(ctx({ view: "self" }));
  fireEvent.click(screen.getByText("open"));
  expect(screen.getByText(/no evidence required/i)).toBeInTheDocument();
});

test("breadcrumb shows the module name when moduleLabels is provided", () => {
  setup(ctx({ moduleLabels: { G: "Governance" } }));
  fireEvent.click(screen.getByText("open"));
  expect(screen.getByText("Help › Governance")).toBeInTheDocument();
});

test("breadcrumb falls back to the module id when no label is provided", () => {
  setup(ctx());
  fireEvent.click(screen.getByText("open"));
  expect(screen.getByText("Help › Module G")).toBeInTheDocument();
});

test("view-aware TOC omits full-only topics in Self", () => {
  setup(ctx({ view: "self", tab: "overview" }));
  fireEvent.click(screen.getByText("open"));
  expect(
    screen.queryByRole("button", { name: /choosing what's in scope/i }),
  ).toBeNull();
});

test("no axe violations", async () => {
  const { container } = setup(ctx());
  fireEvent.click(screen.getByText("open"));
  expect(await axe(container)).toHaveNoViolations();
});
