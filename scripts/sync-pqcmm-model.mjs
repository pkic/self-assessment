import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

function fileVersion(value, label) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Invalid ${label} version for an asset filename`);
  }
  return value;
}

/** Read one canonical checkout; validate the complete set before writing any development assets. */
export function syncPqcmmModel(pqcmmRoot, targetDirectory) {
  const read = (path) => readFileSync(join(pqcmmRoot, path), "utf8");
  const modelSource = read("model/pqcmm-model.yaml");
  const profileSource = read("profiles/pqcmm-self-assessment-profile.yaml");
  const modelSchemaSource = read("schemas/pqcmm-model.schema.json");
  const profileSchemaSource = read("schemas/assessment-profile.schema.json");
  const model = load(modelSource);
  const profile = load(profileSource);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const [schema, value, label] of [
    [JSON.parse(modelSchemaSource), model, "model"],
    [JSON.parse(profileSchemaSource), profile, "profile"],
  ]) {
    const validate = ajv.compile(schema);
    if (!validate(value)) {
      throw new Error(`PQCMM ${label} is invalid: ${ajv.errorsText(validate.errors)}`);
    }
  }
  if (
    model.model.id !== "pqcmm" ||
    profile.profile.model.id !== model.model.id ||
    profile.profile.model.version !== model.model.version
  ) {
    throw new Error("PQCMM profile reference does not match the model");
  }
  const modelVersion = fileVersion(model.model.version, "model");
  const profileVersion = fileVersion(profile.profile.version, "profile");
  const modelSchemaVersion = fileVersion(model.schemaVersion, "model schema");
  const profileSchemaVersion = fileVersion(profile.schemaVersion, "profile schema");
  const files = [
    [`pqcmm-model-${modelVersion}.yaml`, modelSource],
    [`pqcmm-self-assessment-profile-${profileVersion}.yaml`, profileSource],
    [`pqcmm-model.schema-${modelSchemaVersion}.json`, modelSchemaSource],
    [`assessment-profile.schema-${profileSchemaVersion}.json`, profileSchemaSource],
  ];
  mkdirSync(targetDirectory, { recursive: true });
  for (const [name, source] of files) writeFileSync(join(targetDirectory, name), source);
  return files.map(([name]) => name);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const source = resolve(process.env.PQCMM_ROOT ?? join(root, "..", "pqcmm"));
  for (const name of syncPqcmmModel(source, join(root, "src", "public"))) {
    console.log(`Synced ${name}`);
  }
}
