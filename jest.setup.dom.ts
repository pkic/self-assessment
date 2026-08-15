import "@testing-library/jest-dom";
import "jest-axe/extend-expect";
import { TextDecoder, TextEncoder } from "node:util";
import { deserialize, serialize } from "node:v8";
import { webcrypto } from "node:crypto";

if (globalThis.TextEncoder === undefined) {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (globalThis.TextDecoder === undefined) {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
if (globalThis.structuredClone === undefined) {
  globalThis.structuredClone = ((value: unknown) =>
    deserialize(serialize(value))) as typeof globalThis.structuredClone;
}
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
  });
}

// jsdom has no ResizeObserver; provide a no-op stub so components/hooks that
// observe element size can mount under test.
if (globalThis.ResizeObserver === undefined) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
