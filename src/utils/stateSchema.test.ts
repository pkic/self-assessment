import type { Assessment } from "../types/types";
import {
  WIDGET_MAX_STATE_SCHEMA_VERSION,
  ForwardCompatError,
  assertSupportedStateSchemaVersion,
  hasV2Content,
  isSupportedStateSchemaVersion,
} from "./stateSchema";

const makeAssessment = (overrides: Partial<Assessment> = {}): Assessment => ({
  id: "id-1",
  name: "A",
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: "A",
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-07-05T10:00:00.000Z",
    updatedAt: "2026-07-05T10:00:00.000Z",
  },
  ...overrides,
});

describe("stateSchema", () => {
  it("current max is 2", () => {
    expect(WIDGET_MAX_STATE_SCHEMA_VERSION).toBe(2);
  });

  it("accepts supported versions", () => {
    expect(isSupportedStateSchemaVersion(1)).toBe(true);
    expect(() =>
      assertSupportedStateSchemaVersion(1, "Saved state"),
    ).not.toThrow();
  });

  it("throws ForwardCompatError with context on newer versions", () => {
    expect(isSupportedStateSchemaVersion(3)).toBe(false);
    expect(() => assertSupportedStateSchemaVersion(3, "Saved state")).toThrow(
      ForwardCompatError,
    );
    expect(() => assertSupportedStateSchemaVersion(3, "Imported file")).toThrow(
      /Imported file uses stateSchemaVersion 3; widget supports up to 2/,
    );
  });

  it("supports state schema v2 and still refuses newer", () => {
    expect(WIDGET_MAX_STATE_SCHEMA_VERSION).toBe(2);
    expect(isSupportedStateSchemaVersion(1)).toBe(true);
    expect(isSupportedStateSchemaVersion(2)).toBe(true);
    expect(isSupportedStateSchemaVersion(3)).toBe(false);
    expect(() => assertSupportedStateSchemaVersion(3, "X")).toThrow(
      ForwardCompatError,
    );
    expect(() => assertSupportedStateSchemaVersion(2, "X")).not.toThrow();
  });
});

describe("hasV2Content", () => {
  it("is false for a bare quick assessment", () => {
    expect(hasV2Content(makeAssessment())).toBe(false);
  });

  it("is true when requirementProgress has an entry", () => {
    const a = makeAssessment({
      requirementProgress: {
        "G.c1.r1": { level: 3, applicability: true, notes: "", evidence: "" },
      },
    });
    expect(hasV2Content(a)).toBe(true);
  });

  it("is true when a metadata field is set", () => {
    expect(hasV2Content(makeAssessment({ organizationName: "Acme" }))).toBe(
      true,
    );
    expect(hasV2Content(makeAssessment({ assessorPosition: "internal" }))).toBe(
      true,
    );
    expect(hasV2Content(makeAssessment({ assessorCompany: "Acme" }))).toBe(
      true,
    );
    expect(hasV2Content(makeAssessment({ assessmentType: "self" }))).toBe(true);
    expect(hasV2Content(makeAssessment({ startDate: "2026-01-01" }))).toBe(
      true,
    );
    expect(hasV2Content(makeAssessment({ targetDate: "2026-06-01" }))).toBe(
      true,
    );
    expect(hasV2Content(makeAssessment({ finishDate: "2026-07-01" }))).toBe(
      true,
    );
  });

  it("is true when a pkiEnvironment value is set", () => {
    const a = makeAssessment({
      pkiEnvironment: { components: "Root CA, Issuing CA" },
    });
    expect(hasV2Content(a)).toBe(true);
  });

  it("is false when pkiEnvironment is present but all values are falsy", () => {
    const a = makeAssessment({
      pkiEnvironment: { components: "", outOfScopeConsiderations: undefined },
    });
    expect(hasV2Content(a)).toBe(false);
  });

  it("is true when workspace has content", () => {
    const withArtifacts = makeAssessment({
      workspace: {
        artifacts: [{ id: "a1", title: "T", locator: "L" }],
      },
    });
    expect(hasV2Content(withArtifacts)).toBe(true);

    const withNotes = makeAssessment({
      workspace: { workingNotes: "some notes" },
    });
    expect(hasV2Content(withNotes)).toBe(true);
  });

  it("is false when workspace is present but empty", () => {
    const a = makeAssessment({
      workspace: { artifacts: [], pocs: [], checklist: [] },
    });
    expect(hasV2Content(a)).toBe(false);
  });

  it("is true when actionPlans has a category entry", () => {
    const a = makeAssessment({
      actionPlans: {
        categories: {
          "G.strategy-and-vision": { targetLevel: 3 },
        },
      },
    });
    expect(hasV2Content(a)).toBe(true);
  });

  it("is false when actionPlans is present but empty", () => {
    const a = makeAssessment({ actionPlans: { categories: {} } });
    expect(hasV2Content(a)).toBe(false);
  });
});
