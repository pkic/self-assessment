import yaml from "js-yaml";
import type { ErrorObject } from "ajv";
import { validatePqcmmModel100 } from "../generated/validators-2020";
import type { PqcmmModelData } from "./types";

const errorsText = (errors: ErrorObject[] | null | undefined): string =>
  (errors ?? [])
    .map((error) => `data${error.instancePath} ${error.message ?? ""}`)
    .join(", ") || "validation failed";

export const parsePqcmmModel = (yamlText: string): PqcmmModelData => {
  const parsed = yaml.load(yamlText);
  if (!validatePqcmmModel100(parsed)) {
    throw new Error(
      `PQCMM model schema validation failed: ${errorsText(validatePqcmmModel100.errors)}`,
    );
  }
  return parsed as PqcmmModelData;
};
