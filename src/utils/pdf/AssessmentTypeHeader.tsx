import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { styles } from "./theme";
import { AssessmentType, mapAssessmentType } from "./assessmentType";

export type { AssessmentType } from "./assessmentType";
export { mapAssessmentType } from "./assessmentType";

// Renders the assessment type ("Self-assessed" / "Formal" / "Third-party")
// with its confidence rung. An unspecified type ("") renders its label with
// no confidence text, since there is nothing to rate confidence against.
export const AssessmentTypeHeader: React.FC<{ type: AssessmentType }> = ({
  type,
}) => {
  const { label, confidence } = mapAssessmentType(type);
  return (
    <View>
      <Text style={styles.about_text}>
        {label}
        {confidence !== null && ` · ${confidence} confidence`}
      </Text>
    </View>
  );
};
