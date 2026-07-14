import {
  getBundledModelYaml,
  DEFAULT_MODEL_VERSION,
  BUNDLED_REFERENCES_YAML,
} from "./bundledData";
import { yamlParser } from "../utils/yamlParser";
import type { AssessmentData, ReferencesCatalog } from "../types/types";

test("DEFAULT_MODEL_VERSION is the latest (2.0.0)", () => {
  expect(DEFAULT_MODEL_VERSION).toBe("2.0.0");
});

test("getBundledModelYaml returns parseable model YAML for both versions", () => {
  for (const version of ["1.0.0", "2.0.0"]) {
    const yaml = getBundledModelYaml(version);
    expect(typeof yaml).toBe("string");
    expect((yaml as string).length).toBeGreaterThan(0);
    const parsed = yamlParser(yaml as string) as AssessmentData;
    expect(parsed.version).toBe(version);
    expect(parsed.modules.length).toBeGreaterThan(0);
  }
});

test("getBundledModelYaml returns null for an unknown version", () => {
  expect(getBundledModelYaml("9.9.9")).toBeNull();
});

test("BUNDLED_REFERENCES_YAML parses to a non-empty references catalog", () => {
  const catalog = yamlParser(BUNDLED_REFERENCES_YAML) as ReferencesCatalog;
  expect(Array.isArray(catalog.references)).toBe(true);
  expect(catalog.references.length).toBeGreaterThan(0);
});
