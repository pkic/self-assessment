import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { syncPqcmmModel } from "./sync-pqcmm-model.mjs";

function fixture(modelVersion, profileVersion, schemaVersion = "1.1.0") {
  const root = mkdtempSync(join(tmpdir(), "pqcmm-sync-"));
  const schema = (key) =>
    JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["schemaVersion", key],
      properties: { schemaVersion: { const: schemaVersion }, [key]: { type: "object" } },
    });
  const files = {
    "model/pqcmm-model.yaml": `schemaVersion: ${schemaVersion}\nmodel:\n  id: pqcmm\n  version: ${modelVersion}\n`,
    "profiles/pqcmm-self-assessment-profile.yaml": `schemaVersion: ${schemaVersion}\nprofile:\n  version: ${profileVersion}\n  model:\n    id: pqcmm\n    version: ${modelVersion}\n`,
    "schemas/pqcmm-model.schema.json": schema("model"),
    "schemas/assessment-profile.schema.json": schema("profile"),
  };
  for (const [path, value] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), value);
  }
  return { root, files, target: join(root, "output") };
}

for (const [modelVersion, profileVersion] of [
  ["1.1.0", "1.1.0"],
  ["2.0.0", "1.2.0"],
]) {
  test(`syncs stable sources with independent asset versions for model ${modelVersion}`, () => {
    const { root, files, target } = fixture(modelVersion, profileVersion);
    try {
      const names = syncPqcmmModel(root, target);
      assert.deepEqual(names, [
        `pqcmm-model-${modelVersion}.yaml`,
        `pqcmm-self-assessment-profile-${profileVersion}.yaml`,
        "pqcmm-model.schema-1.1.0.json",
        "assessment-profile.schema-1.1.0.json",
      ]);
      assert.equal(readFileSync(join(target, names[0]), "utf8"), files["model/pqcmm-model.yaml"]);
      assert.equal(
        readFileSync(join(target, names[1]), "utf8"),
        files["profiles/pqcmm-self-assessment-profile.yaml"],
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("refuses a profile for a different model version before writing output", () => {
  const { root, target } = fixture("2.0.0", "1.2.0");
  try {
    writeFileSync(
      join(root, "profiles/pqcmm-self-assessment-profile.yaml"),
      "schemaVersion: 1.1.0\nprofile:\n  version: 1.2.0\n  model:\n    id: pqcmm\n    version: 1.1.0\n",
    );
    assert.throws(() => syncPqcmmModel(root, target), /does not match/);
    assert.equal(existsSync(target), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a schema mismatch before writing output", () => {
  const { root, target } = fixture("1.1.0", "1.1.0");
  try {
    writeFileSync(
      join(root, "model/pqcmm-model.yaml"),
      "schemaVersion: 1.0.0\nmodel:\n  id: pqcmm\n  version: 1.1.0\n",
    );
    assert.throws(() => syncPqcmmModel(root, target), /model is invalid/);
    assert.equal(existsSync(target), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects unsafe version filenames before writing output", () => {
  const { root, target } = fixture("../outside", "1.1.0");
  try {
    assert.throws(() => syncPqcmmModel(root, target), /Invalid model version/);
    assert.equal(existsSync(target), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
