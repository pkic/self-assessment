import { plainReportText } from "./reportFormatting";

describe("evidence report text formatting", () => {
  it("retains link labels while removing Markdown destinations and markup", () => {
    expect(
      plainReportText("See **[approved model](https://example.test/model)**."),
    ).toBe("See approved model.");
  });

  it("preserves malformed link-like input instead of scanning past its end", () => {
    expect(plainReportText("Review [incomplete](https://example.test")).toBe(
      "Review [incomplete](https://example.test",
    );
  });

  it("handles long plain text without a backtracking expression", () => {
    const value = `[${"evidence".repeat(20_000)}`;
    expect(plainReportText(value)).toBe(value);
  });
});
