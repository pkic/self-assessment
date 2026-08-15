import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import type { EvidenceAssessmentRecord } from "./types";
import { ReportPageNumber } from "./ReportPageNumber";
import { reportStyles as styles } from "./reportStyles";

interface Props {
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
  score: GatedMaturityScore;
}

export const EvidenceSummaryPage: React.FC<Props> = ({
  profile,
  record,
  score,
}) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.heading}>Assessment scope and result</Text>
    {[
      ["Assessment", record.name],
      ...profile.runtime.subjectFields.map((field) => [
        field.label,
        record.subject[field.key],
      ]),
    ].map(([label, value]) => (
      <View key={label} style={styles.metadataRow}>
        <Text style={styles.metadataLabel}>{label}</Text>
        <Text style={styles.metadataValue}>{value || "Not specified"}</Text>
      </View>
    ))}
    <View style={styles.summaryGrid}>
      {[
        [score.achievedLevel ?? "—", profile.report.claimLabel],
        [`${score.criteriaMet}/${score.criteriaTotal}`, "Criteria marked Met"],
        [
          `${score.questionsAnswered}/${score.questionsTotal}`,
          "Questions answered",
        ],
        [score.evidenceFiles, "Evidence files"],
      ].map(([value, label]) => (
        <View key={label} style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{value}</Text>
          <Text style={styles.summaryLabel}>{label}</Text>
        </View>
      ))}
    </View>
    <Text style={styles.subheading}>Level gates</Text>
    {score.levelResults.map((result) => (
      <View key={result.level} style={styles.item}>
        <Text style={styles.label}>
          Level {result.level}:{" "}
          {result.met ? "all criteria met" : "not established"}
        </Text>
        <Text style={styles.detail}>
          {result.criteriaMet} of {result.criteriaTotal} criteria marked Met
        </Text>
      </View>
    ))}
    <ReportPageNumber />
  </Page>
);
