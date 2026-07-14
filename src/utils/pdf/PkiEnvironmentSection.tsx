import { Text, View } from "@react-pdf/renderer";
import React from "react";
import type { PkiEnvironment } from "../../types/types";
import { styles } from "./theme";

// PKI environment fields render only when non-empty — a quick assessment
// with none of these filled in shows no "PKI environment" section at all.
const PKI_ENVIRONMENT_FIELDS: { key: keyof PkiEnvironment; label: string }[] = [
  { key: "components", label: "Components" },
  { key: "outOfScopeConsiderations", label: "Out-of-scope considerations" },
  { key: "highLevelDesign", label: "High-level design" },
  { key: "pointsOfInteraction", label: "Points of interaction" },
];

export const PkiEnvironmentSection: React.FC<{
  pkiEnvironment: PkiEnvironment;
}> = ({ pkiEnvironment }) => {
  const filled = PKI_ENVIRONMENT_FIELDS.filter(
    ({ key }) => pkiEnvironment[key],
  );
  if (filled.length === 0) return null;
  return (
    <>
      <Text style={[styles.heading, { marginTop: 20 }]}>PKI Environment</Text>
      {filled.map(({ key, label }) => (
        <View key={key} style={{ marginBottom: 8 }}>
          <Text style={[styles.about_text, styles.boldText]}>{label}</Text>
          <Text style={styles.about_text}>{pkiEnvironment[key]}</Text>
        </View>
      ))}
    </>
  );
};
