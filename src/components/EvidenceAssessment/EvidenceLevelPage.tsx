import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { emptyCriterionProgress } from "../../assessment-engine/methodologies/cumulativeGates";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { ReportPageNumber } from "./ReportPageNumber";
import { evidenceNames, plainReportText } from "./reportFormatting";
import { reportStyles as styles } from "./reportStyles";
import type { EvidenceAssessmentRecord, EvidenceLevel } from "./types";
import {
  emptyQuestionProgress,
  questionResponseSummary,
  responseDefinition,
} from "./questionResponse";

interface Props {
  level: EvidenceLevel;
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
}

export const EvidenceLevelPage: React.FC<Props> = ({
  level,
  profile,
  record,
}) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.heading}>
      Level {level.number}: {level.name}
    </Text>
    <Text style={[styles.detail, styles.muted]}>
      {plainReportText(level.summary)}
    </Text>
    <Text style={styles.subheading}>Criteria</Text>
    {level.criteria.items.map((criterion) => {
      const progress =
        record.criterionProgress[criterion.id] ?? emptyCriterionProgress();
      return (
        <View key={criterion.id} style={styles.item} wrap={false}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemId}>{criterion.id}</Text>
            <Text style={styles.itemText}>
              {plainReportText(criterion.text)}
            </Text>
          </View>
          <Text style={styles.status}>Status: {progress.status}</Text>
          {criterion.assessmentQuestionIds?.length ? (
            <Text style={styles.detail}>
              Assessment questions: {criterion.assessmentQuestionIds.join(", ")}
            </Text>
          ) : null}
          <Text style={styles.detail}>
            Evidence statement: {progress.evidenceStatement || "Not provided"}
          </Text>
          <Text style={styles.detail}>
            Evidence files: {evidenceNames(progress.evidenceIds, record)}
          </Text>
          {progress.notes ? (
            <Text style={styles.detail}>Notes: {progress.notes}</Text>
          ) : null}
        </View>
      );
    })}
    <Text style={styles.subheading}>
      {level.number === 0
        ? "Supplier intake questions"
        : "Assessment questions"}
    </Text>
    {level.assessment.groups.flatMap((group) =>
      group.questions.map((question) => {
        const progress =
          record.questionProgress[question.id] ?? emptyQuestionProgress();
        const response = questionResponseSummary(
          responseDefinition(question, group.kind, profile),
          progress,
        );
        const finding = profile.runtime.questions?.findings.find(
          (item) => item.value === progress.finding,
        )?.label;
        return (
          <View key={question.id} style={styles.item} wrap={false}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemId}>{question.id}</Text>
              <Text style={styles.itemText}>
                {plainReportText(question.question)}
              </Text>
            </View>
            {finding ? (
              <Text style={styles.status}>Finding: {finding}</Text>
            ) : null}
            <Text style={styles.detail}>
              Response: {response || "Not answered"}
            </Text>
            <Text style={styles.detail}>
              Evidence files: {evidenceNames(progress.evidenceIds, record)}
            </Text>
          </View>
        );
      }),
    )}
    <ReportPageNumber />
  </Page>
);
