import canonicalize from "canonicalize";
import { sha256Hex } from "./evidence";
import type {
  AssessmentProfileData,
  AssuranceSummary,
  EvidenceFile,
} from "./types";

export interface IntegrityProtectedAssessment {
  id: string;
  name: string;
  dataVersion: string;
  subject: Record<string, string>;
  assuranceProfileId: string;
  criterionProgress: unknown;
  questionProgress: unknown;
  evidenceFiles: EvidenceFile[];
  createdAt: string;
  updatedAt: string;
}

export const assessmentIntegrityPayload = (
  modelId: string,
  profile: AssessmentProfileData,
  record: IntegrityProtectedAssessment,
): unknown => ({
  model: { id: modelId, version: record.dataVersion },
  profile: {
    id: profile.profile.id,
    version: profile.profile.version,
  },
  assessment: {
    id: record.id,
    name: record.name,
    subject: record.subject,
    assuranceProfileId: record.assuranceProfileId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  },
  criterionProgress: record.criterionProgress,
  questionProgress: record.questionProgress,
  evidenceManifest: record.evidenceFiles.map(
    ({ id, name, mediaType, size, sha256, addedAt }) => ({
      id,
      name,
      mediaType,
      size,
      sha256,
      addedAt,
    }),
  ),
});

export const assessmentPayloadSha256 = async (
  modelId: string,
  profile: AssessmentProfileData,
  record: IntegrityProtectedAssessment,
): Promise<string> => {
  const serialized = canonicalize(
    assessmentIntegrityPayload(modelId, profile, record),
  );
  if (!serialized) throw new Error("Unable to canonicalize assessment data.");
  return sha256Hex(new TextEncoder().encode(serialized));
};

export const assuranceSummary = (
  record: IntegrityProtectedAssessment,
): AssuranceSummary => ({
  claimStatus: "self-asserted",
  evidenceStatus:
    record.evidenceFiles.length > 0 ? "provided-not-reviewed" : "none",
  independentVerification: false,
  certificationStatus: "not-certified",
});
