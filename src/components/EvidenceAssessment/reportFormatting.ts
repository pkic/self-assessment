import type { EvidenceAssessmentRecord } from "./types";

const replaceMarkdownLinks = (value: string): string => {
  let result = "";
  let cursor = 0;
  while (cursor < value.length) {
    const labelStart = value.indexOf("[", cursor);
    if (labelStart < 0) return result + value.slice(cursor);
    const labelEnd = value.indexOf("](", labelStart + 1);
    if (labelEnd < 0) return result + value.slice(cursor);
    const urlEnd = value.indexOf(")", labelEnd + 2);
    if (urlEnd < 0) return result + value.slice(cursor);
    result += value.slice(cursor, labelStart);
    result += value.slice(labelStart + 1, labelEnd);
    cursor = urlEnd + 1;
  }
  return result;
};

export const plainReportText = (value: string): string =>
  replaceMarkdownLinks(value)
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
