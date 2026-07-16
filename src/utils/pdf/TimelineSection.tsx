import { View } from "@react-pdf/renderer";
import React from "react";
import { Table, TableRow, TableCell, TableColumn } from "./Table";
import { buildTimeline } from "./timeline";
import { SectionHeading } from "./SectionHeading";

const ALWAYS_ROWS = ["Started", "Target completion", "Completed"] as const;

const TIMELINE_COLUMNS: TableColumn[] = [{ width: "30%" }, { width: "70%" }];

export interface TimelineSectionProps {
  startDate: string;
  targetDate: string;
  finishDate: string;
  alwaysShow?: boolean;
}

// Typed as a plain function returning `ReactElement | null` (narrower than
// React.FC, whose React 19 return type also permits `undefined`/Promise) so
// the `Timeline` section (./sections/Timeline.tsx) can call it directly as a
// function and get its null-ness back synchronously, per the SectionComponent
// contract — while still being usable as a JSX component (any function
// `(props) => ReactElement | null` is), which is how the self report's
// CoreReportDocument keeps using it directly.
export const TimelineSection = ({
  startDate,
  targetDate,
  finishDate,
  alwaysShow = false,
}: TimelineSectionProps): React.ReactElement | null => {
  const t = buildTimeline({ startDate, targetDate, finishDate });
  if (!alwaysShow && !t.hasAnyDate) return null;

  const byLabel = new Map(t.rows.map((r) => [r.label, r.value]));
  const rows = alwaysShow
    ? ALWAYS_ROWS.map((label) => ({
        label,
        value: byLabel.get(label) || "Not specified",
      }))
    : t.rows;

  return (
    <View>
      <SectionHeading>Timeline</SectionHeading>
      <Table columns={TIMELINE_COLUMNS}>
        {rows.map((r) => (
          <TableRow key={r.label}>
            <TableCell width="30%" bold>
              {`${r.label}:`}
            </TableCell>
            <TableCell width="70%">{r.value}</TableCell>
          </TableRow>
        ))}
        {t.durationDays !== null && (
          <TableRow key="duration">
            <TableCell width="30%" bold>
              Duration:
            </TableCell>
            <TableCell width="70%">{`${t.durationDays} days`}</TableCell>
          </TableRow>
        )}
      </Table>
    </View>
  );
};
