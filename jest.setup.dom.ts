import "@testing-library/jest-dom";
import "jest-axe/extend-expect";

// jsdom has no ResizeObserver; provide a no-op stub so components/hooks that
// observe element size can mount under test.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
