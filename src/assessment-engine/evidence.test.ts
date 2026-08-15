import { evidenceMediaTypeAllowed, safeFileName } from "./evidence";

describe("evidence policy helpers", () => {
  it("accepts exact, wildcard subtype, and universal media policies", () => {
    expect(
      evidenceMediaTypeAllowed("application/pdf", ["application/pdf"]),
    ).toBe(true);
    expect(evidenceMediaTypeAllowed("image/png", ["image/*"])).toBe(true);
    expect(evidenceMediaTypeAllowed("text/plain", ["*/*"])).toBe(true);
  });

  it("rejects media outside the configured policy", () => {
    expect(
      evidenceMediaTypeAllowed("application/x-msdownload", [
        "image/*",
        "application/pdf",
      ]),
    ).toBe(false);
  });

  it("removes PDF name-object delimiters from embedded filenames", () => {
    expect(
      safeFileName("x) /FS /URL /F (https://attacker.invalid"),
    ).not.toMatch(/[()\s/]/);
  });
});
