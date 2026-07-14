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
import type { SectionComponent } from "./SectionContext";

const CRITERIA_COLUMNS: TableColumn[] = [{ width: "30%" }, { width: "70%" }];

const LIMITING_COLUMNS: TableColumn[] = [
  { width: "75%", label: "Limiting requirement" },
  { width: "25%", label: "Level" },
];

// Per-category "what's blocking the next level" analysis for the Detailed
// tier only, from ctx.gapRows (buildGapToNextLevel — already restricted to
// requirement-assessed categories at levels 1-4). Gated on ctx directly.
export const GapToNext: SectionComponent = (ctx) => {
  if (ctx.gapRows.length === 0) return null;

  return (
    <View>
      <SectionHeading>Gap to Next Level</SectionHeading>
      {ctx.gapRows.map((row) => (
        // Each category block is atomic: its parts are all bounded (model
        // text + a handful of limiting rows, far under a page), and letting
        // the block split at a page boundary trips a v4.5.1 corruption —
        // the limiting table's header glue can render zero-height at the
        // page bottom, over-printing its rows into an unreadable smear
        // (caught by the quality audit's overlapping-text check).
        <View key={row.categoryKey} style={{ marginBottom: 14 }} wrap={false}>
          <Text style={[styles.about_text, styles.boldText]}>
            {row.module} — {row.categoryName}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 9, marginRight: 4 }}>Current:</Text>
            <LevelPill level={row.currentLevel} variant="number" />
            <Text style={{ fontSize: 9, marginHorizontal: 6 }}>Next:</Text>
            <LevelPill level={row.nextLevel} variant="number" />
            <Text style={{ fontSize: 9, marginLeft: 6 }}>
              Level {row.currentLevel} to Level {row.nextLevel}
              {row.nextLevelName ? ` (${row.nextLevelName})` : ""}
            </Text>
          </View>

          {row.nextLevelCriteria &&
            (isLongText(row.nextLevelCriteria) ? (
              // Long criteria never render inside the 70% column (see
              // Table.tsx's LONG_TEXT_CHARS): atomic label row + full-width
              // breakable text row.
              <Table columns={CRITERIA_COLUMNS}>
                <TableRow>
                  <TableCell width="100%" bold>
                    Next-level criteria
                  </TableCell>
                </TableRow>
                <TableTextRow>{row.nextLevelCriteria}</TableTextRow>
              </Table>
            ) : (
              <Table columns={CRITERIA_COLUMNS}>
                <TableRow>
                  <TableCell width={CRITERIA_COLUMNS[0].width} bold>
                    Next-level criteria
                  </TableCell>
                  <TableCell width={CRITERIA_COLUMNS[1].width}>
                    {row.nextLevelCriteria}
                  </TableCell>
                </TableRow>
              </Table>
            ))}

          {row.limitingRequirements.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Table header columns={LIMITING_COLUMNS}>
                {row.limitingRequirements.map((req) => (
                  <TableRow key={req.requirementKey}>
                    <TableCell width={LIMITING_COLUMNS[0].width}>
                      {req.description}
                    </TableCell>
                    <TableCell plain width={LIMITING_COLUMNS[1].width}>
                      <LevelPill level={req.level} variant="number" />
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};
