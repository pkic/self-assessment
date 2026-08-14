import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  PqcmmAssessmentRecord,
  PqcmmModelData,
  PqcmmScore,
} from "./types";
import { emptyCriterionProgress } from "./scoring";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 36,
    color: "#202124",
  },
  cover: {
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  title: { fontSize: 26, fontWeight: 700, color: "#1a73e8" },
  subtitle: { fontSize: 15, marginTop: 10, fontWeight: 700 },
  coverMeta: { marginTop: 28, fontSize: 11, lineHeight: 1.5 },
  levelBadge: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: "#e8f0fe",
    border: "1 solid #1a73e8",
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 700,
    color: "#154c91",
  },
  notice: { marginTop: 24, fontSize: 9, color: "#5f6368", maxWidth: 420 },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#154c91",
    marginBottom: 10,
  },
  subheading: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1a73e8",
    marginTop: 12,
    marginBottom: 6,
  },
  label: { fontWeight: 700 },
  metadataRow: { flexDirection: "row", marginBottom: 5 },
  metadataLabel: { width: 125, fontWeight: 700 },
  metadataValue: { flex: 1 },
  summaryGrid: { flexDirection: "row", gap: 8, marginVertical: 12 },
  summaryCard: {
    flex: 1,
    padding: 8,
    border: "1 solid #dadce0",
    borderRadius: 4,
  },
  summaryValue: { fontSize: 15, fontWeight: 700, color: "#154c91" },
  summaryLabel: { fontSize: 8, color: "#5f6368", marginTop: 2 },
  item: {
    border: "1 solid #dadce0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 7,
  },
  itemHeader: { flexDirection: "row", marginBottom: 4 },
  itemId: { width: 48, fontWeight: 700, color: "#154c91" },
  itemText: { flex: 1, fontWeight: 700 },
  status: { marginTop: 4, fontWeight: 700 },
  detail: { marginTop: 3, lineHeight: 1.35 },
  muted: { color: "#5f6368" },
  pageNumber: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#80868b",
  },
});

const plain = (value: string): string =>
  value
    .replace(/\[([^\]]+)]\([^\)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\{\.[^}]+}/g, "")
    .trim();

const evidenceNames = (
  ids: string[],
  record: PqcmmAssessmentRecord,
): string => {
  const names = ids
    .map((id) => record.evidenceFiles.find((file) => file.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : "None attached";
};

interface Props {
  model: PqcmmModelData;
  record: PqcmmAssessmentRecord;
  score: PqcmmScore;
}

export const PqcmmReportDocument: React.FC<Props> = ({
  model,
  record,
  score,
}) => (
  <Document
    title={`${record.productName || record.name} PQCMM assessment`}
    author={
      record.assessorName || record.assessorOrganization || "PQCMM assessor"
    }
    subject={`PQCMM ${model.model.version} assessment report`}
    keywords="PQCMM, post-quantum cryptography, maturity assessment"
  >
    <Page size="A4" style={[styles.page, styles.cover]}>
      <Text style={styles.title}>PQCMM Assessment Report</Text>
      <Text style={styles.subtitle}>
        {record.productName || "Unnamed product or service"}
      </Text>
      <Text style={styles.levelBadge}>
        {score.achievedLevel === null
          ? "No level established"
          : `Achieved Level ${score.achievedLevel}`}
      </Text>
      <View style={styles.coverMeta}>
        <Text>Model version: {model.model.version}</Text>
        <Text>Product version: {record.productVersion || "Not specified"}</Text>
        <Text>Assessment date: {record.assessmentDate || "Not specified"}</Text>
        <Text>
          Assurance:{" "}
          {record.assessmentType === "self"
            ? "Self-assessment"
            : "Third-party assessment"}
        </Text>
      </View>
      <Text style={styles.notice}>
        The achieved level is the highest cumulative level for which every
        criterion is marked met and supported by evidence. A machine-readable
        assessment manifest and the supplied evidence files are embedded as PDF
        attachments.
      </Text>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Assessment scope and result</Text>
      {[
        ["Assessment", record.name],
        ["Product or service", record.productName],
        ["Product version", record.productVersion],
        ["Vendor", record.vendorName],
        ["Deployment scope", record.deploymentScope],
        ["Assessor", record.assessorName],
        ["Assessor organization", record.assessorOrganization],
        ["Assessment date", record.assessmentDate],
      ].map(([label, value]) => (
        <View key={label} style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{label}</Text>
          <Text style={styles.metadataValue}>{value || "Not specified"}</Text>
        </View>
      ))}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {score.achievedLevel === null ? "—" : score.achievedLevel}
          </Text>
          <Text style={styles.summaryLabel}>Achieved level</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {score.criteriaMet}/{score.criteriaTotal}
          </Text>
          <Text style={styles.summaryLabel}>Criteria supported</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {score.questionsAnswered}/{score.questionsTotal}
          </Text>
          <Text style={styles.summaryLabel}>Questions answered</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{score.evidenceFiles}</Text>
          <Text style={styles.summaryLabel}>Evidence files</Text>
        </View>
      </View>
      <Text style={styles.subheading}>Level gates</Text>
      {score.levelResults.map((result) => (
        <View key={result.level} style={styles.item}>
          <Text style={styles.label}>
            Level {result.level}:{" "}
            {result.met ? "all criteria met" : "not established"}
          </Text>
          <Text style={styles.detail}>
            {result.criteriaMet} of {result.criteriaTotal} criteria supported
          </Text>
          {result.blockers.length > 0 ? (
            <Text style={[styles.detail, styles.muted]}>
              Blockers: {result.blockers.join("; ")}
            </Text>
          ) : null}
        </View>
      ))}
      <Text
        style={styles.pageNumber}
        fixed
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </Page>

    {model.levels.map((level) => (
      <Page key={level.number} size="A4" style={styles.page}>
        <Text style={styles.heading}>
          Level {level.number}: {level.name}
        </Text>
        <Text style={[styles.detail, styles.muted]}>
          {plain(level.summary)}
        </Text>
        <Text style={styles.subheading}>Criteria</Text>
        {level.criteria.items.map((criterion) => {
          const progress =
            record.criterionProgress[criterion.id] ?? emptyCriterionProgress();
          return (
            <View key={criterion.id} style={styles.item} wrap={false}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemId}>{criterion.id}</Text>
                <Text style={styles.itemText}>{plain(criterion.text)}</Text>
              </View>
              <Text style={styles.status}>Status: {progress.status}</Text>
              <Text style={styles.detail}>
                Evidence statement:{" "}
                {progress.evidenceStatement || "Not provided"}
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
            const progress = record.questionProgress[question.id];
            return (
              <View key={question.id} style={styles.item} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemId}>{question.id}</Text>
                  <Text style={styles.itemText}>
                    {plain(question.question)}
                  </Text>
                </View>
                <Text style={styles.detail}>
                  Response: {progress?.answer || "Not answered"}
                </Text>
                <Text style={styles.detail}>
                  Evidence files:{" "}
                  {evidenceNames(progress?.evidenceIds ?? [], record)}
                </Text>
              </View>
            );
          }),
        )}
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    ))}

    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Evidence attachment manifest</Text>
      {record.evidenceFiles.length === 0 ? (
        <Text>No evidence files were attached.</Text>
      ) : (
        record.evidenceFiles.map((file) => (
          <View key={file.id} style={styles.item} wrap={false}>
            <Text style={styles.label}>{file.name}</Text>
            <Text style={styles.detail}>Media type: {file.mediaType}</Text>
            <Text style={styles.detail}>Size: {file.size} bytes</Text>
            <Text style={styles.detail}>SHA-256: {file.sha256}</Text>
          </View>
        ))
      )}
      <Text style={styles.subheading}>Machine-readable attachment</Text>
      <Text style={styles.detail}>
        pqcmm-assessment.json conforms to schema version 1.0.0 and references
        each evidence attachment by identifier, embedded filename, media type,
        byte size, and SHA-256 digest.
      </Text>
      <Text
        style={styles.pageNumber}
        fixed
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </Page>
  </Document>
);
