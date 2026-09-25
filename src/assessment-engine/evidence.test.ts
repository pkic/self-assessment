import {
  base64ToBytes,
  bytesToBase64,
  evidenceMediaTypeAllowed,
  safeFileName,
} from "./evidence";

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

  it("round-trips every byte value through base64", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("sanitizes long delimiter-only names without regular-expression backtracking", () => {
    expect(safeFileName(`${" ".repeat(100_000)}---`)).toBe("evidence");
  });
});
