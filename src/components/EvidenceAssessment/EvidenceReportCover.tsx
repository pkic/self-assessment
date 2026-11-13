import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { currentAssuranceProfile } from "../../assessment-engine/assurance-policy";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import type { EvidenceAssessmentRecord, EvidenceModelData } from "./types";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import { reportStyles as styles } from "./reportStyles";

interface Props {
  model: EvidenceModelData;
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
  score: GatedMaturityScore;
  subjectName: string;
}

export const EvidenceReportCover: React.FC<Props> = ({
  model,
  profile,
  record,
  score,
  subjectName,
}) => {
  const assurance = currentAssuranceProfile(profile, record.assuranceProfileId);
  return (
    <Page size="A4" style={[styles.page, styles.cover]}>
      <Text style={styles.title}>{profile.report.title}</Text>
      <Text style={styles.subtitle}>{subjectName}</Text>
      <Text style={styles.levelBadge}>
        {score.achievedLevel === null
          ? "No level established"
          : `Claimed Level ${score.achievedLevel}`}
      </Text>
      <View style={styles.coverMeta}>
        <Text>Model version: {model.model.version}</Text>
        <Text>Model: {model.model.name}</Text>
        <Text>
          Assessment date: {record.subject.assessmentDate || "Not specified"}
        </Text>
        <Text>Assurance: {assurance.label}</Text>
      </View>
      <Text style={styles.assuranceNotice}>{assurance.reportLabel}</Text>
      <Text style={styles.notice}>{assurance.notice}</Text>
    </Page>
  );
};
