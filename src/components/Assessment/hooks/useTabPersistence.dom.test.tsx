import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

// jsdom does not implement structuredClone; the storage adapters use it to
// snapshot assessments/revisions. Node's own implementation is sufficient.
if (typeof globalThis.structuredClone === "undefined") {
  (globalThis as { structuredClone?: typeof structuredClone }).structuredClone =
    (value: unknown) => JSON.parse(JSON.stringify(value));
}
import { renderHook, act } from "@testing-library/react";
import type { Assessment, SavedState } from "../../../types/types";
import {
  getStorageAdapter,
  resetStorageAdapterForTests,
} from "../../../utils/storageAdapter";
import { useTabPersistence } from "./useTabPersistence";

const notify = jest.fn();
const close = jest.fn();
let externalChangeCb: (() => void) | null = null;
const createTabSync = jest.fn((cb: () => void) => {
  externalChangeCb = cb;
  return { notify, close };
});

jest.mock("../../../utils/tabSync", () => ({
  withWriteLock: (fn: () => unknown) => fn(),
  createTabSync: (cb: () => void) => createTabSync(cb),
}));

const makeAssessment = (
  id: string,
  name: string,
  updatedAt = "2026-07-05T10:00:00.000Z",
): Assessment => ({
  id,
  name,
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: name,
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: { createdAt: "2026-07-05T10:00:00.000Z", updatedAt },
});

const makeState = (
  assessments: Assessment[],
  activeId: string | null,
): SavedState => ({ stateSchemaVersion: 1, activeId, assessments });

const flushMicrotasks = async (): Promise<void> => {
  await act(async () => {
    for (let i = 0; i < 10; i++) {
      await jest.advanceTimersByTimeAsync(0);
    }
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  resetStorageAdapterForTests();
  (globalThis as { indexedDB?: IDBFactory }).indexedDB = new IDBFactory();
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => void (store[k] = v),
    removeItem: (k) => void delete store[k],
    key: () => null,
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    length: 0,
  } as Storage;
  notify.mockClear();
  close.mockClear();
  createTabSync.mockClear();
  externalChangeCb = null;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useTabPersistence", () => {
  it("debounces a write 300ms, toggles isSaving, and sets lastSavedAt", async () => {
    const savedState = makeState([makeAssessment("id-1", "One")], "id-1");
    const setSavedState = jest.fn();

    const { result, rerender } = renderHook(
      (props: { savedState: SavedState }) =>
        useTabPersistence({
          savedState: props.savedState,
          setSavedState,
          storageBackend: "indexeddb",
          forwardCompatFailure: null,
        }),
      { initialProps: { savedState } },
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();

    // No write yet — still pending on the 300ms debounce.
    const adapterBefore = await getStorageAdapter();
    expect(await adapterBefore.readSavedState()).toBeNull();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    rerender({ savedState });

    expect(result.current.lastSavedAt).not.toBeNull();
    expect(result.current.saveError).toBeNull();

    const adapter = await getStorageAdapter();
    const persisted = await adapter.readSavedState();
    expect(persisted?.activeId).toBe("id-1");
    expect(persisted?.assessments.map((a) => a.id)).toEqual(["id-1"]);
  });

  it("does not schedule a write for an empty savedState", async () => {
    const savedState = makeState([], null);
    const setSavedState = jest.fn();

    renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "indexeddb",
        forwardCompatFailure: null,
      }),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    const adapter = await getStorageAdapter();
    expect(await adapter.readSavedState()).toBeNull();
  });

  it("does not schedule a write when all assessments are transient", async () => {
    const savedState = makeState(
      [makeAssessment("transient-abc", "Shared")],
      "transient-abc",
    );
    const setSavedState = jest.fn();

    renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "indexeddb",
        forwardCompatFailure: null,
      }),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    const adapter = await getStorageAdapter();
    expect(await adapter.readSavedState()).toBeNull();
  });

  it("does not schedule a write when forwardCompatFailure is set", async () => {
    const savedState = makeState([makeAssessment("id-1", "One")], "id-1");
    const setSavedState = jest.fn();

    renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "indexeddb",
        forwardCompatFailure: "newer schema",
      }),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    const adapter = await getStorageAdapter();
    expect(await adapter.readSavedState()).toBeNull();
  });

  it("flushes immediately on visibilitychange:hidden without waiting for the debounce", async () => {
    const savedState = makeState([makeAssessment("id-2", "Two")], "id-2");
    const setSavedState = jest.fn();

    renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "indexeddb",
        forwardCompatFailure: null,
      }),
    );

    // Before any timer advance, force a hide event.
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flushMicrotasks();

    const adapter = await getStorageAdapter();
    const persisted = await adapter.readSavedState();
    expect(persisted?.assessments.map((a) => a.id)).toEqual(["id-2"]);
  });

  it("flushes immediately on pagehide", async () => {
    const savedState = makeState([makeAssessment("id-3", "Three")], "id-3");
    const setSavedState = jest.fn();

    renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "indexeddb",
        forwardCompatFailure: null,
      }),
    );

    await act(async () => {
      globalThis.dispatchEvent(new Event("pagehide"));
    });
    await flushMicrotasks();

    const adapter = await getStorageAdapter();
    const persisted = await adapter.readSavedState();
    expect(persisted?.assessments.map((a) => a.id)).toEqual(["id-3"]);
  });

  it("sets missedExternalRef via the external-change callback while dirty, then catches up on next flush", async () => {
    const savedState = makeState([makeAssessment("id-4", "Four")], "id-4");
    const setSavedState = jest.fn();

    const { rerender } = renderHook(
      (props: { savedState: SavedState }) =>
        useTabPersistence({
          savedState: props.savedState,
          setSavedState,
          storageBackend: "indexeddb",
          forwardCompatFailure: null,
        }),
      { initialProps: { savedState } },
    );

    // createTabSync was wired for indexeddb backend.
    expect(createTabSync).toHaveBeenCalledTimes(1);
    expect(externalChangeCb).not.toBeNull();

    // Simulate a newer external write landing in the adapter (as if another
    // tab wrote it), then fire the tab-sync callback while our write is
    // still pending (dirty) — this should only set missedExternalRef, not
    // read the adapter synchronously.
    const adapter = await getStorageAdapter();
    const externalNewer = makeState(
      [makeAssessment("id-4", "Four (external)", "2026-07-06T00:00:00.000Z")],
      "id-4",
    );

    await act(async () => {
      externalChangeCb?.();
    });
    // setSavedState should NOT have been called yet — pendingStateRef is
    // still dirty, so the callback only records missedExternalRef.
    expect(setSavedState).not.toHaveBeenCalled();

    // Now let the debounced write flush. Before it completes we push the
    // "external" newer record directly into the adapter to simulate the
    // other tab's write racing ours; after our flush completes, the
    // missed-external catch-up should re-read and call setSavedState.
    await adapter.writeSavedState(externalNewer);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    rerender({ savedState });

    expect(setSavedState).toHaveBeenCalled();
    const calls = setSavedState.mock.calls;
    const lastCallArg = calls[calls.length - 1][0] as SavedState;
    expect(lastCallArg.assessments.find((a) => a.id === "id-4")?.name).toBe(
      "Four (external)",
    );
  });

  it("does not wire tab-sync on the memory backend", () => {
    const savedState = makeState([makeAssessment("id-5", "Five")], "id-5");
    const setSavedState = jest.fn();

    renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "memory",
        forwardCompatFailure: null,
      }),
    );

    expect(createTabSync).not.toHaveBeenCalled();
  });

  it("sets saveError to 'quota' when the adapter write rejects with QuotaExceededError", async () => {
    const savedState = makeState([makeAssessment("id-6", "Six")], "id-6");
    const setSavedState = jest.fn();

    const adapter = await getStorageAdapter();
    const quotaError = new Error("quota exceeded");
    quotaError.name = "QuotaExceededError";
    const writeSpy = jest
      .spyOn(adapter, "writeSavedState")
      .mockRejectedValueOnce(quotaError);

    const { result, rerender } = renderHook(
      (props: { savedState: SavedState }) =>
        useTabPersistence({
          savedState: props.savedState,
          setSavedState,
          storageBackend: "indexeddb",
          forwardCompatFailure: null,
        }),
      { initialProps: { savedState } },
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    rerender({ savedState });

    expect(result.current.saveError).toBe("quota");
    expect(result.current.isSaving).toBe(false);
    writeSpy.mockRestore();
  });

  it("exposes notify() which calls tabSync.notify()", async () => {
    const savedState = makeState([makeAssessment("id-7", "Seven")], "id-7");
    const setSavedState = jest.fn();

    const { result } = renderHook(() =>
      useTabPersistence({
        savedState,
        setSavedState,
        storageBackend: "indexeddb",
        forwardCompatFailure: null,
      }),
    );

    act(() => {
      result.current.notify();
    });

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("exposes markDeleted(id) which is included as deleteIds on the next flush", async () => {
    const savedState = makeState(
      [makeAssessment("id-8", "Eight"), makeAssessment("id-9", "Nine")],
      "id-9",
    );
    const setSavedState = jest.fn();

    // Seed the adapter with both assessments so we can observe the delete.
    const adapter = await getStorageAdapter();
    await adapter.writeSavedState(savedState);

    const { result, rerender } = renderHook(
      (props: { savedState: SavedState }) =>
        useTabPersistence({
          savedState: props.savedState,
          setSavedState,
          storageBackend: "indexeddb",
          forwardCompatFailure: null,
        }),
      { initialProps: { savedState } },
    );

    act(() => {
      result.current.markDeleted("id-8");
    });

    const nextState = makeState([makeAssessment("id-9", "Nine")], "id-9");
    rerender({ savedState: nextState });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    const persisted = await adapter.readSavedState();
    expect(persisted?.assessments.map((a) => a.id)).toEqual(["id-9"]);
  });

  it("exposes unmarkDeleted(id) which reverses a still-pending markDeleted before the next flush", async () => {
    // Regression: v2 import preserves assessment.id. Deleting an
    // assessment and then, within the same debounce window, re-importing an
    // export with that SAME id must not be silently dropped. Without
    // unmarkDeleted, the queued deleteIds from markDeleted("id-8") would
    // still ride along on the next flush, and writeSavedState
    // unconditionally skips any incoming assessment whose id is in
    // deleteIds — even though the caller's in-memory savedState (passed to
    // rerender below) shows id-8 present again.
    const savedState = makeState(
      [makeAssessment("id-8", "Eight"), makeAssessment("id-9", "Nine")],
      "id-9",
    );
    const setSavedState = jest.fn();

    const adapter = await getStorageAdapter();
    await adapter.writeSavedState(savedState);

    const { result, rerender } = renderHook(
      (props: { savedState: SavedState }) =>
        useTabPersistence({
          savedState: props.savedState,
          setSavedState,
          storageBackend: "indexeddb",
          forwardCompatFailure: null,
        }),
      { initialProps: { savedState } },
    );

    // Delete id-8 (queues it), then immediately re-add it under the same id
    // (e.g. a v2 re-import) before the 300ms debounce has fired.
    act(() => {
      result.current.markDeleted("id-8");
      result.current.unmarkDeleted("id-8");
    });

    const reimported = makeAssessment("id-8", "Eight (reimported)");
    const nextState = makeState(
      [reimported, makeAssessment("id-9", "Nine")],
      "id-8",
    );
    rerender({ savedState: nextState });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await flushMicrotasks();

    const persisted = await adapter.readSavedState();
    expect(persisted?.assessments.map((a) => a.id).sort()).toEqual([
      "id-8",
      "id-9",
    ]);
    expect(persisted?.assessments.find((a) => a.id === "id-8")?.name).toBe(
      "Eight (reimported)",
    );
  });
});
