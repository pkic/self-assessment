import React, { useEffect, useState } from "react";
import { Assessment } from "./components/Assessment/Assessment";
import { EvidenceAssessment } from "./components/EvidenceAssessment/EvidenceAssessment";
import { parseAssessmentProfile } from "./assessment-engine/profile";
import type { AssessmentProfileData } from "./assessment-engine/types";
import {
  fetchTextWithLimit,
  MAX_PROFILE_YAML_BYTES,
} from "./assessment-engine/fetch";
import {
  DEFAULT_ASSESSMENT_PROFILE,
  getBundledAssessmentProfileYaml,
} from "./defaults/assessmentProfiles";

interface AppProps {
  dataUrl: string | null;
  referencesUrl: string | null;
  modes?: string | null;
  profile?: string | null;
  profileUrl?: string | null;
}

const App: React.FC<AppProps> = ({
  dataUrl,
  referencesUrl,
  modes,
  profile: profileId,
  profileUrl,
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
          : getBundledAssessmentProfileYaml(
              profileId ?? DEFAULT_ASSESSMENT_PROFILE,
            );
        if (!yaml) {
          throw new Error(`Unknown assessment profile: ${profileId}`);
        }
        const parsed = parseAssessmentProfile(yaml);
        if (!cancelled) setProfile(parsed);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [profileId, profileUrl]);

  if (error) return <div role="alert">{error}</div>;
  if (!profile) return <div role="status">Loading assessment profile…</div>;

  const experiences: Record<string, React.ReactNode> = {
    "weighted-maturity": (
      <Assessment
        src={dataUrl}
        references={referencesUrl}
        modes={modes}
        profile={profile}
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
