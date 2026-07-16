import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../IconButton/IconButton";
import "./Menu.module.scss";

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  onSelect: () => void;
}

export interface MenuProps {
  label: string;
  items: MenuItem[];
  align?: "start" | "end";
}

export const Menu: React.FC<MenuProps> = ({ label, items, align = "end" }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  // Keep the popover on-screen. It is anchored to the trigger, which can sit
  // near either viewport edge (e.g. when a toolbar wraps the ⋮ onto a new
  // line), so a static CSS anchor can overflow left or right. Measure after
  // open and nudge horizontally so the whole menu stays within the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const adjust = (): void => {
      list.style.transform = "";
      const rect = list.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // not laid out (jsdom)
      const gutter = 8;
      const vw = document.documentElement.clientWidth;
      let shift = 0;
      if (rect.left < gutter) shift = gutter - rect.left;
      else if (rect.right > vw - gutter) shift = vw - gutter - rect.right;
      if (shift !== 0)
        list.style.transform = `translateX(${Math.round(shift)}px)`;
    };
    adjust();
    window.addEventListener("resize", adjust);
    return () => window.removeEventListener("resize", adjust);
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const focusTrigger = (): void => {
    (
      rootRef.current?.querySelector(
        '[aria-haspopup="menu"]',
      ) as HTMLElement | null
    )?.focus();
  };

  const close = (refocus = true): void => {
    setOpen(false);
    if (refocus) focusTrigger();
  };

  const focusItem = (i: number): void => {
    const n = items.length;
    if (n === 0) return;
    itemRefs.current[((i % n) + n) % n]?.focus();
  };

  const onItemKeyDown = (e: React.KeyboardEvent, i: number): void => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(items.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div className="pkimm-menu" ref={rootRef}>
      <IconButton
        label={label}
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden="true" />
      </IconButton>
      {open && (
        <div
          ref={listRef}
          className={`pkimm-menu__list pkimm-menu__list--${align}`}
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`pkimm-menu__item${
                item.tone === "danger" ? " pkimm-menu__item--danger" : ""
              }`}
              onClick={() => {
                item.onSelect();
                close();
              }}
              onKeyDown={(e) => onItemKeyDown(e, i)}
            >
              {item.icon && (
                <span className="pkimm-menu__item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
