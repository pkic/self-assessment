import modelV1 from "../public/pkimm-model-1.0.0.yaml";
// Released models are fetched at build time from their repositories
// (models.lock.json, scripts/fetch-models.mjs). The 1.0.0 model above is a
// frozen migration fixture kept in this repository.
import modelV2 from "../generated/models/pkimm-model-2.0.0.yaml";
import referencesYaml from "../generated/models/pkimm-references.yaml";

// The model version loaded when the host supplies no `dataUrl`.
export const DEFAULT_MODEL_VERSION = "2.0.0";

// Both versions are held in a map so webpack retains each bundled string
// (no tree-shaking of the non-default version).
const BUNDLED_MODELS: Record<string, string> = {
  "1.0.0": modelV1,
  "2.0.0": modelV2,
};

// Raw YAML for a bundled model version, or null when the version is unknown.
export function getBundledModelYaml(version: string): string | null {
  return BUNDLED_MODELS[version] ?? null;
}

// The references catalog used when the host supplies no `referencesUrl`.
export const BUNDLED_REFERENCES_YAML: string = referencesYaml;
