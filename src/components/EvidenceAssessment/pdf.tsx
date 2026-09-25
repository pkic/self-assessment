import React from "react";
import { pdf } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import "../../utils/pdf/theme";
import { downloadBlob } from "../../assessment-engine/download";
import { safeFileName } from "../../assessment-engine/evidence";
import { calculateGatedMaturityScore } from "../../assessment-engine/methodologies/cumulativeGates";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { base64ToBytes } from "./encoding";
import { EvidenceReportDocument } from "./EvidenceReportDocument";
import {
  addPdfSignatureFields,
  namedDestinationPageIndex,
} from "./pdfSignatureField";
import {
  buildAssessmentPackage,
  embeddedEvidenceName,
  subjectDisplayName,
} from "./machine";
import type { EvidenceAssessmentRecord, EvidenceModelData } from "./types";

export const buildEvidenceAssessmentPdfBlob = async (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
  record: EvidenceAssessmentRecord,
): Promise<Blob> => {
  const score = calculateGatedMaturityScore(
    model,
    record,
    profile.runtime.methodology,
  );
  const assessmentPackage = await buildAssessmentPackage(
    model,
    profile,
    record,
    false,
  );
  const rendered = await pdf(
    <EvidenceReportDocument
      model={model}
      profile={profile}
      record={record}
      score={score}
      machine={assessmentPackage.credential.credentialSubject}
    />,
  ).toBlob();
  const document = await PDFDocument.load(await rendered.arrayBuffer());
  const displayName = subjectDisplayName(profile, record);
  document.setTitle(`${displayName} ${model.model.abbreviation} assessment`);
  document.setSubject(
    `${model.model.abbreviation} ${model.model.version} assessment report`,
  );
  document.setKeywords([
    model.model.abbreviation,
    model.model.name,
    "machine-readable assessment",
  ]);
  document.setProducer(profile.report.title);

  await document.attach(
    new TextEncoder().encode(JSON.stringify(assessmentPackage, null, 2)),
    profile.report.machineAttachmentName,
    {
      mimeType: "application/json",
      description: "Machine-readable assessment credential draft and manifest",
    },
  );
  for (const file of profile.report.includeEvidenceAttachments
    ? record.evidenceFiles
    : []) {
    await document.attach(
      base64ToBytes(file.dataBase64),
      embeddedEvidenceName(file),
      {
        mimeType: file.mediaType,
        description: `Assessment evidence: ${file.name}; SHA-256 ${file.sha256}`,
        creationDate: new Date(file.addedAt),
      },
    );
  }
  if (profile.report.includeAttestation && profile.report.signing) {
    const approvalPage = namedDestinationPageIndex(
      document,
      "pkic-executive-approval",
    );
    if (approvalPage === undefined || approvalPage < 0) {
      throw new Error("Executive approval page destination is missing.");
    }
    await addPdfSignatureFields(document, approvalPage, profile.report.signing);
  }

  const bytes = await document.save();
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
};

export const downloadEvidenceAssessmentPdf = async (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
  record: EvidenceAssessmentRecord,
): Promise<void> => {
  const blob = await buildEvidenceAssessmentPdfBlob(model, profile, record);
  const base = safeFileName(subjectDisplayName(profile, record)).toLowerCase();
  downloadBlob(blob, `${base}-${model.model.id}-assessment-report.pdf`);
};
