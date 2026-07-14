import { deriveSaveStatus } from "./saveStatus";

const base = {
  backend: "indexeddb" as const,
  isSaving: false,
  lastSavedAt: "2026-07-15T12:00:00.000Z",
  saveError: null,
  exportNudge: "none" as const,
};

describe("deriveSaveStatus", () => {
  it("prioritizes errors above everything", () => {
    expect(deriveSaveStatus({ ...base, saveError: "quota" }).kind).toBe(
      "error",
    );
    expect(deriveSaveStatus({ ...base, saveError: "quota" }).message).toMatch(
      /storage is full/i,
    );
  });

  it("memory backend warns that storage is unavailable", () => {
    expect(deriveSaveStatus({ ...base, backend: "memory" }).kind).toBe(
      "warning",
    );
  });

  it("shows saving while a write is pending", () => {
    expect(deriveSaveStatus({ ...base, isSaving: true }).kind).toBe("saving");
  });

  it("shows saved with timestamp when clean", () => {
    const s = deriveSaveStatus(base);
    expect(s.kind).toBe("saved");
    expect(s.message).toMatch(/Saved/);
  });

  it("export nudges surface as warning (gentle) and error-styled (strong)", () => {
    expect(deriveSaveStatus({ ...base, exportNudge: "gentle" }).kind).toBe(
      "warning",
    );
    expect(deriveSaveStatus({ ...base, exportNudge: "strong" }).kind).toBe(
      "error",
    );
  });

  it("idle before the first save", () => {
    expect(deriveSaveStatus({ ...base, lastSavedAt: null }).kind).toBe("idle");
  });
});
