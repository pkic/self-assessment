import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import type { EvidenceAssessmentRecord } from "./types";
import { ReportPageNumber } from "./ReportPageNumber";
import { reportStyles as styles } from "./reportStyles";

export const EvidenceManifestPage: React.FC<{
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
}> = ({ profile, record }) => (
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
      {profile.report.machineAttachmentName} is a model-neutral assessment
      package containing a VC-shaped credential draft and references each
      evidence attachment by identifier, embedded filename, media type, byte
      size, and SHA-256 digest.
    </Text>
    <ReportPageNumber />
  </Page>
);
