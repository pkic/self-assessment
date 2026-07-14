import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { LevelDistribution } from "../reportData";
import { Table, TableRow, TableCell, TableColumn } from "./Table";
import { styles } from "./theme";

const DISTRIBUTION_COLUMNS: TableColumn[] = [
  { width: "30%", label: "Category" },
  { width: "8%", label: "N/A" },
  { width: "14%", label: "Not Assessed" },
  { width: "7%", label: "1" },
  { width: "7%", label: "2" },
  { width: "7%", label: "3" },
  { width: "7%", label: "4" },
  { width: "7%", label: "5" },
  { width: "13%", label: "Total applicable" },
];

const totalsCells = (
  totals: {
    notApplicable: number;
    notAssessed: number;
    levels: [number, number, number, number, number];
    totalApplicable: number;
  },
  bold?: boolean,
): React.ReactNode[] => [
  <TableCell key="na" width={DISTRIBUTION_COLUMNS[1].width} bold={bold}>
    {totals.notApplicable}
  </TableCell>,
  <TableCell
    key="not-assessed"
    width={DISTRIBUTION_COLUMNS[2].width}
    bold={bold}
  >
    {totals.notAssessed}
  </TableCell>,
  ...totals.levels.map((count, idx) => (
    <TableCell
      key={`level-${idx}`}
      width={DISTRIBUTION_COLUMNS[3 + idx].width}
      bold={bold}
    >
      {count}
    </TableCell>
  )),
  <TableCell key="total" width={DISTRIBUTION_COLUMNS[8].width} bold={bold}>
    {totals.totalApplicable}
  </TableCell>,
];

// Renders the per-category level distribution as a PDF table: module
// header rows, one row per category, a subtotal row per module, and a
// final total row across all modules. Mirrors the on-screen table in
// UnifiedReport.tsx (Category / N/A / Not Assessed / 1..5 / Total
// applicable).
export const LevelDistributionTable: React.FC<{
  distribution: LevelDistribution;
}> = ({ distribution }) => (
  <View>
    {distribution.grain === "category" && (
      <Text style={[styles.about_text, { marginBottom: 6 }]}>
        Counts are category-level (no requirement ratings yet).
      </Text>
    )}
    <Table header columns={DISTRIBUTION_COLUMNS}>
      {distribution.groups.flatMap((group) => [
        <TableRow key={`${group.moduleId}-header`} zebra>
          <TableCell width="100%" bold>
            {group.moduleId} — {group.module}
          </TableCell>
        </TableRow>,
        ...group.rows.map((row, idx) => (
          <TableRow key={row.key} zebra={idx % 2 === 1}>
            <TableCell width={DISTRIBUTION_COLUMNS[0].width}>
              {row.categoryName}
            </TableCell>
            {totalsCells(row)}
          </TableRow>
        )),
        <TableRow key={`${group.moduleId}-subtotal`} zebra>
          <TableCell width={DISTRIBUTION_COLUMNS[0].width} bold>
            Subtotal
          </TableCell>
          {totalsCells(group.subtotal, true)}
        </TableRow>,
      ])}
      <TableRow key="total">
        <TableCell width={DISTRIBUTION_COLUMNS[0].width} bold>
          Total
        </TableCell>
        {totalsCells(distribution.total, true)}
      </TableRow>
    </Table>
  </View>
);
