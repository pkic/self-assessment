import { Link, View } from "@react-pdf/renderer";
import React from "react";
import { primaryColor } from "../theme";
import { Table, TableRow, TableCell, TableColumn } from "../Table";
import { SectionHeading } from "../SectionHeading";
import type { SectionComponent } from "./SectionContext";

const REFERENCES_COLUMNS: TableColumn[] = [
  { width: "55%", label: "Reference" },
  { width: "30%", label: "Authority" },
  { width: "15%", label: "Regions" },
];

// Flowing References appendix for the Assessment/Detailed tiers — the same
// content (a reference table sorted by title) as the standalone
// ReferencesAppendixPage, but as a section: no own <Page> and no own Footer
// (ReportDocument owns the single footer). This section must never set
// `break` on its root View — "references" is already in ReportDocument's
// PAGE_BREAK_BEFORE set, which applies the page break itself (and only when
// this isn't the first rendered body section).
export const ReferencesAppendix: SectionComponent = (ctx) => {
  if (ctx.references.length === 0) return null;
  const sorted = [...ctx.references].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  return (
    <View>
      <SectionHeading>References</SectionHeading>
      <Table header columns={REFERENCES_COLUMNS}>
        {sorted.map((ref) => (
          <TableRow key={ref.id}>
            <TableCell width={REFERENCES_COLUMNS[0].width}>
              {ref.url ? (
                <Link
                  src={ref.url}
                  style={{ color: primaryColor, textDecoration: "underline" }}
                >
                  {ref.title}
                </Link>
              ) : (
                ref.title
              )}
            </TableCell>
            <TableCell width={REFERENCES_COLUMNS[1].width}>
              {ref.authority ?? "—"}
            </TableCell>
            <TableCell width={REFERENCES_COLUMNS[2].width}>
              {ref.regions?.join(", ") ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </View>
  );
};
