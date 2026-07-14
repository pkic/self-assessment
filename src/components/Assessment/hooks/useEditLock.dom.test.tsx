import { renderHook, waitFor, act } from "@testing-library/react";
import { useEditLock } from "./useEditLock";

const acquireEditLock = jest.fn();

jest.mock("../../../utils/tabSync", () => ({
  acquireEditLock: (...args: unknown[]) =>
    (acquireEditLock as (...a: unknown[]) => Promise<unknown>)(...args),
}));

describe("useEditLock", () => {
  beforeEach(() => {
    acquireEditLock.mockReset();
  });

  it("acquires the edit lock for a non-transient active id on indexeddb and stays unlocked when granted", async () => {
    const handle = { release: jest.fn() };
    acquireEditLock.mockResolvedValue(handle);

    const { result } = renderHook(() =>
      useEditLock({
        activeId: "a1",
        storageBackend: "indexeddb",
      }),
    );

    await waitFor(() =>
      expect(result.current.activeLockedByOtherTab).toBe(false),
    );
    expect(acquireEditLock).toHaveBeenCalledWith("a1");
  });

  it("marks activeLockedByOtherTab true when acquireEditLock resolves null (contended)", async () => {
    acquireEditLock.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useEditLock({
        activeId: "a2",
        storageBackend: "indexeddb",
      }),
    );

    await waitFor(() =>
      expect(result.current.activeLockedByOtherTab).toBe(true),
    );
  });

  it("withRowLock awaits fn while holding the lock and releases only after fn completes", async () => {
    const handle = { release: jest.fn() };
    // First call is for the E5 mount effect on a different id than the
    // row being locked; second call is the withRowLock acquisition.
    acquireEditLock.mockResolvedValue(handle);

    const { result } = renderHook(() =>
      useEditLock({
        activeId: "active-id",
        storageBackend: "indexeddb",
      }),
    );

    await waitFor(() =>
      expect(result.current.activeLockedByOtherTab).toBe(false),
    );

    const order: string[] = [];
    let resolveFn: () => void = () => {};
    const fn = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = () => {
            order.push("fn");
            resolve();
          };
        }),
    );

    let lockPromise: Promise<void> = Promise.resolve();
    act(() => {
      lockPromise = result.current.withRowLock("other-row-id", fn);
    });

    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(handle.release).not.toHaveBeenCalled();

    resolveFn();
    await act(async () => {
      await lockPromise;
    });

    expect(order).toEqual(["fn"]);
    expect(handle.release).toHaveBeenCalledTimes(1);
  });

  it("does not acquire a lock on memory backend and stays unlocked", async () => {
    const { result } = renderHook(() =>
      useEditLock({
        activeId: "a3",
        storageBackend: "memory",
      }),
    );

    await waitFor(() => {
      expect(result.current.activeLockedByOtherTab).toBe(false);
    });
    expect(acquireEditLock).not.toHaveBeenCalled();
  });
});
