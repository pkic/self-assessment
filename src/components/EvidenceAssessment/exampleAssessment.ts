import { sha256Hex } from "../../assessment-engine/evidence";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { bytesToBase64 } from "./encoding";
import { newEvidenceAssessment } from "./machine";
import type { EvidenceAssessmentRecord, EvidenceModelData } from "./types";

export const buildExampleAssessment = async (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
): Promise<EvidenceAssessmentRecord> => {
  const record = newEvidenceAssessment(model, profile);
  record.name = "Example PQCMM self-assessment";
  record.subject = {
    ...record.subject,
    productName: "Example Quantum-Safe Gateway",
    productVersion: "4.2.0",
    vendorName: "Example Security Inc.",
    cpe: "cpe:2.3:a:example:quantum-safe_gateway:4.2.0:*:*:*:*:*:*:*",
    purl: "pkg:generic/example-quantum-safe-gateway@4.2.0",
    deploymentScope:
      "Production software release for managed gateway deployments.",
    assessorName: "Jordan Assessor",
    assessorOrganization: "Example Security Inc.",
    assessmentDate: "2026-08-15",
  };
  const evidenceBytes = new TextEncoder().encode(
    "Example evidence only. Release notes document hybrid key establishment support.",
  );
  record.evidenceFiles = [
    {
      id: "example-release-notes",
      name: "example-release-notes.txt",
      mediaType: "text/plain",
      size: evidenceBytes.length,
      sha256: await sha256Hex(evidenceBytes),
      addedAt: "2026-08-15T08:00:00.000Z",
      dataBase64: bytesToBase64(evidenceBytes),
    },
  ];
  for (const level of model.levels.filter(
    (candidate) => candidate.number <= 1,
  )) {
    for (const criterion of level.criteria.items) {
      record.criterionProgress[criterion.id] = {
        status: "met",
        evidenceStatement:
          level.number === 0
            ? "Supplier baseline declaration."
            : "See the attached example release notes.",
        notes: "Synthetic example; not an independently verified claim.",
        evidenceIds: level.number === 0 ? [] : ["example-release-notes"],
      };
    }
  }
  return record;
};
