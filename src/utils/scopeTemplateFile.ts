import yaml from "js-yaml";
import type { ModuleData } from "../types/types";
import type { ScopeTemplate } from "./scopeTree";

export interface ScopeTemplateFile {
  kind: "pkimm-scope-template";
  formatVersion: 1;
  dataVersion: string;
  name: string;
  outOfScopeCategoryKeys: string[];
  outOfScopeRequirementKeys: string[];
}

export type ScopeTemplateParseResult =
  { ok: true; file: ScopeTemplateFile } | { ok: false; error: string };

export interface TemplateCompatibility {
  versionMatch: boolean;
  matchedCategories: number;
  unmatchedCategories: number;
  matchedRequirements: number;
  unmatchedRequirements: number;
}

// Pure payload builder — drops the library-local id/createdAt/updatedAt and
// carries dataVersion (the template's own, else the current model version the
// caller passes as fallback for legacy templates that predate the field).
export const buildScopeTemplateFile = (
  template: ScopeTemplate,
  fallbackDataVersion: string,
): ScopeTemplateFile => ({
  kind: "pkimm-scope-template",
  formatVersion: 1,
  dataVersion: template.dataVersion ?? fallbackDataVersion,
  name: template.name,
  outOfScopeCategoryKeys: template.outOfScopeCategoryKeys,
  outOfScopeRequirementKeys: template.outOfScopeRequirementKeys,
});

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

// Never throws. Validates the fingerprint (kind), the version/name scalars,
// and that the key fields are string arrays, so an assessment YAML, arbitrary
// YAML, or a hand-corrupted file degrades loudly instead of half-importing.
export const parseScopeTemplateFile = (
  text: string,
): ScopeTemplateParseResult => {
  let doc: unknown;
  try {
    doc = yaml.load(text);
  } catch {
    return { ok: false, error: "This file is not valid YAML." };
  }
  if (typeof doc !== "object" || doc === null) {
    return { ok: false, error: "This file is not a scope template." };
  }
  const o = doc as Record<string, unknown>;
  if (o.kind !== "pkimm-scope-template") {
    return {
      ok: false,
      error:
        "This file is not a scope template (expected a PKIMM scope-template file).",
    };
  }
  if (o.formatVersion !== 1) {
    return {
      ok: false,
      error:
        "This scope-template file was written by a newer version and can't be imported here.",
    };
  }
  if (typeof o.dataVersion !== "string" || typeof o.name !== "string") {
    return {
      ok: false,
      error: "This scope-template file is missing a name or version.",
    };
  }
  if (
    !isStringArray(o.outOfScopeCategoryKeys) ||
    !isStringArray(o.outOfScopeRequirementKeys)
  ) {
    return { ok: false, error: "This scope-template file is malformed." };
  }
  return {
    ok: true,
    file: {
      kind: "pkimm-scope-template",
      formatVersion: 1,
      dataVersion: o.dataVersion,
      name: o.name,
      outOfScopeCategoryKeys: o.outOfScopeCategoryKeys,
      outOfScopeRequirementKeys: o.outOfScopeRequirementKeys,
    },
  };
};

// Compares the file's out-of-scope keys against the loaded model's real
// category/requirement keys and its dataVersion against the loaded model
// version. Pure; drives the import modal's preview.
export const analyzeTemplateAgainstModel = (
  file: ScopeTemplateFile,
  modules: ModuleData[],
  modelVersion: string,
): TemplateCompatibility => {
  const catKeys = new Set<string>();
  const reqKeys = new Set<string>();
  for (const m of modules) {
    for (const c of m.categories) {
      catKeys.add(`${m.id}.${c.id}`);
      for (const r of c.requirements ?? [])
        reqKeys.add(`${m.id}.${c.id}.${r.id}`);
    }
  }
  const catFileKeys = [...new Set(file.outOfScopeCategoryKeys)];
  const reqFileKeys = [...new Set(file.outOfScopeRequirementKeys)];
  const matchedCategories = catFileKeys.filter((k) => catKeys.has(k)).length;
  const unmatchedCategories = catFileKeys.length - matchedCategories;
  const matchedRequirements = reqFileKeys.filter((k) => reqKeys.has(k)).length;
  const unmatchedRequirements = reqFileKeys.length - matchedRequirements;
  return {
    versionMatch: file.dataVersion === modelVersion,
    matchedCategories,
    unmatchedCategories,
    matchedRequirements,
    unmatchedRequirements,
  };
};

// Side-effecting download (Blob + anchor + click + revokeObjectURL), mirroring
// downloadAssessmentYAML in urlGenerator.ts.
export const downloadScopeTemplate = (
  template: ScopeTemplate,
  fallbackDataVersion: string,
): void => {
  const payload = buildScopeTemplateFile(template, fallbackDataVersion);
  const blob = new Blob([yaml.dump(payload)], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${
    template.name.replace(/\W+/g, "-").toLowerCase() || "scope-template"
  }.scope-template.yaml`;
  a.click();
  URL.revokeObjectURL(url);
};
