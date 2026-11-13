import yaml from "js-yaml";
import pkimmProfile from "../public/pkimm-self-assessment-profile-1.0.0.yaml";
import { RELEASED_PROFILES } from "../generated/models";
import { latestRelease } from "./assessmentModels";

export const DEFAULT_ASSESSMENT_PROFILE = "pkimm-self-assessment";

export interface BundledProfile {
  id: string;
  modelId: string;
  /** The model version this profile assesses. */
  version: string;
  draft: boolean;
  /**
   * Whether the profile follows the host's modelVersion choice instead of
   * naming one model version (PKIMM loads any bundled PKIMM release).
   */
  anyVersion: boolean;
  yaml: string;
}

const describe = (
  text: string,
  draft: boolean,
  anyVersion: boolean,
): BundledProfile => {
  const { profile } = yaml.load(text) as {
    profile: { id: string; model: { id: string; version: string } };
  };
  return {
    id: profile.id,
    modelId: profile.model.id,
    version: profile.model.version,
    draft,
    anyVersion,
    yaml: text,
  };
};

// The PKIMM profile is owned by this repository; the others come with their
// model releases from the lock file (drafts only in preview builds).
export const BUNDLED_PROFILES: BundledProfile[] = [
  describe(pkimmProfile, false, true),
  ...RELEASED_PROFILES.map((entry) => describe(entry.yaml, entry.draft, false)),
];

export interface ProfileChoice {
  /** A bundled profile id, e.g. pqcmm-self-assessment. */
  profile?: string | null;
  /** A model id, e.g. pqcmm, used when no profile is named. */
  model?: string | null;
  /** The model version to assess; defaults to the latest release. */
  modelVersion?: string | null;
}

/**
 * Picks a bundled profile. An unknown modelVersion falls back to the latest
 * release of that profile with a console error, as the PKIMM loader does.
 */
export const resolveBundledProfile = ({
  profile,
  model,
  modelVersion,
}: ProfileChoice): BundledProfile | null => {
  const id =
    profile ??
    (model
      ? BUNDLED_PROFILES.find((entry) => entry.modelId === model)?.id
      : DEFAULT_ASSESSMENT_PROFILE);
  const candidates = BUNDLED_PROFILES.filter((entry) => entry.id === id);
  if (candidates.length === 0) return null;
  const versionAgnostic = candidates.find((entry) => entry.anyVersion);
  if (versionAgnostic) return versionAgnostic;
  if (!modelVersion) return latestRelease(candidates) ?? null;
  const exact = candidates.find((entry) => entry.version === modelVersion);
  if (exact) return exact;
  const fallback = latestRelease(candidates) ?? null;
  console.error(
    `${id} has no bundled model version ${modelVersion}; loading ${fallback?.version}.`,
  );
  return fallback;
};

export const getBundledAssessmentProfileYaml = (
  id: string,
  modelVersion?: string,
): string | null =>
  resolveBundledProfile({ profile: id, modelVersion })?.yaml ?? null;
