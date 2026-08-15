import React from "react";
import { Document } from "@react-pdf/renderer";
import type { GatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { EvidenceApprovalPage } from "./EvidenceApprovalPage";
import { EvidenceLevelPage } from "./EvidenceLevelPage";
import { EvidenceManifestPage } from "./EvidenceManifestPage";
import { EvidenceReportCover } from "./EvidenceReportCover";
import { EvidenceSummaryPage } from "./EvidenceSummaryPage";
import type {
  AssessmentCredentialSubject,
  EvidenceAssessmentRecord,
  EvidenceModelData,
} from "./types";

interface Props {
  model: EvidenceModelData;
  profile: AssessmentProfileData;
  record: EvidenceAssessmentRecord;
  score: GatedMaturityScore;
  machine: AssessmentCredentialSubject;
}

export const EvidenceReportDocument: React.FC<Props> = ({
  model,
  profile,
  record,
  score,
  machine,
}) => {
  const subjectName =
    profile.runtime.subjectFields
      .map((field) => record.subject[field.key])
      .find((value) => value?.trim()) ||
    record.name ||
    "Unnamed subject";
  return (
    <Document
      title={`${subjectName} ${model.model.abbreviation} assessment`}
      author={
        record.subject.assessorName ||
        record.subject.assessorOrganization ||
        "Assessment author"
      }
      subject={`${model.model.abbreviation} ${model.model.version} assessment report`}
      keywords={`${model.model.abbreviation}, maturity assessment, evidence`}
    >
      <EvidenceReportCover
        model={model}
        profile={profile}
        record={record}
        score={score}
        subjectName={subjectName}
      />
      {profile.report.includeAttestation ? (
        <EvidenceApprovalPage
          profile={profile}
          record={record}
          machine={machine}
        />
      ) : null}
      <EvidenceSummaryPage
        profile={profile}
        record={record}
        score={score}
        levels={model.levels}
      />
      {model.levels.map((level) => (
        <EvidenceLevelPage key={level.number} level={level} record={record} />
      ))}
      {profile.report.includeEvidenceManifest ? (
        <EvidenceManifestPage profile={profile} record={record} />
      ) : null}
    </Document>
  );
};
