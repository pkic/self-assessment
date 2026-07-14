import yaml from "js-yaml";
import { migrate } from "./stateMigration";
import type {
  Assessment,
  AssessmentData,
  ExtensionData,
  StructureSnapshot,
} from "../types/types";

const TARGET_YAML = `
schemaVersion: "2.0.0"
version: "2.0.0"
modules:
  - id: "G"
    name: "Governance"
    description: "Gov"
    categories:
      - id: "strategy-and-vision"
        weight: 5
        name: "Strategy and Vision"
        description: "Strategy"
        levels:
          - { number: 1, name: "Initial", description: "x" }
          - { number: 2, name: "Foundational", description: "x" }
          - { number: 3, name: "Advanced", description: "x" }
          - { number: 4, name: "Managed", description: "x" }
          - { number: 5, name: "Optimized", description: "x" }
        requirements:
          - id: "org-sponsor-support"
            weight: 3
            description: "Organizational sponsor and support"
            guidance: "x"
            assessment: "x"
            references: []
      - id: "cryptography"
        weight: 4
        name: "Cryptography"
        description: "Crypto"
        levels:
          - { number: 1, name: "Initial", description: "x" }
          - { number: 2, name: "Foundational", description: "x" }
          - { number: 3, name: "Advanced", description: "x" }
          - { number: 4, name: "Managed", description: "x" }
          - { number: 5, name: "Optimized", description: "x" }
        requirements: []
`;

const SOURCE_SNAPSHOT: StructureSnapshot = {
  byKey: {
    "G.1": { moduleId: "G", categoryName: "Strategy and Vision" },
    "G.1.1": {
      moduleId: "G",
      categoryName: "Strategy and Vision",
      requirementName: "Organizational sponsor and support",
    },
  },
};

function makeSource(): Assessment {
  return {
    id: "src",
    name: "Old assessment",
    dataVersion: "1.0.0",
    progress: {
      "G.1": {
        level: 4,
        result: "Managed",
        description: "x",
        applicability: true,
      },
      "G.1.1": {
        level: 3,
        result: "Advanced",
        description: "x",
        applicability: true,
      },
    },
    enabledExtensions: [],
    assessmentName: "",
    assessorName: "",
    useCaseDescription: "",
    sourceStructure: SOURCE_SNAPSHOT,
    meta: { createdAt: "", updatedAt: "" },
  };
}

describe("migrate", () => {
  const target = yaml.load(TARGET_YAML) as AssessmentData;

  it("maps a category by module + name", () => {
    const src = makeSource();
    const r = migrate(src, target);
    expect(r.migratedProgress["G.strategy-and-vision"]).toEqual(
      src.progress["G.1"],
    );
  });

  it("maps a requirement by name within a mapped category", () => {
    const src = makeSource();
    const r = migrate(src, target);
    expect(
      r.migratedProgress["G.strategy-and-vision.org-sponsor-support"],
    ).toEqual(src.progress["G.1.1"]);
  });

  it("reports new target categories not present in source", () => {
    const src = makeSource();
    const r = migrate(src, target);
    expect(r.summary.addedInTarget).toContain("Cryptography");
  });

  it("reports unmapped source entries", () => {
    const src = makeSource();
    src.progress["G.99"] = {
      level: 2,
      result: "Foundational",
      description: "x",
      applicability: true,
    };
    src.sourceStructure.byKey["G.99"] = {
      moduleId: "G",
      categoryName: "Vanished Category",
    };
    const r = migrate(src, target);
    expect(r.summary.unmappedFromSource).toContain("Vanished Category");
  });

  it("returns a new sourceStructure built from the target", () => {
    const src = makeSource();
    const r = migrate(src, target);
    expect(r.newSourceStructure.byKey["G.strategy-and-vision"]).toEqual({
      moduleId: "G",
      categoryName: "Strategy and Vision",
    });
    expect(r.newSourceStructure.byKey["G.cryptography"]).toEqual({
      moduleId: "G",
      categoryName: "Cryptography",
    });
  });

  it("tolerates whitespace and case differences in names", () => {
    const src = makeSource();
    src.sourceStructure.byKey["G.1"] = {
      moduleId: "G",
      categoryName: "  strategy AND vision\n",
    };
    const r = migrate(src, target);
    expect(r.migratedProgress["G.strategy-and-vision"]).toBeDefined();
  });
});

const TARGET_EXTENSION: ExtensionData = {
  schemaVersion: "1.0.0",
  extension: {
    id: "pqc",
    name: "PQC",
    version: "0.2.0",
    description: "x",
    documentation: "https://example.com",
  },
  relevance: {
    modules: [
      {
        id: "G",
        categories: [
          {
            id: "strategy-and-vision",
            weight: 5,
            guidance: "x",
            assessment: "x",
            references: "x",
            levels: [
              { number: 1, name: "Initial", description: "x" },
              { number: 2, name: "Foundational", description: "x" },
              { number: 3, name: "Advanced", description: "x" },
              { number: 4, name: "Managed", description: "x" },
              { number: 5, name: "Optimized", description: "x" },
            ],
          },
        ],
      },
    ],
  },
};

describe("migrate with extensions", () => {
  const target = yaml.load(TARGET_YAML) as AssessmentData;

  it("derives the extension scope from byKey when extensionScopes is absent (production path)", () => {
    // buildStructureSnapshot never populates extensionScopes, so a real
    // assessment reaches migrate() without it. The extension key's core
    // portion ("G.1") IS in byKey, so the scope is derivable.
    const src = makeSource();
    src.enabledExtensions = [{ id: "pqc", version: "0.2.0" }];
    src.progress["pqc.G.1"] = {
      level: 3,
      result: "Advanced",
      description: "x",
      applicability: true,
      notes: "N",
      evidence: "E",
      pocId: "poc-1",
      artifactIds: ["a1"],
    };
    // Deliberately NO src.sourceStructure.extensionScopes.
    const r = migrate(src, target, [TARGET_EXTENSION]);
    const entry = r.migratedProgress["pqc.G.strategy-and-vision"];
    expect(entry).toBeDefined();
    expect(entry.level).toBe(3);
    expect(entry.notes).toBe("N");
    expect(entry.evidence).toBe("E");
    expect(entry.pocId).toBe("poc-1");
    expect(entry.artifactIds).toEqual(["a1"]);
  });

  it("does not reprocess a core key even when an extension id shadows a module letter", () => {
    // Pathological: an enabled extension literally named "G". The core key
    // "G.1" must still map exactly once (via the core loop) and never be
    // preserved as a stray extension entry.
    const src = makeSource();
    src.enabledExtensions = [{ id: "G", version: "1.0.0" }];
    const r = migrate(src, target, [TARGET_EXTENSION]);
    expect(r.migratedProgress["G.strategy-and-vision"]).toBeDefined();
    expect(r.migratedProgress["G.1"]).toBeUndefined();
  });

  it("preserves an unresolvable extension entry under its original key instead of dropping it", () => {
    // Enabled extension entry whose core category is not in byKey and whose
    // extension is not loaded: must survive migration (preserved), never drop.
    const src = makeSource();
    src.enabledExtensions = [{ id: "ghost", version: "1.0.0" }];
    src.progress["ghost.G.unknown"] = {
      level: 2,
      result: "Foundational",
      description: "x",
      applicability: true,
      evidence: "keep me",
    };
    const r = migrate(src, target, [TARGET_EXTENSION]);
    expect(r.migratedProgress["ghost.G.unknown"]).toBeDefined();
    expect(r.migratedProgress["ghost.G.unknown"].evidence).toBe("keep me");
  });

  it("preserves extension progress by extension id when version matches", () => {
    const src = makeSource();
    src.enabledExtensions = [{ id: "pqc", version: "0.2.0" }];
    src.progress["pqc.G.strategy-and-vision"] = {
      level: 3,
      result: "Advanced",
      description: "x",
      applicability: true,
    };
    src.sourceStructure.extensionScopes = {
      "pqc.G.strategy-and-vision": {
        extensionId: "pqc",
        extensionVersion: "0.2.0",
        moduleId: "G",
        categoryName: "Strategy and Vision",
      },
    };
    const r = migrate(src, target, [TARGET_EXTENSION]);
    expect(r.migratedProgress["pqc.G.strategy-and-vision"]).toBeDefined();
  });

  it("preserves category-grain notes/evidence/workspace fields on an extension entry", () => {
    const src = makeSource();
    src.enabledExtensions = [{ id: "pqc", version: "0.2.0" }];
    src.progress["pqc.G.strategy-and-vision"] = {
      level: 3,
      result: "Advanced",
      description: "x",
      applicability: true,
      notes: "N",
      evidence: "E",
      pocId: "poc-1",
      interviewDate: "2026-02-02",
      artifactIds: ["a1", "a2"],
    };
    src.sourceStructure.extensionScopes = {
      "pqc.G.strategy-and-vision": {
        extensionId: "pqc",
        extensionVersion: "0.2.0",
        moduleId: "G",
        categoryName: "Strategy and Vision",
      },
    };
    const r = migrate(src, target, [TARGET_EXTENSION]);
    const entry = r.migratedProgress["pqc.G.strategy-and-vision"];
    expect(entry).toBeDefined();
    expect(entry.notes).toBe("N");
    expect(entry.evidence).toBe("E");
    expect(entry.pocId).toBe("poc-1");
    expect(entry.interviewDate).toBe("2026-02-02");
    expect(entry.artifactIds).toEqual(["a1", "a2"]);
  });

  it("maps extension progress across an extension version bump by name", () => {
    const src = makeSource();
    src.enabledExtensions = [{ id: "pqc", version: "0.1.0" }];
    src.progress["pqc.G.1"] = {
      level: 3,
      result: "Advanced",
      description: "x",
      applicability: true,
    };
    src.sourceStructure.extensionScopes = {
      "pqc.G.1": {
        extensionId: "pqc",
        extensionVersion: "0.1.0",
        moduleId: "G",
        categoryName: "Strategy and Vision",
      },
    };
    const r = migrate(src, target, [TARGET_EXTENSION]);
    expect(r.migratedProgress["pqc.G.strategy-and-vision"]).toBeDefined();
    expect(r.migratedEnabledExtensions[0]).toEqual({
      id: "pqc",
      version: "0.2.0",
    });
  });

  it("preserves progress for extensions that are referenced but not loaded", () => {
    const src = makeSource();
    src.enabledExtensions = [{ id: "ghost", version: "1.0.0" }];
    src.progress["ghost.G.somewhere"] = {
      level: 2,
      result: "Foundational",
      description: "x",
      applicability: true,
    };
    src.sourceStructure.extensionScopes = {
      "ghost.G.somewhere": {
        extensionId: "ghost",
        extensionVersion: "1.0.0",
        moduleId: "G",
        categoryName: "Somewhere",
      },
    };
    const r = migrate(src, target, [TARGET_EXTENSION]);
    expect(r.migratedProgress["ghost.G.somewhere"]).toBeDefined();
    expect(r.migratedEnabledExtensions).toContainEqual({
      id: "ghost",
      version: "1.0.0",
    });
  });
});
