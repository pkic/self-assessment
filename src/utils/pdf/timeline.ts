export interface TimelineModel {
  rows: { label: string; value: string }[];
  durationDays: number | null;
  hasAnyDate: boolean;
}

const MS_PER_DAY = 86400000;

// A date is "valid" only if it parses AND round-trips to the same YYYY-MM-DD
// (rejects 2026-13-40 etc.), matching the widget's strict date handling.
const validMs = (s: string): number | null => {
  if (!s) return null;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  if (new Date(ms).toISOString().slice(0, 10) !== s.slice(0, 10)) return null;
  return ms;
};

export const buildTimeline = (input: {
  startDate: string;
  targetDate: string;
  finishDate: string;
}): TimelineModel => {
  const startMs = validMs(input.startDate);
  const finishMs = validMs(input.finishDate);
  const rows: { label: string; value: string }[] = [];
  if (startMs !== null) rows.push({ label: "Started", value: input.startDate });
  if (validMs(input.targetDate) !== null)
    rows.push({ label: "Target completion", value: input.targetDate });
  if (finishMs !== null)
    rows.push({ label: "Completed", value: input.finishDate });
  const durationDays =
    startMs !== null && finishMs !== null
      ? Math.round((finishMs - startMs) / MS_PER_DAY)
      : null;
  return { rows, durationDays, hasAnyDate: rows.length > 0 };
};
