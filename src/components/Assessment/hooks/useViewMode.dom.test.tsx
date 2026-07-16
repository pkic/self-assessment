import { renderHook, act } from "@testing-library/react";
import { useViewMode } from "./useViewMode";
import type { ModeCaps } from "../../../utils/modes";

const bothCaps: ModeCaps = { self: true, full: true, defaultView: "self" };

describe("useViewMode", () => {
  it("resolves to full when caps allow it, versions match, and lastView is full", () => {
    const persistView = jest.fn();
    const { result } = renderHook(() =>
      useViewMode({
        caps: bothCaps,
        lastView: "full",
        dataVersion: "2.0.0",
        modelVersion: "2.0.0",
        persistView,
      }),
    );

    expect(result.current.view).toBe("full");
    expect(result.current.fullAvailable).toBe(true);
    expect(result.current.fullDisabledReason).toBeNull();
  });

  it("clamps to self and disables full on a data/model version mismatch, and setView('full') is a no-op", () => {
    const persistView = jest.fn();
    const { result } = renderHook(() =>
      useViewMode({
        caps: bothCaps,
        lastView: "full",
        dataVersion: "1.0.0",
        modelVersion: "2.0.0",
        persistView,
      }),
    );

    expect(result.current.view).toBe("self");
    expect(result.current.fullAvailable).toBe(false);
    expect(result.current.fullDisabledReason).toEqual(expect.any(String));
    expect(result.current.fullDisabledReason).not.toBeNull();

    act(() => {
      result.current.setView("full");
    });

    expect(result.current.view).toBe("self");
    expect(persistView).not.toHaveBeenCalledWith("full");
  });

  it("reports fullAvailable false when caps.full is false, even with matching versions", () => {
    const selfOnlyCaps: ModeCaps = {
      self: true,
      full: false,
      defaultView: "self",
    };
    const persistView = jest.fn();
    const { result } = renderHook(() =>
      useViewMode({
        caps: selfOnlyCaps,
        lastView: undefined,
        dataVersion: "2.0.0",
        modelVersion: "2.0.0",
        persistView,
      }),
    );

    expect(result.current.fullAvailable).toBe(false);
    expect(result.current.view).toBe("self");
  });

  it("calls persistView('full') when setView('full') is used and full is available", () => {
    const persistView = jest.fn();
    const { result } = renderHook(() =>
      useViewMode({
        caps: bothCaps,
        lastView: "self",
        dataVersion: "2.0.0",
        modelVersion: "2.0.0",
        persistView,
      }),
    );

    act(() => {
      result.current.setView("full");
    });

    expect(persistView).toHaveBeenCalledWith("full");
  });

  it("falls back to caps.defaultView when lastView is undefined", () => {
    const persistView = jest.fn();
    const fullDefaultCaps: ModeCaps = {
      self: true,
      full: true,
      defaultView: "full",
    };
    const { result } = renderHook(() =>
      useViewMode({
        caps: fullDefaultCaps,
        lastView: undefined,
        dataVersion: "2.0.0",
        modelVersion: "2.0.0",
        persistView,
      }),
    );

    expect(result.current.view).toBe("full");
  });
});
