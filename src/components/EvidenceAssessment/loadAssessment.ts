// Loading steps for the evidence assessment screen, kept out of the component
// so its effect stays a short sequence of awaits.
import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import {
  fetchTextWithLimit,
  MAX_MODEL_YAML_BYTES,
} from "../../assessment-engine/fetch";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { newEvidenceAssessment } from "./machine";
import { parseEvidenceModel } from "./model";
import {
  listEvidenceAssessments,
  loadActiveEvidenceAssessment,
  saveEvidenceAssessment,
} from "./storage";
import type { EvidenceAssessmentRecord, EvidenceModelData } from "./types";

export const compatibleRecord = (
  record: EvidenceAssessmentRecord | undefined,
  model: EvidenceModelData,
): record is EvidenceAssessmentRecord =>
  Boolean(
    record?.modelId === model.model.id &&
    record?.dataVersion === model.model.version,
  );

/**
 * Loads the model from the host-supplied URL, or the bundled copy when none
 * is set, and checks that it is the model the profile was written for.
 */
export const loadEvidenceModel = async (
  src: string | null,
  profile: AssessmentProfileData,
  signal: AbortSignal,
): Promise<EvidenceModelData> => {
  const text = src
    ? await fetchTextWithLimit(
        src,
        "assessment model",
        MAX_MODEL_YAML_BYTES,
        signal,
      )
    : getBundledAssessmentModelYaml(profile.profile.model.id);
  if (!text) {
    throw new Error(
      `No bundled model is available for ${profile.profile.model.id}; provide dataUrl.`,
    );
  }
  const parsed = parseEvidenceModel(text);
  if (
    profile.profile.model.id !== parsed.model.id ||
    profile.profile.model.version !== parsed.model.version
  ) {
    throw new Error("The assessment profile does not match the loaded model.");
  }
  return parsed;
};

/**
 * Picks the assessment to show: the active saved one when it belongs to this
 * model version, otherwise a new one, which is saved straight away.
 */
export const loadActiveAssessment = async (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
): Promise<{
  current: EvidenceAssessmentRecord;
  assessments: EvidenceAssessmentRecord[];
}> => {
  const [active, stored] = await Promise.all([
    loadActiveEvidenceAssessment(),
    listEvidenceAssessments(),
  ]);
  const sameVersion = stored.filter(
    (item) => item.dataVersion === model.model.version,
  );
  if (compatibleRecord(active, model)) {
    return { current: active, assessments: sameVersion };
  }
  const current = newEvidenceAssessment(model, profile);
  await saveEvidenceAssessment(current);
  return { current, assessments: [current, ...sameVersion] };
};
