import {
  readSavedState,
  writeSavedState,
  detectLegacyAssessmentData,
  importLegacyData,
} from "./storage";
import { PKIMM_1_0_0_NAMES } from "../legacy/pkimm-model-1.0.0-names";

beforeEach(() => {
  const storage: Record<string, string> = {};
  (global as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
    key: () => null,
    clear: () => {
      for (const k of Object.keys(storage)) delete storage[k];
    },
    length: 0,
  } as Storage;
});

describe("readSavedState / writeSavedState", () => {
  it("returns null when nothing is saved", () => {
    expect(readSavedState()).toBeNull();
  });

  it("round-trips an empty SavedState", () => {
    writeSavedState({ stateSchemaVersion: 1, activeId: null, assessments: [] });
    expect(readSavedState()).toEqual({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
  });

  it("throws on unknown stateSchemaVersion", () => {
    localStorage.setItem(
      "pkimm-sa",
      JSON.stringify({
        stateSchemaVersion: 9999,
        activeId: null,
        assessments: [],
      }),
    );
    expect(() => readSavedState()).toThrow(/stateSchemaVersion/);
  });
});

describe("detectLegacyAssessmentData", () => {
  it("returns null when no legacy key present", () => {
    expect(detectLegacyAssessmentData()).toBeNull();
  });

  it("returns parsed legacy payload when key present and pkimm-sa absent", () => {
    localStorage.setItem(
      "assessmentData",
      JSON.stringify({
        progress: {
          "G.1": {
            level: 4,
            result: "4 - Managed",
            description: "x",
            applicability: true,
          },
        },
        assessmentName: "Legacy",
        assessorName: "",
        useCaseDescription: "",
        enabledExtensions: [],
      }),
    );
    const legacy = detectLegacyAssessmentData();
    expect(legacy?.assessmentName).toBe("Legacy");
  });

  it("returns null if pkimm-sa already exists", () => {
    localStorage.setItem("assessmentData", JSON.stringify({ progress: {} }));
    localStorage.setItem(
      "pkimm-sa",
      JSON.stringify({
        stateSchemaVersion: 1,
        activeId: null,
        assessments: [],
      }),
    );
    expect(detectLegacyAssessmentData()).toBeNull();
  });
});

describe("importLegacyData", () => {
  it("creates an Assessment without deleting the legacy key", () => {
    const legacy = {
      progress: {
        "G.1": {
          level: 4,
          result: "4 - Managed",
          description: "x",
          applicability: true,
        },
      },
      assessmentName: "Legacy",
      assessorName: "",
      useCaseDescription: "",
      enabledExtensions: [],
    };
    localStorage.setItem("assessmentData", JSON.stringify(legacy));
    const a = importLegacyData(legacy);
    expect(a.dataVersion).toBe("1.0.0");
    expect(a.name).toBe("Legacy");
    expect(a.sourceStructure.byKey["G.1"]?.categoryName).toBe(
      PKIMM_1_0_0_NAMES["G.1"]?.categoryName,
    );
    expect(localStorage.getItem("assessmentData")).not.toBeNull();
  });
});
