import {
  shouldNudgeExport,
  formatBytes,
  EXPORT_NUDGE_AFTER_DAYS,
} from "./durability";

const NOW = "2026-07-15T12:00:00.000Z";
const daysAgo = (n: number): string =>
  new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

describe("shouldNudgeExport", () => {
  it("no nudge when there is nothing to lose", () => {
    expect(
      shouldNudgeExport({
        updatedAt: null,
        lastExportAt: null,
        persisted: true,
        now: NOW,
      }),
    ).toBe("none");
  });

  it("no nudge when the export is newer than the last edit", () => {
    expect(
      shouldNudgeExport({
        updatedAt: daysAgo(10),
        lastExportAt: daysAgo(2),
        persisted: true,
        now: NOW,
      }),
    ).toBe("none");
  });

  it(`no nudge for fresh unexported changes (under ${EXPORT_NUDGE_AFTER_DAYS} days)`, () => {
    expect(
      shouldNudgeExport({
        updatedAt: daysAgo(1),
        lastExportAt: null,
        persisted: true,
        now: NOW,
      }),
    ).toBe("none");
  });

  it("gentle nudge when unexported changes are older than the threshold", () => {
    expect(
      shouldNudgeExport({
        updatedAt: daysAgo(EXPORT_NUDGE_AFTER_DAYS + 1),
        lastExportAt: null,
        persisted: true,
        now: NOW,
      }),
    ).toBe("gentle");
    expect(
      shouldNudgeExport({
        updatedAt: daysAgo(1),
        lastExportAt: daysAgo(EXPORT_NUDGE_AFTER_DAYS + 3),
        persisted: true,
        now: NOW,
      }),
    ).toBe("gentle");
  });

  it("strong nudge when storage is not persisted (Safari ITP risk) and changes are unexported", () => {
    expect(
      shouldNudgeExport({
        updatedAt: daysAgo(1),
        lastExportAt: null,
        persisted: false,
        now: NOW,
      }),
    ).toBe("strong");
  });

  it("unknown persistence (null) is treated like persisted for nudge level", () => {
    expect(
      shouldNudgeExport({
        updatedAt: daysAgo(1),
        lastExportAt: null,
        persisted: null,
        now: NOW,
      }),
    ).toBe("none");
  });
});

describe("formatBytes", () => {
  it("formats human-readable sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(3_355_443)).toBe("3.2 MB");
    expect(formatBytes(2_147_483_648)).toBe("2.0 GB");
  });
});
