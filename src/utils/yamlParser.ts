import yaml from "js-yaml";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
  AssessmentData,
  ConfigData,
  ExtensionData,
  ReferencesCatalog,
} from "../types/types";

import schemaModel1 from "../public/pkimm-model.schema-1.0.0.json";
import schemaModel2 from "../public/pkimm-model.schema-2.0.0.json";
import schemaReferences1 from "../public/pkimm-references.schema-1.0.0.json";
import schemaExt1 from "../public/extension.schema-1.0.0.json";

const ajvDraft07 = new Ajv({ allErrors: true, strict: false });
addFormats(ajvDraft07);
const ajv2020 = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv2020);

const validators = {
  "model:1.0.0": ajvDraft07.compile(schemaModel1),
  "model:2.0.0": ajvDraft07.compile(schemaModel2),
  "references:1.0.0": ajvDraft07.compile(schemaReferences1),
  "extension:1.0.0": ajv2020.compile(schemaExt1),
};

export const yamlParser = (
  yamlText: string,
): AssessmentData | ConfigData | ExtensionData | ReferencesCatalog => {
  const data = yaml.load(yamlText);
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid YAML format");
  }
  if ("modules" in data) return data as AssessmentData;
  if ("extension" in data) return data as ExtensionData;
  if ("references" in data) return data as ReferencesCatalog;
  if ("email" in data || "overview" in data) return data as ConfigData;
  throw new Error("Invalid YAML format");
};

/** Validate that the parsed data matches the schema declared by its
 *  `schemaVersion` field. Throws on mismatch. ConfigData has no
 *  schemaVersion and is skipped. */
export const validateSchema = (
  data: AssessmentData | ConfigData | ExtensionData | ReferencesCatalog,
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
    const msg = ajv2020.errorsText(validator.errors);
    throw new Error(`Schema validation failed: ${msg}`);
  }
};
