import React from "react";
import { render, act } from "@testing-library/react";
import { useTabScroll } from "./useTabScroll";

const setMetrics = (
  el: HTMLElement,
  left: number,
  client: number,
  scroll: number,
) => {
  Object.defineProperty(el, "scrollLeft", {
    value: left,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(el, "clientWidth", {
    value: client,
    configurable: true,
  });
  Object.defineProperty(el, "scrollWidth", {
    value: scroll,
    configurable: true,
  });
};

let api: ReturnType<typeof useTabScroll> | undefined;
const getApi = () => {
  if (!api) throw new Error("hook not mounted");
  return api;
};
const Probe: React.FC = () => {
  const hook = useTabScroll();
  api = hook;
  return <nav ref={hook.ref} />;
};

describe("useTabScroll", () => {
  it("derives canScrollLeft/Right from scroll position on scroll", () => {
    const { container } = render(<Probe />);
    const nav = container.querySelector("nav")!;
    // start: at left edge, overflowing
    setMetrics(nav, 0, 200, 500);
    act(() => {
      nav.dispatchEvent(new Event("scroll"));
    });
    expect(getApi().canScrollLeft).toBe(false);
    expect(getApi().canScrollRight).toBe(true);
    // middle
    setMetrics(nav, 150, 200, 500);
    act(() => {
      nav.dispatchEvent(new Event("scroll"));
    });
    expect(getApi().canScrollLeft).toBe(true);
    expect(getApi().canScrollRight).toBe(true);
    // end
    setMetrics(nav, 300, 200, 500);
    act(() => {
      nav.dispatchEvent(new Event("scroll"));
    });
    expect(getApi().canScrollLeft).toBe(true);
    expect(getApi().canScrollRight).toBe(false);
  });

  it("scrollByChunk moves scrollLeft by ~0.8*clientWidth", () => {
    const { container } = render(<Probe />);
    const nav = container.querySelector("nav")!;
    setMetrics(nav, 0, 200, 500);
    act(() => {
      getApi().scrollByChunk(1);
    });
    // 0 + 1 * 200 * 0.8 = 160, clamped to maxScroll (500-200=300) → 160
    expect(nav.scrollLeft).toBe(160);
  });

  it("scrollActiveIntoView only sets scrollLeft (never calls scrollIntoView)", () => {
    const { container } = render(<Probe />);
    const nav = container.querySelector("nav")!;
    setMetrics(nav, 0, 200, 500);
    const btn = document.createElement("button");
    Object.defineProperty(btn, "offsetLeft", {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(btn, "offsetWidth", {
      value: 80,
      configurable: true,
    });
    const spy = jest.fn();
    btn.scrollIntoView = spy;
    act(() => {
      getApi().scrollActiveIntoView(btn);
    });
    expect(spy).not.toHaveBeenCalled();
    // right = 400 + 80 = 480; viewRight = 0 + 200 = 200; 480 > 200 →
    // scrollLeft = right - clientWidth + 16 = 480 - 200 + 16 = 296
    expect(nav.scrollLeft).toBe(296);
  });
});
