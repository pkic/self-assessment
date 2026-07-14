import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Menu, MenuItem } from "./Menu";

const items = (spies: Record<string, jest.Mock>): MenuItem[] => [
  { id: "rename", label: "Rename", onSelect: spies.rename },
  { id: "delete", label: "Delete", tone: "danger", onSelect: spies.del },
];

const spies = () => ({ rename: jest.fn(), del: jest.fn() });

test("menu is closed initially; trigger has aria-haspopup and collapsed state", () => {
  render(<Menu label="More actions" items={items(spies())} />);
  const trigger = screen.getByRole("button", { name: "More actions" });
  expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("clicking the trigger opens the menu and focuses the first item", () => {
  render(<Menu label="More actions" items={items(spies())} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  expect(screen.getByRole("menu")).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
});

test("selecting an item fires its onSelect and closes the menu", () => {
  const s = spies();
  render(<Menu label="More actions" items={items(s)} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
  expect(s.rename).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("Escape closes the menu and returns focus to the trigger", () => {
  render(<Menu label="More actions" items={items(spies())} />);
  const trigger = screen.getByRole("button", { name: "More actions" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("menuitem", { name: "Rename" }), {
    key: "Escape",
  });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("ArrowDown moves focus to the next item; ArrowUp wraps to the last", () => {
  render(<Menu label="More actions" items={items(spies())} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  const rename = screen.getByRole("menuitem", { name: "Rename" });
  fireEvent.keyDown(rename, { key: "ArrowDown" });
  expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("menuitem", { name: "Delete" }), {
    key: "ArrowUp",
  });
  expect(rename).toHaveFocus();
});

test("a danger item carries the danger class", () => {
  render(<Menu label="More actions" items={items(spies())} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  expect(screen.getByRole("menuitem", { name: "Delete" }).className).toContain(
    "pkimm-menu__item--danger",
  );
});

test("no accessibility violations (open)", async () => {
  const { container } = render(
    <Menu label="More actions" items={items(spies())} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  expect(await axe(container)).toHaveNoViolations();
});
