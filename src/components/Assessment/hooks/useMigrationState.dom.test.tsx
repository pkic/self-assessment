import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useMigrationState } from "./useMigrationState";
import {
  Assessment as SavedAssessment,
  AssessmentData,
  ExtensionData,
} from "../../../types/types";

const baseSourceStructure = { byKey: {} };

const makeAssessment = (
  overrides: Partial<SavedAssessment> = {},
): SavedAssessment => ({
  id: "assessment-1",
  name: "Test Assessment",
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: "Test Assessment",
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: baseSourceStructure,
  meta: {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  ...overrides,
});

const data: AssessmentData = {
  schemaVersion: "2.0.0",
  version: "2.0.0",
  modules: [],
};

const pqcExtensionLoaded: ExtensionData = {
  schemaVersion: "1.0.0",
  extension: {
    id: "pqc",
    name: "Post-Quantum Cryptography",
    version: "2.0.0",
    description: "",
  },
  relevance: { modules: [] },
};

describe("useMigrationState", () => {
  it("reports no mismatches and no banner when versions match", () => {
    const activeAssessment = makeAssessment({
      dataVersion: "2.0.0",
      enabledExtensions: [{ id: "pqc", version: "2.0.0" }],
    });
    const { result } = renderHook(() =>
      useMigrationState({
        activeAssessment,
        data,
        extensionsData: [pqcExtensionLoaded],
        hiddenExtensions: new Set<string>(),
      }),
    );
    expect(result.current.mismatches).toEqual([]);
    expect(result.current.shouldShowMigrationBanner).toBe(false);
  });

  it("reports a model mismatch and an extension mismatch and shows the banner", () => {
    const activeAssessment = makeAssessment({
      dataVersion: "1.0.0",
      enabledExtensions: [{ id: "pqc", version: "1.0.0" }],
    });
    const { result } = renderHook(() =>
      useMigrationState({
        activeAssessment,
        data,
        extensionsData: [pqcExtensionLoaded],
        hiddenExtensions: new Set<string>(),
      }),
    );
    // Exact expected AxisMismatch entries per computeMismatches' logic:
    // 1. model axis: activeAssessment.dataVersion !== data.version
    // 2. extension axis: enabledExtensions[].version !== loaded extension version
    expect(result.current.mismatches).toEqual([
      {
        kind: "model",
        label: "PKIMM 1.0.0 → 2.0.0",
        canKeepHidden: false,
      },
      {
        kind: "extension",
        label: "Post-Quantum Cryptography 1.0.0 → 2.0.0",
        extensionId: "pqc",
        canKeepHidden: true,
      },
    ]);
    expect(result.current.shouldShowMigrationBanner).toBe(true);
  });

  it("skips extension mismatches for hidden extensions but still flags them if unhidden", () => {
    const activeAssessment = makeAssessment({
      dataVersion: "2.0.0",
      enabledExtensions: [{ id: "pqc", version: "1.0.0" }],
    });
    const { result, rerender } = renderHook(
      ({ hiddenExtensions }) =>
        useMigrationState({
          activeAssessment,
          data,
          extensionsData: [pqcExtensionLoaded],
          hiddenExtensions,
        }),
      { initialProps: { hiddenExtensions: new Set<string>(["pqc"]) } },
    );
    expect(result.current.mismatches).toEqual([]);
    expect(result.current.shouldShowMigrationBanner).toBe(false);

    rerender({ hiddenExtensions: new Set<string>() });
    expect(result.current.mismatches).toEqual([
      {
        kind: "extension",
        label: "Post-Quantum Cryptography 1.0.0 → 2.0.0",
        extensionId: "pqc",
        canKeepHidden: true,
      },
    ]);
    expect(result.current.shouldShowMigrationBanner).toBe(true);
  });

  it("suppresses the banner once migrationDismissedFor matches the active assessment id, even with mismatches", () => {
    const activeAssessment = makeAssessment({
      dataVersion: "1.0.0",
      enabledExtensions: [],
    });
    const { result } = renderHook(() =>
      useMigrationState({
        activeAssessment,
        data,
        extensionsData: [pqcExtensionLoaded],
        hiddenExtensions: new Set<string>(),
      }),
    );
    expect(result.current.shouldShowMigrationBanner).toBe(true);

    act(() => {
      result.current.setMigrationDismissedFor(activeAssessment.id);
    });

    expect(result.current.mismatches.length).toBeGreaterThan(0);
    expect(result.current.shouldShowMigrationBanner).toBe(false);
  });

  it("suppresses the banner for a transient assessment even when mismatched", () => {
    const activeAssessment = makeAssessment({
      id: "transient-abc",
      dataVersion: "1.0.0",
      enabledExtensions: [],
    });
    const { result } = renderHook(() =>
      useMigrationState({
        activeAssessment,
        data,
        extensionsData: [pqcExtensionLoaded],
        hiddenExtensions: new Set<string>(),
      }),
    );
    expect(result.current.mismatches.length).toBeGreaterThan(0);
    expect(result.current.shouldShowMigrationBanner).toBe(false);
  });

  it("reports no mismatches and no banner when there is no active assessment", () => {
    const { result } = renderHook(() =>
      useMigrationState({
        activeAssessment: undefined,
        data,
        extensionsData: [pqcExtensionLoaded],
        hiddenExtensions: new Set<string>(),
      }),
    );
    expect(result.current.mismatches).toEqual([]);
    expect(result.current.shouldShowMigrationBanner).toBe(false);
  });

  it("exposes setMigrationSummary for the orchestrator's handleMigrate to call", () => {
    const { result } = renderHook(() =>
      useMigrationState({
        activeAssessment: undefined,
        data,
        extensionsData: [],
        hiddenExtensions: new Set<string>(),
      }),
    );
    expect(result.current.migrationSummary).toBeNull();
    act(() => {
      result.current.setMigrationSummary({
        mapped: 3,
        addedInTarget: [],
        unmappedFromSource: [],
        reclassifiedLevel1ToZero: 0,
      });
    });
    expect(result.current.migrationSummary?.mapped).toBe(3);
  });
});
