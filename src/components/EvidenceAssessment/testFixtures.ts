import type { EvidenceAssessmentRecord } from "./types";

export const completePqcmmSubject = (
  assessment: EvidenceAssessmentRecord,
): EvidenceAssessmentRecord => {
  assessment.subject.productName ||= "Example product";
  assessment.subject.productVersion ||= "1.0.0";
  assessment.subject.assessmentDate ||= "2026-08-15";
  assessment.subject.cpe ||= "cpe:2.3:a:example:product:1.0.0:*:*:*:*:*:*:*";
  return assessment;
};
