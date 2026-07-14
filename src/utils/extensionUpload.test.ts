import {
  parseExtensionFile,
  computeIncompatibleExtensionIds,
} from "./extensionUpload";
import type { ExtensionData } from "../types/types";

const VALID = `schemaVersion: 1.0.0
extension:
  id: pqc
  name: PQC
  version: 1.0.0
  description: d
  compatibility: ["2.0.0"]
  documentation: https://example.test
relevance:
  modules: []
overlays:
  modules: []
`;

test("valid extension → ok", () => {
  const r = parseExtensionFile(VALID);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.extension.extension.id).toBe("pqc");
});

test("non-extension YAML → not ok", () => {
  expect(parseExtensionFile("modules: []\nversion: 2.0.0\n").ok).toBe(false);
});

test("malformed YAML → not ok", () => {
  expect(parseExtensionFile("extension: : :\n  - bad").ok).toBe(false);
});

test("extension missing schemaVersion → not ok (validateSchema would no-op)", () => {
  const noVer = VALID.replace("schemaVersion: 1.0.0\n", "");
  expect(parseExtensionFile(noVer).ok).toBe(false);
});

test("schema-invalid extension (missing required overlays) → not ok", () => {
  const noOverlays = VALID.replace(/overlays:\n  modules: \[\]\n/, "");
  expect(parseExtensionFile(noOverlays).ok).toBe(false);
});

test("computeIncompatibleExtensionIds flags by model version", () => {
  const exts = [
    {
      schemaVersion: "1.0.0",
      extension: {
        id: "pqc",
        name: "PQC",
        version: "1.0.0",
        description: "d",
        compatibility: ["2.0.0"],
      },
      relevance: { modules: [] },
    } as unknown as ExtensionData,
  ];
  expect(computeIncompatibleExtensionIds(exts, "2.0.0").has("pqc")).toBe(false);
  expect(computeIncompatibleExtensionIds(exts, "1.0.0").has("pqc")).toBe(true);
});
