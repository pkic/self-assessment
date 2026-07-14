import { useCallback, useEffect, useRef, useState } from "react";

interface TabScroll {
  // React 19: useRef<HTMLElement>(null) is typed RefObject<HTMLElement | null>.
  ref: React.RefObject<HTMLElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollByChunk: (dir: -1 | 1) => void;
  scrollActiveIntoView: (activeEl: HTMLElement | null) => void;
}

export const useTabScroll = (): TabScroll => {
  const ref = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const recompute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    recompute();
    el.addEventListener("scroll", recompute, { passive: true });
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(recompute);
      ro.observe(el);
    } else {
      window.addEventListener("resize", recompute);
    }
    return () => {
      el.removeEventListener("scroll", recompute);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  // MANDATED: assign el.scrollLeft directly (NOT scrollBy/scrollTo). jsdom's
  // scrollBy/scrollTo are no-ops that never update scrollLeft, so the tests —
  // and any headless environment — must drive the property itself. Clamp to
  // [0, maxScroll] and call recompute() so canScrollLeft/Right update without
  // relying on a synthetic scroll event.
  const scrollByChunk = useCallback(
    (dir: -1 | 1) => {
      const el = ref.current;
      if (!el) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const next = el.scrollLeft + dir * el.clientWidth * 0.8;
      el.scrollLeft = Math.max(0, Math.min(maxScroll, next));
      recompute();
    },
    [recompute],
  );

  const scrollActiveIntoView = useCallback(
    (activeEl: HTMLElement | null) => {
      const el = ref.current;
      if (!el || !activeEl) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const left = activeEl.offsetLeft;
      const right = left + activeEl.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      let next: number | undefined;
      if (left < viewLeft) {
        next = left - 16;
      } else if (right > viewRight) {
        next = right - el.clientWidth + 16;
      }
      if (next === undefined) return;
      el.scrollLeft = Math.max(0, Math.min(maxScroll, next));
      recompute();
    },
    [recompute],
  );

  return {
    ref,
    canScrollLeft,
    canScrollRight,
    scrollByChunk,
    scrollActiveIntoView,
  };
};
