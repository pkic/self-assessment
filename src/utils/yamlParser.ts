import yaml from "js-yaml";
import type { ErrorObject } from "ajv";
import {
  AssessmentData,
  ExtensionData,
  ReferencesCatalog,
} from "../types/types";

// Validators are precompiled at build time (scripts/generate-validators.mjs).
// Compiling schemas at runtime uses new Function(), which is blocked on pages
// served with a CSP whose script-src lacks 'unsafe-eval' (e.g. pkic.org).
import {
  validateModel100,
  validateModel200,
  validateReferences100,
} from "../generated/validators-draft07";
import { validateExtension100 } from "../generated/validators-2020";

const validators = {
  "model:1.0.0": validateModel100,
  "model:2.0.0": validateModel200,
  "references:1.0.0": validateReferences100,
  "extension:1.0.0": validateExtension100,
};

// Same output shape as Ajv's instance.errorsText().
const errorsText = (errors: ErrorObject[] | null | undefined): string =>
  (errors ?? [])
    .map((e) => `data${e.instancePath} ${e.message ?? ""}`)
    .join(", ") || "validation failed";

export const yamlParser = (
  yamlText: string,
): AssessmentData | ExtensionData | ReferencesCatalog => {
  const data = yaml.load(yamlText);
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid YAML format");
  }
  if ("modules" in data) return data as AssessmentData;
  if ("extension" in data) return data as ExtensionData;
  if ("references" in data) return data as ReferencesCatalog;
  throw new Error("Invalid YAML format");
};

/** Validate that the parsed data matches the schema declared by its
 *  `schemaVersion` field. Throws on mismatch. */
export const validateSchema = (
  data: AssessmentData | ExtensionData | ReferencesCatalog,
): void => {
  const schemaVersion = (data as { schemaVersion?: string }).schemaVersion;
  if (typeof schemaVersion !== "string") return;

  const isExtension = "extension" in data;
  const isReferences = "references" in data && !("modules" in data);

  let key: string;
  if (isExtension) {
    key = `extension:${schemaVersion}`;
  } else if (isReferences) {
    key = `references:${schemaVersion}`;
  } else {
    key = `model:${schemaVersion}`;
  }
  const validator = validators[key as keyof typeof validators];
  if (!validator) {
    throw new Error(
      `Unknown schemaVersion '${schemaVersion}' (no compiled validator for '${key}'). ` +
        `If this is from a newer pkimm release, upgrade the widget.`,
    );
  }
  const ok = validator(data);
  if (!ok) {
    throw new Error(
      `Schema validation failed: ${errorsText(validator.errors)}`,
    );
  }
};
