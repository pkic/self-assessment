import { renderHook, act } from "@testing-library/react";
import { useChartCapture } from "./useChartCapture";

describe("useChartCapture", () => {
  it("defaults to no override and animation enabled", () => {
    const { result } = renderHook(() => useChartCapture());
    expect(result.current.chartExtensionsOverride).toBeNull();
    expect(result.current.chartAnimate).toBe(true);
    expect(result.current.chartRef.current).toBeNull();
  });
  it("beginCapture sets the override and disables animation; endCapture restores", () => {
    const { result } = renderHook(() => useChartCapture());
    act(() => result.current.beginCapture(["pqc"]));
    expect(result.current.chartExtensionsOverride).toEqual(["pqc"]);
    expect(result.current.chartAnimate).toBe(false);
    act(() => result.current.endCapture());
    expect(result.current.chartExtensionsOverride).toBeNull();
    expect(result.current.chartAnimate).toBe(true);
  });
  it("beginCapture([]) forces the no-extension baseline chart with animation off (core PDF path)", () => {
    const { result } = renderHook(() => useChartCapture());
    act(() => result.current.beginCapture([]));
    expect(result.current.chartExtensionsOverride).toEqual([]); // [] not null — render treats them differently
    expect(result.current.chartAnimate).toBe(false);
  });
});
