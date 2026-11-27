import React, { useEffect, useState } from "react";
import { Assessment } from "./components/Assessment/Assessment";
import { EvidenceAssessment } from "./components/EvidenceAssessment/EvidenceAssessment";
import { parseAssessmentProfile } from "./assessment-engine/profile";
import type { AssessmentProfileData } from "./assessment-engine/types";
import {
  fetchTextWithLimit,
  MAX_PROFILE_YAML_BYTES,
} from "./assessment-engine/fetch";
import { resolveBundledProfile } from "./defaults/assessmentProfiles";

interface AppProps {
  dataUrl: string | null;
  referencesUrl: string | null;
  modes?: string | null;
  profile?: string | null;
  profileUrl?: string | null;
  /** Selects the bundled profile for a model id when no profile is named. */
  model?: string | null;
  /** A bundled model release to load instead of the latest one. */
  modelVersion?: string | null;
}

const App: React.FC<AppProps> = ({
  dataUrl,
  referencesUrl,
  modes,
  profile: profileId,
  profileUrl,
  model,
  modelVersion,
}) => {
  const [profile, setProfile] = useState<AssessmentProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        const yaml = profileUrl
          ? await fetchTextWithLimit(
              profileUrl,
              "assessment profile",
              MAX_PROFILE_YAML_BYTES,
              controller.signal,
            )
          : resolveBundledProfile({ profile: profileId, model, modelVersion })
              ?.yaml;
        if (!yaml) {
          throw new Error(
            `Unknown assessment profile: ${profileId ?? model ?? ""}`,
          );
        }
        const parsed = parseAssessmentProfile(yaml);
        if (!cancelled) setProfile(parsed);
      } catch (error_) {
        if (!cancelled) {
          setError(error_ instanceof Error ? error_.message : String(error_));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [profileId, profileUrl, model, modelVersion]);

  if (error) return <div role="alert">{error}</div>;
  if (!profile) return <output>Loading assessment profile…</output>;

  const experiences: Record<string, React.ReactNode> = {
    "weighted-maturity": (
      <Assessment
        src={dataUrl}
        references={referencesUrl}
        modes={modes}
        profile={profile}
        modelVersion={modelVersion}
      />
    ),
    "evidence-gated-maturity": (
      <EvidenceAssessment src={dataUrl} profile={profile} />
    ),
  };
  const experience = experiences[profile.runtime.experience];
  if (!experience) {
    return (
      <div role="alert">
        Unsupported assessment experience: {profile.runtime.experience}
      </div>
    );
  }
  return experience;
};

export default App;
