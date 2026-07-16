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

// The popover is anchored to its trigger, which can sit near either viewport
// edge. These tests drive the on-open collision nudge by simulating the
// measured geometry (jsdom returns zero rects otherwise).
const mockListRect = (rect: Partial<DOMRect>, clientWidth: number) => {
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: clientWidth,
    configurable: true,
  });
  const orig = Element.prototype.getBoundingClientRect;
  jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: HTMLElement) {
      if (this.classList?.contains("pkimm-menu__list")) {
        return {
          width: 202,
          height: 40,
          top: 100,
          bottom: 140,
          ...rect,
        } as DOMRect;
      }
      return orig.call(this);
    });
};

afterEach(() => jest.restoreAllMocks());

test("a popover overflowing the left edge is nudged fully on-screen", () => {
  // Trigger near the left edge: right-anchored list runs off the left (left<0).
  mockListRect({ left: -112, right: 90 }, 430);
  render(<Menu label="More actions" items={items(spies())} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  // shift = gutter(8) - left(-112) = 120 → brings left to 8.
  expect(screen.getByRole("menu").style.transform).toBe("translateX(120px)");
});

test("a popover overflowing the right edge is nudged fully on-screen", () => {
  mockListRect({ left: 300, right: 502 }, 430);
  render(<Menu label="More actions" items={items(spies())} align="start" />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  // shift = (vw - gutter) - right = (430 - 8) - 502 = -80 → pulls it left.
  expect(screen.getByRole("menu").style.transform).toBe("translateX(-80px)");
});

test("a popover already on-screen gets no transform", () => {
  mockListRect({ left: 52, right: 254 }, 430);
  render(<Menu label="More actions" items={items(spies())} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  expect(screen.getByRole("menu").style.transform).toBe("");
});
