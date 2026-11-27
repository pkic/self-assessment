import { RELEASED_MODELS } from "../generated/models";
import { DEFAULT_MODEL_VERSION, getBundledModelYaml } from "./bundledData";

/**
 * Raw YAML for a bundled model: PKIMM from bundledData, other models from
 * the lock file. Without a version, the model's latest non-draft release.
 */
export const getBundledAssessmentModelYaml = (
  modelId: string,
  version?: string,
): string | undefined => {
  if (modelId === "pkimm") {
    return getBundledModelYaml(version ?? DEFAULT_MODEL_VERSION) ?? undefined;
  }
  const releases = RELEASED_MODELS.filter(
    (model) => model.assessment === modelId,
  );
  const wanted = version ?? latestRelease(releases)?.version;
  return releases.find((model) => model.version === wanted)?.yaml;
};

export const compareVersions = (a: string, b: string): number => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
};

/** The newest entry that is not a draft. */
export const latestRelease = <T extends { version: string; draft: boolean }>(
  entries: T[],
): T | undefined => {
  const released = entries
    .filter((entry) => !entry.draft)
    .sort((a, b) => compareVersions(a.version, b.version));
  return released[released.length - 1];
};
