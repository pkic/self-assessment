import { renderHook, waitFor, act } from "@testing-library/react";
import { useDurability } from "./useDurability";

jest.mock("../../../utils/durability", () => ({
  getPersisted: jest.fn(() => Promise.resolve(true)),
  getStorageEstimate: jest.fn(() => Promise.resolve({ usage: 1, quota: 100 })),
}));

const getLastExportAt = jest.fn(() => Promise.resolve("2026-01-01T00:00:00Z"));

jest.mock("../../../utils/storageAdapter", () => ({
  getStorageAdapter: jest.fn(() =>
    Promise.resolve({
      getLastExportAt: (...args: unknown[]) =>
        (getLastExportAt as (...a: unknown[]) => Promise<string>)(...args),
    }),
  ),
}));

describe("useDurability", () => {
  beforeEach(() => {
    getLastExportAt.mockClear();
  });

  it("populates persisted, storageEstimate, and activeLastExportAt for an active assessment", async () => {
    const { result } = renderHook(() =>
      useDurability({ activeId: "a1", lastSavedAt: null }),
    );

    await waitFor(() => expect(result.current.persisted).toBe(true));

    expect(result.current.storageEstimate).toEqual({ usage: 1, quota: 100 });
    await waitFor(() =>
      expect(result.current.activeLastExportAt).toBe("2026-01-01T00:00:00Z"),
    );
    expect(getLastExportAt).toHaveBeenCalledWith("a1");
  });

  it("does not populate activeLastExportAt when there is no active id", async () => {
    const { result } = renderHook(() =>
      useDurability({ activeId: undefined, lastSavedAt: null }),
    );

    await waitFor(() => expect(result.current.persisted).toBe(true));

    expect(result.current.activeLastExportAt).toBeNull();
    expect(getLastExportAt).not.toHaveBeenCalled();
  });

  it("exposes setActiveLastExportAt for callers like handleManagerDownload", async () => {
    const { result } = renderHook(() =>
      useDurability({ activeId: "a1", lastSavedAt: null }),
    );

    await waitFor(() =>
      expect(result.current.activeLastExportAt).toBe("2026-01-01T00:00:00Z"),
    );

    act(() => {
      result.current.setActiveLastExportAt("2026-07-06T00:00:00Z");
    });

    await waitFor(() =>
      expect(result.current.activeLastExportAt).toBe("2026-07-06T00:00:00Z"),
    );
  });
});
