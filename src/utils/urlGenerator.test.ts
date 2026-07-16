import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  generateURL,
  decodeProgressHash,
  base64ToUtf8,
  buildYAMLExportPayload,
  ExportYAMLInput,
  encodeFullParam,
  decodeFullParam,
} from "./urlGenerator";
import { yamlParser } from "./yamlParser";
import type {
  AssessmentData,
  ModuleData,
  ProgressData,
  RequirementProgress,
  ActionPlans,
} from "../types/types";

const rp = (level: number, applicability = true): RequirementProgress => ({
  level,
  applicability,
  notes: "some notes",
  evidence: "some evidence",
});

// Minimal core module fixture: module G, category c with two requirements.
const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "c",
        weight: 3,
        name: "C",
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 3,
            description: "r1",
            guidance: "",
            assessment: "",
            references: [],
          },
          {
            id: "r2",
            weight: 1,
            description: "r2",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
    ],
  },
];

describe("generateURL", () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
    (globalThis as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  it("encodes dataVersion and stateSchemaVersion in the hash payload", () => {
    const url = generateURL({
      progress: {
        "G.strategy-and-vision": {
          level: 3,
          result: "3 - Advanced",
          description: "x",
          applicability: true,
        },
      },
      enabledExtensions: [{ id: "pqc", version: "0.2.0" }],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "X",
      assessorName: "Y",
      useCaseDescription: "Z",
    });
    const hash = new URL(url).hash.slice(1);
    const params = new URLSearchParams(hash);
    const payload = JSON.parse(base64ToUtf8(params.get("progress")!));
    expect(payload.dataVersion).toBe("2.0.0");
    expect(payload.stateSchemaVersion).toBe(1);
    expect(payload.enabledExtensions[0]).toEqual({
      id: "pqc",
      version: "0.2.0",
    });
  });
});

describe("decodeProgressHash", () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
    (globalThis as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  it("returns parsed payload for a new-format hash", () => {
    const url = generateURL({
      progress: {},
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
    });
    const out = decodeProgressHash(new URL(url).hash.slice(1));
    expect(out?.dataVersion).toBe("2.0.0");
    expect(out?.stateSchemaVersion).toBe(1);
  });

  it("defaults missing dataVersion to 1.0.0 (legacy compat)", () => {
    const legacy = btoa(
      JSON.stringify({ progress: {}, enabledExtensions: [] }),
    );
    const out = decodeProgressHash(`progress=${legacy}`);
    expect(out?.dataVersion).toBe("1.0.0");
    expect(out?.stateSchemaVersion).toBe(1);
  });

  it("rejects an unknown future stateSchemaVersion", () => {
    const future = btoa(
      JSON.stringify({
        progress: {},
        enabledExtensions: [],
        stateSchemaVersion: 9999,
      }),
    );
    expect(() => decodeProgressHash(`progress=${future}`)).toThrow(
      /stateSchemaVersion/,
    );
  });
});

describe("generateURL — quick path byte-identity (no requirementProgress)", () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
    (globalThis as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  const baseInput = {
    progress: {
      "G.strategy-and-vision": {
        level: 3,
        result: "3 - Advanced",
        description: "x",
        applicability: true,
      } as ProgressData,
    },
    enabledExtensions: [{ id: "pqc", version: "0.2.0" }],
    dataVersion: "2.0.0",
    stateSchemaVersion: 1,
    assessmentName: "X",
    assessorName: "Y",
    useCaseDescription: "Z",
  };

  it("produces a byte-identical URL when requirementProgress is absent", () => {
    const before = generateURL(baseInput);
    const after = generateURL({ ...baseInput, modules });
    expect(after).toBe(before);
    expect(new URL(after).hash).not.toContain("full=");
  });

  it("produces a byte-identical URL when requirementProgress is an empty object", () => {
    const before = generateURL(baseInput);
    const after = generateURL({
      ...baseInput,
      modules,
      requirementProgress: {},
    });
    expect(after).toBe(before);
    expect(new URL(after).hash).not.toContain("full=");
  });

  it("falls back to the quick path when requirementProgress is set but modules is omitted", () => {
    const before = generateURL(baseInput);
    const after = generateURL({
      ...baseInput,
      requirementProgress: { "G.c.r1": rp(4) },
    });
    expect(after).toBe(before);
    expect(new URL(after).hash).not.toContain("full=");
  });
});

describe("encodeFullParam / decodeFullParam", () => {
  it("round-trips a requirementProgress map (level + applicability preserved)", () => {
    const requirementProgress: Record<string, RequirementProgress> = {
      "G.c.r1": rp(4, true),
      "G.c.r2": rp(0, false),
    };
    const encoded = encodeFullParam("2.0.0", requirementProgress);
    const decoded = decodeFullParam(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.requirementProgress).toEqual({
      "G.c.r1": { level: 4, applicability: true, notes: "", evidence: "" },
      "G.c.r2": { level: 0, applicability: false, notes: "", evidence: "" },
    });
  });

  it("returns null for malformed base64/deflate input", () => {
    expect(decodeFullParam("not-valid-base64!!!")).toBeNull();
    expect(decodeFullParam("")).toBeNull();
  });

  it("returns null for a well-formed payload with hashVersion !== 2", () => {
    const legacyPayload = {
      hashVersion: 1,
      dataVersion: "2.0.0",
      requirementProgress: { "G.c.r1": { level: 4, applicability: true } },
    };
    // Build the same way encodeFullParam does, but with hashVersion 1.
    const { deflateSync, strToU8 } = jest.requireActual("fflate");
    const bytes: Uint8Array = deflateSync(
      strToU8(JSON.stringify(legacyPayload)),
    );
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const encoded = btoa(binary);
    expect(decodeFullParam(encoded)).toBeNull();
  });
});

describe("generateURL — v2 effective-compact progress + full param", () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
    (globalThis as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  it("carries the effective (requirement-blended) display level in compact progress, and includes a full param", () => {
    const progress: Record<string, ProgressData> = {
      "G.c": { level: 1, result: "", description: "", applicability: true },
    };
    // r1 weight 3 @ level 3, r2 weight 1 @ level 3 => blended level 3,
    // overriding the self-declared level 1.
    const requirementProgress = { "G.c.r1": rp(3), "G.c.r2": rp(3) };

    const url = generateURL({
      progress,
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "A",
      assessorName: "B",
      useCaseDescription: "C",
      modules,
      requirementProgress,
    });

    const hash = new URL(url).hash.slice(1);
    const params = new URLSearchParams(hash);
    expect(params.get("full")).toBeTruthy();

    const payload = JSON.parse(base64ToUtf8(params.get("progress")!));
    expect(payload.progress["G.c"]).toEqual({
      level: 3,
      applicability: true,
    });

    const decoded = decodeProgressHash(hash);
    expect(decoded?.requirementProgress).toEqual({
      "G.c.r1": { level: 3, applicability: true, notes: "", evidence: "" },
      "G.c.r2": { level: 3, applicability: true, notes: "", evidence: "" },
    });
  });

  it("serializes a derived-Not-Applicable category (all requirements scoped out) as applicability:false, not stored applicability:true", () => {
    const progress: Record<string, ProgressData> = {
      // Stored applicability is TRUE — only the requirements are scoped out.
      "G.c": { level: 2, result: "", description: "", applicability: true },
    };
    const requirementProgress = {
      "G.c.r1": rp(0, false),
      "G.c.r2": rp(0, false),
    };

    const url = generateURL({
      progress,
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      modules,
      requirementProgress,
    });

    const hash = new URL(url).hash.slice(1);
    const params = new URLSearchParams(hash);
    const payload = JSON.parse(base64ToUtf8(params.get("progress")!));
    expect(payload.progress["G.c"]).toEqual({
      level: 2,
      applicability: false,
    });
  });

  it("passes through extension-scoped progress entries unchanged (not dropped)", () => {
    const progress: Record<string, ProgressData> = {
      "G.c": { level: 2, result: "", description: "", applicability: true },
      "pqc.G.c": {
        level: 4,
        result: "",
        description: "",
        applicability: true,
      },
    };
    const requirementProgress = { "G.c.r1": rp(2), "G.c.r2": rp(2) };

    const url = generateURL({
      progress,
      enabledExtensions: [{ id: "pqc", version: "1.0.0" }],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      modules,
      requirementProgress,
    });

    const hash = new URL(url).hash.slice(1);
    const params = new URLSearchParams(hash);
    const payload = JSON.parse(base64ToUtf8(params.get("progress")!));
    expect(payload.progress["pqc.G.c"]).toEqual({
      level: 4,
      applicability: true,
    });
  });

  it("released-widget simulation: reading only the progress param (ignoring full) yields the effective category level", () => {
    const progress: Record<string, ProgressData> = {
      "G.c": { level: 1, result: "", description: "", applicability: true },
    };
    const requirementProgress = { "G.c.r1": rp(5), "G.c.r2": rp(5) };

    const url = generateURL({
      progress,
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      modules,
      requirementProgress,
    });

    const hash = new URL(url).hash.slice(1);
    // Simulate a released widget: strip the full param before decoding.
    const params = new URLSearchParams(hash);
    params.delete("full");
    const decoded = decodeProgressHash(params.toString());
    expect(decoded?.requirementProgress).toBeUndefined();
    expect(decoded?.progress["G.c"]).toEqual({ level: 5, applicability: true });
  });
});

describe("buildYAMLExportPayload", () => {
  const exportedAt = "2026-07-06T12:00:00.000Z";

  const quickAssessment: ExportYAMLInput = {
    id: "id-q",
    name: "Quick",
    dataVersion: "2.0.0",
    progress: {
      "G.strategy-and-vision": {
        level: 3,
        result: "Foundational",
        description: "desc",
        applicability: true,
      },
    },
    enabledExtensions: [{ id: "ext-1", version: "1.0.0" }],
    assessmentName: "Quick Assessment",
    assessorName: "Jane",
    useCaseDescription: "A quick assessment",
    sourceStructure: {
      byKey: {
        "G.strategy-and-vision": {
          moduleId: "G",
          categoryName: "Strategy and Vision",
        },
      },
    },
    meta: {
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  };

  // Pinned byte-for-byte against the pre-v2 hardcoded payload shape
  // (stateSchemaVersion always 1, no v2 keys). If this test needs to
  // change, the quick-assessment export format has regressed.
  const expectedQuickYAML = `stateSchemaVersion: 1
dataVersion: 2.0.0
name: Quick
id: id-q
progress:
  G.strategy-and-vision:
    level: 3
    result: Foundational
    description: desc
    applicability: true
enabledExtensions:
  - id: ext-1
    version: 1.0.0
assessmentName: Quick Assessment
assessorName: Jane
useCaseDescription: A quick assessment
sourceStructure:
  byKey:
    G.strategy-and-vision:
      moduleId: G
      categoryName: Strategy and Vision
meta:
  createdAt: '2026-01-01T00:00:00.000Z'
  updatedAt: '2026-01-02T00:00:00.000Z'
exportedAt: '${exportedAt}'
`;

  test("buildYAMLExportPayload carries id + meta for a quick assessment (stamps v1)", () => {
    const payload = buildYAMLExportPayload(
      {
        id: "id-123",
        dataVersion: "2.0.0",
        name: "Q",
        progress: {},
        enabledExtensions: [],
        assessmentName: "",
        assessorName: "",
        useCaseDescription: "",
        sourceStructure: { byKey: {} },
        meta: {
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      "2026-07-11T00:00:00.000Z",
    );
    expect(payload).toEqual({
      stateSchemaVersion: 1,
      dataVersion: "2.0.0",
      name: "Q",
      id: "id-123",
      progress: {},
      enabledExtensions: [],
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      sourceStructure: { byKey: {} },
      meta: {
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      exportedAt: "2026-07-11T00:00:00.000Z",
    });
  });

  it("produces YAML byte-identical to the pre-v2 output for a quick assessment", () => {
    const payload = buildYAMLExportPayload(quickAssessment, exportedAt);
    expect(payload.stateSchemaVersion).toBe(1);
    expect(payload).not.toHaveProperty("requirementProgress");
    expect(payload).not.toHaveProperty("organizationName");
    const yamlStr = yaml.dump(payload);
    expect(yamlStr).toBe(expectedQuickYAML);
  });

  it("stamps stateSchemaVersion 2 and includes v2 fields for a full assessment", () => {
    const fullAssessment: ExportYAMLInput = {
      ...quickAssessment,
      requirementProgress: {
        "G.strategy-and-vision.r1": {
          level: 3,
          applicability: true,
          notes: "note",
          evidence: "evidence",
          completed: true,
          flagged: false,
        },
      },
      organizationName: "Acme Corp",
      assessorPosition: "internal",
      assessmentType: "self",
      startDate: "2026-01-01",
      pkiEnvironment: {
        components: "Root CA, Issuing CA",
        outOfScopeConsiderations: "",
        highLevelDesign: "",
        pointsOfInteraction: "",
      },
    };
    const payload = buildYAMLExportPayload(fullAssessment, exportedAt);
    expect(payload.stateSchemaVersion).toBe(2);
    expect(payload.id).toBe("id-q");
    expect(payload.meta).toEqual({
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(payload.requirementProgress).toEqual(
      fullAssessment.requirementProgress,
    );
    expect(payload.organizationName).toBe("Acme Corp");
    expect(payload.assessorPosition).toBe("internal");
    expect(payload.assessmentType).toBe("self");
    expect(payload.startDate).toBe("2026-01-01");
    expect(payload.pkiEnvironment).toEqual(fullAssessment.pkiEnvironment);
  });

  it("treats a workspace- or actionPlans-only assessment as v2 too", () => {
    const withWorkspace: ExportYAMLInput = {
      ...quickAssessment,
      workspace: { workingNotes: "some notes" },
    };
    expect(
      buildYAMLExportPayload(withWorkspace, exportedAt).stateSchemaVersion,
    ).toBe(2);

    const withActionPlans: ExportYAMLInput = {
      ...quickAssessment,
      actionPlans: {
        categories: {
          "G.strategy-and-vision": {
            targetLevel: 4,
            objectives: "Improve",
            responsibility: "CISO",
            schedule: "Q1",
            resources: "",
            outputs: "",
            tasks: "",
            comments: "",
          },
        },
      } as unknown as ActionPlans,
    };
    expect(
      buildYAMLExportPayload(withActionPlans, exportedAt).stateSchemaVersion,
    ).toBe(2);
  });

  // Anti-drift guard: stamping must be decided against the FULL assessment
  // object (matching the JSON export path's hasV2Content(a) call), not a
  // hand-picked subset. This assessment's only v2-shaped content is a field
  // hasV2Content reads directly (assessorCompany) — if buildYAMLExportPayload
  // ever regressed to deriving "v2-ness" from a re-extracted subset that
  // omitted this field, this would stay stamped as v1 and the test would
  // catch it.
  it("stamps v2 for an assessment whose only v2 content is assessorCompany", () => {
    const companyOnly: ExportYAMLInput = {
      ...quickAssessment,
      assessorCompany: "Acme Corp",
    };
    const payload = buildYAMLExportPayload(companyOnly, exportedAt);
    expect(payload.stateSchemaVersion).toBe(2);
    expect(payload.assessorCompany).toBe("Acme Corp");
  });
});

// §11 size-acceptance test — see the QR fallback in ShareModal.tsx
// (QR_URL_LIMIT = 2900). This builds a FULLY-POPULATED share URL against the
// real bundled 2.0.0 model (not a toy fixture) so the pinned number reflects
// what a worst-case real assessment actually produces on the wire.
describe("generateURL — §11 size acceptance (fully-populated full assessment)", () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
    (globalThis as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  // Load the real bundled 2.0.0 model through the same parser the widget
  // uses at runtime, rather than a hand-rolled fixture — the model's true
  // scale (4 modules / 16 categories / 76 requirements at the time this test
  // was written) is exactly what determines the real-world URL size.
  const modelPath = path.join(
    __dirname,
    "..",
    "public",
    "pkimm-model-2.0.0.yaml",
  );
  const modelYAML = fs.readFileSync(modelPath, "utf8");
  const modelData = yamlParser(modelYAML) as AssessmentData;
  const realModules: ModuleData[] = modelData.modules;

  it("pins the URL length for a worst-case fully-rated assessment", () => {
    // Populate every core category (self-declared level) and every core
    // requirement (questionnaire level), all applicable, at a non-trivial
    // level — the URL carries level + applicability only (never notes or
    // evidence, per the "Notes and evidence are not included in links" share
    // modal copy), so this is the realistic worst case for size.
    const progress: Record<string, ProgressData> = {};
    const requirementProgress: Record<string, RequirementProgress> = {};
    let categoryCount = 0;
    let requirementCount = 0;

    realModules.forEach((m, mi) => {
      m.categories.forEach((c, ci) => {
        const categoryKey = `${m.id}.${c.id}`;
        progress[categoryKey] = {
          level: ((mi + ci) % 5) + 1,
          result: "some result",
          description: "some description",
          applicability: true,
        };
        categoryCount++;
        c.requirements.forEach((r, ri) => {
          const reqKey = `${m.id}.${c.id}.${r.id}`;
          requirementProgress[reqKey] = {
            level: ((mi + ci + ri) % 5) + 1,
            applicability: true,
            // Deliberately non-empty notes/evidence: these must NOT leak
            // into the URL (only level + applicability travel over the
            // wire) — if they ever did, this test's pinned length would
            // balloon and fail immediately.
            notes:
              "Detailed rationale for this requirement rating, explaining " +
              "the evidence considered and the assessor's reasoning.",
            evidence:
              "See policy document section 4.2 and interview notes from " +
              "the infrastructure team dated this quarter.",
            completed: true,
            flagged: false,
          };
          requirementCount++;
        });
      });
    });

    // Sanity check on the model's real scale, so a future model edit that
    // silently shrinks/grows the fixture is visible in a failing assertion
    // here rather than just a drifting, unexplained url.length below.
    expect(categoryCount).toBe(16);
    expect(requirementCount).toBe(76);

    const url = generateURL({
      progress,
      enabledExtensions: [],
      dataVersion: modelData.version ?? "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "Acme Corporation — Q3 PKI Maturity Self-Assessment",
      assessorName: "Jordan Alexandra Whitfield-Nakamura",
      useCaseDescription:
        "Comprehensive review of the enterprise PKI covering issuance, " +
        "revocation, HSM key management, and certificate lifecycle " +
        "automation across all business units ahead of the annual audit.",
      modules: realModules,
      requirementProgress,
    });

    // Measured at the time this test was written: url.length === 3225,
    // which EXCEEDS QR_URL_LIMIT (2900) from ShareModal.tsx. That is
    // expected and allowed for a fully-populated full assessment — the
    // modal's `qrSupported` check falls back to the text-only "copy the
    // URL" treatment instead of rendering a QR code (see
    // ShareModal.tsx's `qrSupported` branch and its fallback message).
    // Bounds below bracket the measured 3225 with a ~10% margin on each
    // side: enough to absorb incidental noise (e.g. a requirement/category
    // id renamed by a few characters in a future model revision) without
    // masking a real regression — a change that bloats the compact/full
    // param encoding (e.g. losing the effective-compact dedup, or
    // accidentally including notes/evidence) would push well past 3550 and
    // fail the test; a change that meaningfully shrinks it would drop below
    // 2900 and flip the "still exceeds the QR limit" assumption this test
    // documents, which is also worth surfacing rather than silently passing.
    expect(url.length).toBeGreaterThan(2900);
    expect(url.length).toBeLessThan(3550);

    // Confirm the QR fallback condition a maintainer would observe in the
    // modal actually holds for this payload.
    const QR_URL_LIMIT = 2900;
    expect(url.length > QR_URL_LIMIT).toBe(true);
  });
});
