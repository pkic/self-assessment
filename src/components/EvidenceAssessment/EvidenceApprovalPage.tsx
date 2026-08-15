import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { currentAssuranceProfile } from "../../assessment-engine/assurance-policy";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import type {
  AssessmentCredentialSubject,
  EvidenceAssessmentRecord,
} from "./types";
import { ReportPageNumber } from "./ReportPageNumber";
import { reportStyles as styles } from "./reportStyles";
import { signatureAreaHeight } from "./signatureLayout";

interface Props {
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
  machine: AssessmentCredentialSubject;
}

export const EvidenceApprovalPage: React.FC<Props> = ({
  profile,
  record,
  machine,
}) => {
  const assurance = currentAssuranceProfile(profile, record.assuranceProfileId);
  const signing = profile.report.signing;
  const signatureFields = signing?.fields ?? [];
  return (
    <Page
      id="pkic-executive-approval"
      size="A4"
      style={[
        styles.page,
        { paddingBottom: signatureAreaHeight(signatureFields.length) },
      ]}
    >
      <Text style={styles.heading}>Approval signatures</Text>
      <View style={styles.item}>
        <Text style={styles.label}>{assurance.reportLabel}</Text>
        <Text style={styles.detail}>
          Evidence status: {machine.assurance.evidenceStatus}
        </Text>
        <Text style={styles.detail}>{machine.assurance.notice}</Text>
      </View>
      <Text style={styles.subheading}>Declaration</Text>
      <Text style={styles.detail}>
        {assurance.attestation?.declaration ||
          "I approve this assessment and accept accountability for its contents."}
      </Text>
      <Text style={styles.subheading}>Digital approval</Text>
      <Text style={styles.detail}>
        The fields below are intended for an external identity-verified{" "}
        {signing?.format} signing workflow. The signing workflow determines the
        actual signer at signing time.
      </Text>
      {signatureFields.map((field) => (
        <View key={field.name} style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{field.label}</Text>
          <Text style={styles.metadataValue}>
            {field.role} · {field.required ? "Required" : "Optional"}
          </Text>
        </View>
      ))}
      {signing?.allowAdditionalSignatures ? (
        <Text style={styles.detail}>
          The external workflow may add further approval signatures when the
          organization requires them.
        </Text>
      ) : null}
      <Text style={styles.subheading}>Signature validation</Text>
      <Text style={styles.detail}>
        Validate any applied signature, certificate chain, trusted time,
        organization binding, and role-authority evidence. Executive approval
        does not turn this self-assessment into a PKI Consortium certification.
      </Text>
      <ReportPageNumber />
    </Page>
  );
};
