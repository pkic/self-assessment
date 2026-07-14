import { isCompatibleVersion } from "./compatibility";

describe("isCompatibleVersion", () => {
  it("matches an exact version", () => {
    expect(isCompatibleVersion(["2.0.0"], "2.0.0")).toBe(true);
  });
  it("MAJOR prefix matches any minor/patch", () => {
    expect(isCompatibleVersion(["2"], "2.0.0")).toBe(true);
    expect(isCompatibleVersion(["2"], "2.3.1")).toBe(true);
  });
  it("MAJOR.MINOR prefix matches any patch", () => {
    expect(isCompatibleVersion(["2.0"], "2.0.5")).toBe(true);
    expect(isCompatibleVersion(["2.0"], "2.1.0")).toBe(false);
  });
  it("does not match across a non-dot boundary", () => {
    expect(isCompatibleVersion(["2"], "20.0.0")).toBe(false); // "2" must not prefix "20"
  });
  it("an exact three-part pin does not match a different patch", () => {
    expect(isCompatibleVersion(["2.0.0"], "2.0.1")).toBe(false);
  });
  it("undefined or empty compatibility is treated as compatible", () => {
    expect(isCompatibleVersion(undefined, "2.0.0")).toBe(true);
    expect(isCompatibleVersion([], "2.0.0")).toBe(true);
  });
  it("matches if any entry matches", () => {
    expect(isCompatibleVersion(["1", "2.0"], "2.0.9")).toBe(true);
  });
});
