import { stackSegments, ringArc } from "./chartGeometry";

describe("stackSegments", () => {
  it("splits a row into pct segments summing to ~100 (skips zero counts)", () => {
    const segs = stackSegments({
      notApplicable: 1,
      notAssessed: 1,
      levels: [2, 0, 0, 0, 0],
      totalApplicable: 2,
    });
    // total = 1+1+2 = 4 → NA 25, NotAssessed 25, L1 50
    expect(segs.map((s) => s.pct)).toEqual([25, 25, 50]);
    expect(segs.map((s) => s.key)).toEqual(["na", "not-assessed", "l1"]);
  });
  it("returns [] when the row total is 0", () => {
    expect(
      stackSegments({
        notApplicable: 0,
        notAssessed: 0,
        levels: [0, 0, 0, 0, 0],
        totalApplicable: 0,
      }),
    ).toEqual([]);
  });
});

describe("ringArc", () => {
  it("full circumference at fraction 1, zero at 0, guards total 0", () => {
    const c = 2 * Math.PI * 20;
    expect(ringArc(1, 20).arcLen).toBeCloseTo(c);
    expect(ringArc(0, 20).arcLen).toBeCloseTo(0);
    expect(ringArc(0.5, 20).arcLen).toBeCloseTo(c / 2);
  });
});
