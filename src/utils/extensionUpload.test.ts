import {
  parseExtensionFile,
  computeIncompatibleExtensionIds,
} from "./extensionUpload";
import { ImportTooLargeError, MAX_IMPORT_LENGTH } from "./inputLimits";
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

test("rejects a file over the import limit before parsing it", () => {
  const r = parseExtensionFile("x".repeat(MAX_IMPORT_LENGTH + 1)); // valid YAML; any other error would mean it was parsed
  expect(r).toEqual(
    expect.objectContaining({
      ok: false,
      error: new ImportTooLargeError().message,
    }),
  );
});

test("rejects a small file whose aliases expand past the import limit", () => {
  const lines = [`l0: &l0 "${"x".repeat(1_000)}"`];
  for (let i = 1; i <= 20; i++)
    lines.push(`l${i}: &l${i} [*l${i - 1}, *l${i - 1}]`);
  const r = parseExtensionFile(`${VALID}\n${lines.join("\n")}\n`);
  expect(r).toEqual(
    expect.objectContaining({
      ok: false,
      error: new ImportTooLargeError().message,
    }),
  );
});

test("refuses YAML-only types such as binary data", () => {
  expect(parseExtensionFile(`${VALID}\nextra: !!binary SGVsbG8=\n`).ok).toBe(
    false,
  );
});

test("accepts a file that uses an anchor", () => {
  const validWithAnchor = VALID.replace("name: PQC", "name: &n PQC").replace(
    "description: d",
    "description: *n",
  );
  const r = parseExtensionFile(validWithAnchor);
  expect(r.ok).toBe(true);
  expect(r.ok && r.extension.extension.description).toBe("PQC");
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
