import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { ScopeExclusion } from "../reportData";
import { styles } from "./theme";

// Titled list of out-of-scope categories/requirements for the PDF report.
// Mirrors the on-screen scope disclosure: a category-level exclusion (its
// own toggle, or every requirement individually scoped out) is listed once
// and never followed by its requirements — see buildScopeExclusions in
// reportData.ts, which already collapses that case before this component
// ever sees the list.
export const ScopeSection: React.FC<{ exclusions: ScopeExclusion[] }> = ({
  exclusions,
}) => {
  if (exclusions.length === 0) return null;
  return (
    <View>
      <Text style={styles.heading}>Out of scope</Text>
      {exclusions.map((exclusion) => (
        <View key={exclusion.key} style={{ marginBottom: 6 }}>
          <Text style={[styles.about_text, styles.boldText]}>
            {exclusion.moduleId} — {exclusion.categoryName}
            {exclusion.scope === "requirement" &&
              exclusion.requirementName &&
              ` — ${exclusion.requirementName}`}
            {exclusion.derived && " (derived)"}
          </Text>
          {exclusion.reason && (
            <Text style={styles.about_text}>{exclusion.reason}</Text>
          )}
        </View>
      ))}
    </View>
  );
};
