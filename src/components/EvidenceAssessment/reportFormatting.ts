import type { EvidenceAssessmentRecord } from "./types";

export const plainReportText = (value: string): string =>
  value
    .replace(/\[([^\]]+)]\([^\)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\{\.[^}]+\}/g, "")
    .trim();

export const evidenceNames = (
  ids: string[],
  record: EvidenceAssessmentRecord,
): string => {
  const names = ids
    .map((id) => record.evidenceFiles.find((file) => file.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : "None attached";
};
