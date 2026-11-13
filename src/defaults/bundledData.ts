import modelV1 from "../public/pkimm-model-1.0.0.yaml";
// Released models are fetched at build time from their repositories
// (models.lock.json, scripts/fetch-models.mjs). The 1.0.0 model above is a
// frozen migration fixture kept in this repository.
import referencesYaml from "../generated/models/pkimm-references.yaml";
import { RELEASED_MODELS } from "../generated/models";

const compareVersions = (a: string, b: string): number => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
};

/** Every PKIMM version bundled from the lock file, oldest first. */
export const RELEASED_MODEL_VERSIONS: string[] = RELEASED_MODELS.filter(
  (model) => model.assessment === "pkimm",
)
  .map((model) => model.version)
  .sort(compareVersions);

// The model version loaded when the host asks for none: the latest release.
export const DEFAULT_MODEL_VERSION =
  RELEASED_MODEL_VERSIONS[RELEASED_MODEL_VERSIONS.length - 1];

// Every bundled version is held in this map, so webpack keeps each string.
// The 1.0.0 model is the migration fixture; the rest come from the lock file.
const BUNDLED_MODELS: Record<string, string> = {
  "1.0.0": modelV1,
  ...Object.fromEntries(
    RELEASED_MODELS.filter((model) => model.assessment === "pkimm").map(
      (model) => [model.version, model.yaml],
    ),
  ),
};

// Raw YAML for a bundled model version, or null when the version is unknown.
export function getBundledModelYaml(version: string): string | null {
  return BUNDLED_MODELS[version] ?? null;
}

// The references catalog used when the host supplies no `referencesUrl`.
export const BUNDLED_REFERENCES_YAML: string = referencesYaml;
