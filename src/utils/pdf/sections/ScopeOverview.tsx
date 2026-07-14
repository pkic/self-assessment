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
import { SectionHeading } from "../SectionHeading";
import type { SectionComponent } from "./SectionContext";

const EXCLUSION_COLUMNS: TableColumn[] = [
  { width: "35%", label: "Item" },
  { width: "15%", label: "Type" },
  { width: "50%", label: "Reason" },
];

// Detailed scope info for the Assessment/Detailed tiers — the Attestation
// tier gets only the one-line buildScopeCoverageLine summary rendered inside
// AttestationStatement, not this section. Reuses ctx.coverage/ctx.exclusions
// (buildScopeCoverage/buildScopeExclusions) as-is; no scoring recomputed
// here. Always renders a coverage statement plus either the excluded-items
// table or an "all in scope" fallback line — never an empty table.
export const ScopeOverview: SectionComponent = (ctx) => {
  const { coverage, exclusions } = ctx;

  return (
    <View>
      <SectionHeading>Scope</SectionHeading>
      <Text style={[styles.about_text, { marginBottom: 10 }]}>
        {coverage.categoriesInScope} of {coverage.categoriesTotal} categories
        and {coverage.requirementsInScope} of {coverage.requirementsTotal}{" "}
        requirements are in scope.
      </Text>
      {exclusions.length > 0 ? (
        <Table header columns={EXCLUSION_COLUMNS}>
          {exclusions.flatMap((exclusion) => {
            const itemName =
              exclusion.scope === "requirement"
                ? (exclusion.requirementName ?? "")
                : exclusion.categoryName;
            const long = isLongText(exclusion.reason);
            const meta = (
              <TableRow key={exclusion.key}>
                <TableCell width={EXCLUSION_COLUMNS[0].width}>
                  {itemName}
                  {exclusion.derived && " (derived)"}
                </TableCell>
                <TableCell width={EXCLUSION_COLUMNS[1].width}>
                  {exclusion.scope === "requirement"
                    ? "Requirement"
                    : "Category"}
                </TableCell>
                <TableCell width={EXCLUSION_COLUMNS[2].width}>
                  {long ? "" : exclusion.reason || "No reason given"}
                </TableCell>
              </TableRow>
            );
            // A long reason never renders inside the 50% column (see
            // Table.tsx's LONG_TEXT_CHARS) — it flows below the atomic meta
            // row as a full-width breakable row.
            if (!long) return [meta];
            return [
              meta,
              <TableTextRow key={`${exclusion.key}-reason`} label="Reason">
                {exclusion.reason ?? ""}
              </TableTextRow>,
            ];
          })}
        </Table>
      ) : (
        <Text style={styles.about_text}>
          All categories and requirements are in scope.
        </Text>
      )}
    </View>
  );
};
