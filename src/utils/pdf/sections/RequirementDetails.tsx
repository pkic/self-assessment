import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { styles } from "../theme";
import {
  Table,
  TableRow,
  TableTextRow,
  TableCell,
  TableColumn,
  isLongText,
} from "../Table";
import { LevelPill } from "../LevelPill";
import { SectionHeading } from "../SectionHeading";
import type { RequirementFilterState } from "../../requirementFilter";
import type { SectionComponent } from "./SectionContext";

const REQUIREMENT_COLUMNS: TableColumn[] = [
  { width: "34%", label: "Requirement" },
  { width: "18%", label: "Result" },
  { width: "24%", label: "Notes" },
  { width: "24%", label: "Evidence" },
];

// A long-text row's meta line keeps the header's Requirement/Result column
// positions (the notes/evidence move to full-width TableTextRows below); the
// freed Notes+Evidence span renders as one empty cell so the pill stays
// aligned under the "Result" header label.
const META_EMPTY_WIDTH = "48%";

// Same labels the Report tab's export-time filter chips use (UnifiedReport.tsx)
// so the printed note reads consistently with the on-screen control that
// produced it. "na" isn't offered by that control (in-scope rows only ever
// reach this section) but is included defensively since RequirementFilterState
// still allows it.
const STATUS_LABELS: Record<string, string> = {
  "not-assessed": "Not assessed",
  "1": "Level 1",
  "2": "Level 2",
  "3": "Level 3",
  "4": "Level 4",
  "5": "Level 5",
  na: "Not applicable",
  completed: "Completed",
  flagged: "Flagged",
};

const describeRequirementFilter = (f: RequirementFilterState): string => {
  const parts: string[] = [];
  const text = f.text.trim();
  if (text) parts.push(`"${text}"`);
  if (f.statuses.size > 0) {
    parts.push([...f.statuses].map((s) => STATUS_LABELS[s] ?? s).join(", "));
  }
  return parts.join(" · ");
};

const isFilterActive = (
  f: RequirementFilterState | undefined,
): f is RequirementFilterState =>
  !!f && (f.text.trim() !== "" || f.statuses.size > 0);

// Per-requirement results for the Detailed tier only: every in-scope
// requirement's rating, rationale/notes, and evidence, grouped module ->
// category, mirroring buildRequirementDetailRows' own grouping (which already
// applies buildScopeExclusions' skip logic, so nothing here duplicates the
// Scope section). Gated on ctx directly. No section-owned break —
// "requirementDetails" is already in ReportDocument's PAGE_BREAK_BEFORE set.
export const RequirementDetails: SectionComponent = (ctx) => {
  if (ctx.requirementDetailRows.length === 0) return null;

  const filterActive = isFilterActive(ctx.requirementFilter);

  return (
    <View>
      <SectionHeading>Requirement Assessment</SectionHeading>
      {filterActive && (
        <Text style={[styles.about_text, { marginBottom: 8 }]}>
          Showing requirements matching:{" "}
          {describeRequirementFilter(ctx.requirementFilter!)}
        </Text>
      )}
      {/* Modules are flattened — no per-module wrapper View, and a SMALL
          category renders as one atomic block. In @react-pdf v4.5.1,
          relocating a breakable wrapper that contains a wrap={false} group
          (the table's header glue) can CRUSH its content into zero-height
          overlapping rows at the page bottom (caught by the quality audit's
          overlapping-text check); relocating a directly-atomic block is
          clean, and a taller-than-page table splits cleanly — so every
          category takes one of those two proven paths, never the broken
          middle one. */}
      {ctx.requirementDetailRows.map((group) => (
        <React.Fragment key={group.moduleId}>
          {group.categories.map((category, catIdx) => (
            <View
              key={category.categoryKey}
              style={{ marginBottom: 8 }}
              wrap={
                category.rows.length > 12 ||
                category.rows.some((r) => isLongText(r.notes, r.evidence))
              }
            >
              <Table
                header
                columns={REQUIREMENT_COLUMNS}
                // The module/category headings ride the header glue so they
                // can never strand at a page bottom with the table's rows on
                // the next page (the "heading then a blank rest of the page"
                // artifact). Module heading only above its first category.
                // Deliberately plain <Text>, NOT SectionHeading: the glue
                // already guarantees the heading travels with the first row,
                // and a minPresenceAhead node inside a wrap={false} group
                // trips a v4.5.1 collapse that crushes the table's trailing
                // rows into the page bottom (caught by the quality audit's
                // overlapping-text check).
                leadIn={
                  <>
                    {catIdx === 0 && (
                      <Text style={[styles.about_heading, styles.boldText]}>
                        {group.moduleId} — {group.module}
                      </Text>
                    )}
                    <Text style={[styles.about_text, styles.boldText]}>
                      {category.categoryName}
                    </Text>
                  </>
                }
              >
                {category.rows.flatMap((row) => {
                  const long = isLongText(row.notes, row.evidence);
                  const meta = (
                    <TableRow key={row.requirementKey}>
                      <TableCell width={REQUIREMENT_COLUMNS[0].width}>
                        {row.requirementDescription}
                        {row.completed && " (completed)"}
                        {row.flagged && " (flagged)"}
                      </TableCell>
                      <TableCell plain width={REQUIREMENT_COLUMNS[1].width}>
                        <LevelPill level={row.level} variant="full" />
                      </TableCell>
                      {long ? (
                        <TableCell width={META_EMPTY_WIDTH}>{""}</TableCell>
                      ) : (
                        <>
                          <TableCell width={REQUIREMENT_COLUMNS[2].width}>
                            {row.notes || "N/A"}
                          </TableCell>
                          <TableCell width={REQUIREMENT_COLUMNS[3].width}>
                            {row.evidence || "N/A"}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                  if (!long) return [meta];
                  // Long notes/evidence never render inside a narrow column
                  // (see Table.tsx's LONG_TEXT_CHARS): the meta row stays
                  // compact and atomic, the full text flows below it as
                  // full-width breakable rows.
                  const parts = [meta];
                  if (row.notes) {
                    parts.push(
                      <TableTextRow
                        key={`${row.requirementKey}-notes`}
                        label="Notes"
                      >
                        {row.notes}
                      </TableTextRow>,
                    );
                  }
                  if (row.evidence) {
                    parts.push(
                      <TableTextRow
                        key={`${row.requirementKey}-evidence`}
                        label="Evidence"
                      >
                        {row.evidence}
                      </TableTextRow>,
                    );
                  }
                  return parts;
                })}
              </Table>
            </View>
          ))}
        </React.Fragment>
      ))}
    </View>
  );
};
