import { buildTimeline } from "./timeline";

describe("buildTimeline", () => {
  it("returns only set dates and computes duration when start+finish set", () => {
    const t = buildTimeline({
      startDate: "2026-01-01",
      targetDate: "",
      finishDate: "2026-01-11",
    });
    expect(t.hasAnyDate).toBe(true);
    expect(t.rows).toEqual([
      { label: "Started", value: "2026-01-01" },
      { label: "Completed", value: "2026-01-11" },
    ]);
    expect(t.durationDays).toBe(10);
  });
  it("includes target and no duration when finish missing", () => {
    const t = buildTimeline({
      startDate: "2026-01-01",
      targetDate: "2026-03-01",
      finishDate: "",
    });
    expect(t.rows.map((r) => r.label)).toEqual([
      "Started",
      "Target completion",
    ]);
    expect(t.durationDays).toBeNull();
  });
  it("hasAnyDate false + empty rows when no dates", () => {
    const t = buildTimeline({ startDate: "", targetDate: "", finishDate: "" });
    expect(t.hasAnyDate).toBe(false);
    expect(t.rows).toEqual([]);
    expect(t.durationDays).toBeNull();
  });
  it("ignores an invalid date (no duration, no row)", () => {
    const t = buildTimeline({
      startDate: "2026-13-40",
      targetDate: "",
      finishDate: "2026-01-11",
    });
    expect(t.rows).toEqual([{ label: "Completed", value: "2026-01-11" }]);
    expect(t.durationDays).toBeNull();
  });
});
