import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { buildMaturityGateVisualization } from "../../assessment-engine/visualizations/maturityGates";
import type { EvidenceAssessmentRecord, EvidenceLevel } from "./types";
import { ReportPageNumber } from "./ReportPageNumber";
import { reportStyles as styles } from "./reportStyles";

interface Props {
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
  score: GatedMaturityScore;
  levels: Pick<EvidenceLevel, "number" | "name">[];
}

export const EvidenceSummaryPage: React.FC<Props> = ({
  profile,
  record,
  score,
  levels,
}) => {
  const visualization = buildMaturityGateVisualization(score, levels);
  return (
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
          [
            `${score.criteriaMet}/${score.criteriaTotal}`,
            "Criteria marked Met",
          ],
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
      <Text style={styles.subheading}>Maturity path</Text>
      <Text style={styles.muted}>
        Levels are cumulative. Completing a later level's own criteria does not
        establish that level while an earlier gate remains incomplete.
      </Text>
      <View style={styles.gateGrid}>
        {visualization.map((level) => (
          <View key={level.level} style={styles.gateCard}>
            <Text style={styles.gateLevel}>LEVEL {level.level}</Text>
            <Text style={styles.gateName}>{level.name}</Text>
            <View style={styles.gateProgressTrack}>
              <View
                style={[
                  styles.gateProgressValue,
                  { width: `${level.completionPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.gateStatus}>{level.statusLabel}</Text>
            <Text style={styles.gateDetail}>
              {level.criteriaMet}/{level.criteriaTotal} criteria
            </Text>
          </View>
        ))}
      </View>
      <ReportPageNumber />
    </Page>
  );
};
