import { getColorForLevel, primaryColor, cssVar } from "./theme";

describe("theme is document-safe", () => {
  it("returns non-empty colors without a themed document", () => {
    expect(typeof primaryColor).toBe("string");
    expect(primaryColor.length).toBeGreaterThan(0);
    expect(getColorForLevel(3).background.length).toBeGreaterThan(0);
    expect(getColorForLevel(0).text).toBe("#ffffff");
  });

  it("cssVar returns the fallback when the token is absent", () => {
    expect(cssVar("--pkimm-does-not-exist", "#abcdef")).toBe("#abcdef");
  });
});
