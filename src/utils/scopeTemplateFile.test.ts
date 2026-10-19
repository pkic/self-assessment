import yaml from "js-yaml";
import {
  buildScopeTemplateFile,
  parseScopeTemplateFile,
  analyzeTemplateAgainstModel,
} from "./scopeTemplateFile";
import { ImportTooLargeError, MAX_IMPORT_LENGTH } from "./inputLimits";
import type { ScopeTemplate } from "./scopeTree";
import type { ModuleData } from "../types/types";

const template: ScopeTemplate = {
  id: "tpl-1",
  name: "Retail scope",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  outOfScopeCategoryKeys: ["G.c2"],
  outOfScopeRequirementKeys: ["G.c1.r1"],
  dataVersion: "2.0.0",
};

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "c1",
        name: "C1",
        weight: 1,
        description: "",
        levels: [],
        requirements: [
          {
            id: "r1",
            weight: 1,
            description: "R1",
            guidance: "",
            assessment: "",
            references: [],
          },
        ],
      },
      {
        id: "c2",
        name: "C2",
        weight: 1,
        description: "",
        levels: [],
        requirements: [],
      },
    ],
  },
];

describe("buildScopeTemplateFile", () => {
  it("produces the file shape and drops id/timestamps", () => {
    const f = buildScopeTemplateFile(template, "1.0.0");
    expect(f).toEqual({
      kind: "pkimm-scope-template",
      formatVersion: 1,
      dataVersion: "2.0.0",
      name: "Retail scope",
      outOfScopeCategoryKeys: ["G.c2"],
      outOfScopeRequirementKeys: ["G.c1.r1"],
    });
    expect(f).not.toHaveProperty("id");
    expect(f).not.toHaveProperty("createdAt");
  });

  it("falls back to the current model version when the template has none", () => {
    const f = buildScopeTemplateFile(
      { ...template, dataVersion: undefined },
      "1.0.0",
    );
    expect(f.dataVersion).toBe("1.0.0");
  });
});

describe("parseScopeTemplateFile", () => {
  const valid = yaml.dump(buildScopeTemplateFile(template, "2.0.0"));

  it("round-trips build → dump → parse", () => {
    const built = buildScopeTemplateFile(template, "2.0.0");
    const text = yaml.dump(built);
    const r = parseScopeTemplateFile(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file).toEqual(built);
  });

  it("rejects a non-template object (e.g. an assessment YAML)", () => {
    const r = parseScopeTemplateFile(
      yaml.dump({ dataVersion: "2.0.0", progress: {} }),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects malformed YAML", () => {
    const r = parseScopeTemplateFile("::: not : yaml :::");
    expect(r.ok).toBe(false);
  });

  it("rejects a template whose key fields are not string arrays", () => {
    const r = parseScopeTemplateFile(
      yaml.dump({
        kind: "pkimm-scope-template",
        formatVersion: 1,
        dataVersion: "2.0.0",
        name: "x",
        outOfScopeCategoryKeys: "nope",
        outOfScopeRequirementKeys: [],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a missing or future formatVersion", () => {
    const base = {
      kind: "pkimm-scope-template",
      dataVersion: "2.0.0",
      name: "x",
      outOfScopeCategoryKeys: [],
      outOfScopeRequirementKeys: [],
    };
    expect(parseScopeTemplateFile(yaml.dump(base)).ok).toBe(false); // no formatVersion
    expect(
      parseScopeTemplateFile(yaml.dump({ ...base, formatVersion: 2 })).ok,
    ).toBe(false); // future
  });

  it("rejects a file over the import limit before parsing it", () => {
    const r = parseScopeTemplateFile("x".repeat(MAX_IMPORT_LENGTH + 1)); // valid YAML; any other error would mean it was parsed
    expect(r).toEqual(
      expect.objectContaining({
        ok: false,
        error: new ImportTooLargeError().message,
      }),
    );
  });

  it("rejects a small file whose aliases expand past the import limit", () => {
    const lines = [`l0: &l0 "${"x".repeat(1_000)}"`];
    for (let i = 1; i <= 20; i++)
      lines.push(`l${i}: &l${i} [*l${i - 1}, *l${i - 1}]`);
    const r = parseScopeTemplateFile(`${valid}\n${lines.join("\n")}\n`);
    expect(r).toEqual(
      expect.objectContaining({
        ok: false,
        error: new ImportTooLargeError().message,
      }),
    );
  });

  it("refuses YAML-only types such as binary data", () => {
    expect(
      parseScopeTemplateFile(`${valid}\nextra: !!binary SGVsbG8=\n`).ok,
    ).toBe(false);
  });

  it("accepts a file that uses an anchor", () => {
    const validWithAnchor = `
kind: pkimm-scope-template
formatVersion: 1
dataVersion: "2.0.0"
name: Retail scope
outOfScopeCategoryKeys: &keys [G.a]
outOfScopeRequirementKeys: *keys
`;
    const r = parseScopeTemplateFile(validWithAnchor);
    expect(r.ok).toBe(true);
    expect(r.ok && r.file.outOfScopeRequirementKeys).toEqual(["G.a"]);
  });
});

describe("analyzeTemplateAgainstModel", () => {
  it("counts matched/unmatched and sets versionMatch", () => {
    const file = buildScopeTemplateFile(
      {
        ...template,
        outOfScopeCategoryKeys: ["G.c2", "G.ghost"],
        outOfScopeRequirementKeys: ["G.c1.r1", "G.c1.rX"],
      },
      "2.0.0",
    );
    const c = analyzeTemplateAgainstModel(file, modules, "2.0.0");
    expect(c.versionMatch).toBe(true);
    expect(c.matchedCategories).toBe(1); // G.c2 exists, G.ghost doesn't
    expect(c.unmatchedCategories).toBe(1);
    expect(c.matchedRequirements).toBe(1); // G.c1.r1 exists, G.c1.rX doesn't
    expect(c.unmatchedRequirements).toBe(1);
  });

  it("flags a version mismatch", () => {
    const file = buildScopeTemplateFile(template, "2.0.0");
    expect(
      analyzeTemplateAgainstModel(file, modules, "1.0.0").versionMatch,
    ).toBe(false);
  });

  it("counts a duplicated key only once", () => {
    const file = buildScopeTemplateFile(
      {
        ...template,
        outOfScopeCategoryKeys: ["G.c2", "G.c2"],
        outOfScopeRequirementKeys: [],
      },
      "2.0.0",
    );
    const c = analyzeTemplateAgainstModel(file, modules, "2.0.0");
    expect(c.matchedCategories).toBe(1);
    expect(c.unmatchedCategories).toBe(0);
  });
});
