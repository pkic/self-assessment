import {
  detectLegacyAssessmentData,
  importLegacyData,
  importAssessmentFile,
  importYAMLFile,
} from "./storage";
import { PKIMM_1_0_0_NAMES } from "../legacy/pkimm-model-1.0.0-names";
import { buildYAMLExportPayload } from "./urlGenerator";
import yaml from "js-yaml";
import type { Assessment } from "../types/types";

beforeEach(() => {
  const storage: Record<string, string> = {};
  const fakeStorage: Storage = {
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
  };
  (globalThis as { localStorage?: Storage }).localStorage = fakeStorage;
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

describe("importAssessmentFile", () => {
  it("still parses a v1-shaped legacy YAML payload, minting a fresh id (unchanged behavior)", () => {
    const legacyYaml = `
progress:
  G.1:
    level: 4
    result: "4 - Managed"
    description: x
    applicability: true
assessmentName: Legacy YAML
assessorName: ""
useCaseDescription: ""
enabledExtensions: []
`;
    const result = importAssessmentFile(legacyYaml);
    expect(result.ok).toBe(true);
    expect(result.ok && result.assessment.dataVersion).toBe("1.0.0");
    expect(result.ok && result.assessment.name).toBe("Legacy YAML");
    expect(result.ok && result.assessment.id).not.toBe("id-stable-123");
  });

  it("still parses a new-export-shape YAML file (v1/2.0.0 export), minting a fresh id", () => {
    const newExportYaml = `
stateSchemaVersion: 1
dataVersion: "2.0.0"
name: YAML export
progress: {}
enabledExtensions: []
assessmentName: YAML export
assessorName: ""
useCaseDescription: ""
sourceStructure:
  byKey: {}
`;
    const result = importAssessmentFile(newExportYaml);
    expect(result.ok).toBe(true);
    expect(result.ok && result.assessment.dataVersion).toBe("2.0.0");
    expect(result.ok && result.assessment.name).toBe("YAML export");
  });

  it("returns ok:false for genuinely unparseable input", () => {
    const result = importAssessmentFile("{not valid: [yaml or json");
    expect(result.ok).toBe(false);
  });

  it("returns forwardIncompatible for a too-new YAML", () => {
    const tooNew = yaml.dump({
      dataVersion: "2.0.0",
      stateSchemaVersion: 99,
      progress: {},
    });
    const res = importAssessmentFile(tooNew);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.forwardIncompatible).toBe(true);
  });

  it("imports a valid YAML and preserves id", () => {
    const yamlText = yaml.dump(
      buildYAMLExportPayload(fullAssessment(), "2026-07-11T00:00:00.000Z"),
    );
    const res = importAssessmentFile(yamlText);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.assessment.id).toBe("keep-this-id");
  });
});

const fullAssessment = (): Assessment => ({
  id: "keep-this-id",
  name: "Round trip",
  dataVersion: "2.0.0",
  progress: {
    "G.strategy-and-vision": {
      level: 3,
      result: "",
      description: "",
      applicability: true,
    },
  },
  enabledExtensions: [{ id: "ext-a", version: "1.0.0" }],
  assessmentName: "AN",
  assessorName: "Jane",
  useCaseDescription: "UC",
  requirementProgress: {
    "G.strategy-and-vision.r1": {
      level: 2,
      applicability: true,
      notes: "n",
      evidence: "e",
    },
  },
  organizationName: "Org",
  assessorPosition: "external",
  assessorCompany: "Auditor Ltd",
  assessmentType: "third-party",
  startDate: "2026-01-01",
  targetDate: "2026-06-01",
  finishDate: "2026-05-01",
  pkiEnvironment: { components: "root+issuing" },
  workspace: { workingNotes: "wn", pocs: [{ id: "p1", name: "Bob" }] },
  actionPlans: { categories: { "G.strategy-and-vision": { targetLevel: 4 } } },
  lastView: "full",
  lastPosition: {
    view: "full",
    tab: "Governance",
    categoryKey: "G.strategy-and-vision",
  },
  sourceStructure: {
    byKey: {
      "G.strategy-and-vision": {
        moduleId: "G",
        categoryName: "Strategy and vision",
      },
    },
  },
  meta: {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
    importedFromId: "orig-9",
  },
});

test("YAML export→import round-trips every field, preserving id", () => {
  const original = fullAssessment();
  const yamlText = yaml.dump(
    buildYAMLExportPayload(original, "2026-07-11T00:00:00.000Z"),
  );
  const back = importYAMLFile(yamlText);
  expect(back.id).toBe("keep-this-id");
  expect(back.name).toBe("Round trip");
  expect(back.meta.importedFromId).toBe("orig-9");
  expect(back.meta.createdAt).toBe("2026-01-01T00:00:00.000Z");
  expect(back.meta.updatedAt).toBe("2026-02-02T00:00:00.000Z");
  expect(back.lastView).toBe("full");
  expect(back.lastPosition).toEqual(original.lastPosition);
  expect(back.requirementProgress).toEqual(original.requirementProgress);
  expect(back.organizationName).toBe("Org");
  expect(back.assessorPosition).toBe("external");
  expect(back.assessorCompany).toBe("Auditor Ltd");
  expect(back.assessmentType).toBe("third-party");
  expect(back.startDate).toBe("2026-01-01");
  expect(back.targetDate).toBe("2026-06-01");
  expect(back.finishDate).toBe("2026-05-01");
  expect(back.pkiEnvironment).toEqual({ components: "root+issuing" });
  expect(back.workspace).toEqual(original.workspace);
  expect(back.actionPlans).toEqual({
    categories: { "G.strategy-and-vision": { targetLevel: 4 } },
  });
  expect(back.sourceStructure).toEqual(original.sourceStructure);
  expect(back.progress).toEqual(original.progress);
  expect(back.enabledExtensions).toEqual(original.enabledExtensions);
});

test("YAML round-trip preserves category-grain extension fields", () => {
  const original = fullAssessment();
  const key = "ext1.G.strategy-and-vision";
  original.progress[key] = {
    level: 3,
    result: "3 - Advanced",
    description: "",
    applicability: true,
    notes: "cat notes",
    evidence: "cat evidence",
    pocId: "poc-1",
    interviewDate: "2026-02-02",
    artifactIds: ["a1", "a2"],
  };
  const yamlText = yaml.dump(
    buildYAMLExportPayload(original, "2026-07-11T00:00:00.000Z"),
  );
  const back = importYAMLFile(yamlText);
  expect(back.progress[key]).toEqual(original.progress[key]);
});

test("YAML round-trip preserves a blank name (not the import fallback)", () => {
  const blank = { ...fullAssessment(), name: "" };
  const yamlText = yaml.dump(
    buildYAMLExportPayload(blank, "2026-07-11T00:00:00.000Z"),
  );
  expect(importYAMLFile(yamlText).name).toBe("");
});

test("importYAMLFile rejects a .pkimm.json envelope with a clear error", () => {
  const envelope = JSON.stringify({
    formatVersion: 2,
    kind: "pkimm-assessment",
    profile: "detailed",
    assessment: { id: "x", dataVersion: "2.0.0" },
  });
  expect(() => importYAMLFile(envelope)).toThrow(
    /no longer supported|re-export/i,
  );
});

test("importYAMLFile still imports a legacy 1.0.0 YAML via importLegacyData", () => {
  const legacy = yaml.dump({
    assessmentName: "Legacy",
    progress: {
      "G.1": { level: 2, result: "", description: "", applicability: true },
    },
  });
  const back = importYAMLFile(legacy);
  expect(back.dataVersion).toBe("1.0.0");
  expect(back.progress["G.1"]).toBeDefined();
});
