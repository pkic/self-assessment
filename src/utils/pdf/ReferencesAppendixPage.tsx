import { Link, Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import { ReferenceEntry } from "../../types/types";
import { Footer, Header, TableHeaderRow, TableBodyRow } from "./primitives";
import { primaryColor, styles } from "./theme";

// Appendix page listing every reference cited by at least one rendered
// category. Sorted by title for a stable, alphabetical print order.
export const ReferencesAppendixPage: React.FC<{
  references: ReferenceEntry[];
  assessmentUrl: string;
  version: string;
}> = ({ references, assessmentUrl, version }) => {
  if (references.length === 0) return null;
  const sorted = [...references].sort((a, b) => a.title.localeCompare(b.title));
  return (
    <Page size="A4" style={styles.page} bookmark={{ title: "References" }}>
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <Text style={styles.title}>References</Text>
      <View style={styles.table}>
        <TableHeaderRow
          columns={[
            { width: "55%", label: "Reference" },
            { width: "30%", label: "Authority" },
            { width: "15%", label: "Regions" },
          ]}
        />
        {sorted.map((ref, idx) => (
          <TableBodyRow key={ref.id} idx={idx}>
            <View style={[styles.tableCol, { width: "55%" }]}>
              <Text style={styles.tableCell}>
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
              </Text>
            </View>
            <View style={[styles.tableCol, { width: "30%" }]}>
              <Text style={styles.tableCell}>{ref.authority ?? "—"}</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text style={styles.tableCell}>
                {ref.regions?.join(", ") ?? "—"}
              </Text>
            </View>
          </TableBodyRow>
        ))}
      </View>
    </Page>
  );
};
