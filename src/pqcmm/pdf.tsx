import React from "react";
import { pdf } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import "../utils/pdf/theme";
import { base64ToBytes } from "./encoding";
import { buildPqcmmMachineAssessment, embeddedEvidenceName } from "./machine";
import { PqcmmReportDocument } from "./PqcmmReportDocument";
import { calculatePqcmmScore } from "./scoring";
import type { PqcmmAssessmentRecord, PqcmmModelData } from "./types";

export const buildPqcmmPdfBlob = async (
  model: PqcmmModelData,
  record: PqcmmAssessmentRecord,
): Promise<Blob> => {
  const score = calculatePqcmmScore(model, record);
  const rendered = await pdf(
    <PqcmmReportDocument model={model} record={record} score={score} />,
  ).toBlob();
  const document = await PDFDocument.load(await rendered.arrayBuffer());
  document.setTitle(`${record.productName || record.name} PQCMM assessment`);
  document.setSubject(`PQCMM ${model.model.version} assessment report`);
  document.setKeywords([
    "PQCMM",
    "post-quantum cryptography",
    "machine-readable assessment",
  ]);
  document.setProducer("PKI Consortium PQCMM Self-Assessment");

  const manifest = buildPqcmmMachineAssessment(model, record, false);
  await document.attach(
    new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    "pqcmm-assessment.json",
    {
      mimeType: "application/json",
      description: "Machine-readable PQCMM assessment manifest",
    },
  );
  for (const file of record.evidenceFiles) {
    await document.attach(
      base64ToBytes(file.dataBase64),
      embeddedEvidenceName(file),
      {
        mimeType: file.mediaType,
        description: `PQCMM evidence: ${file.name}; SHA-256 ${file.sha256}`,
        creationDate: new Date(file.addedAt),
      },
    );
  }

  const bytes = await document.save();
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
};

export const downloadPqcmmPdf = async (
  model: PqcmmModelData,
  record: PqcmmAssessmentRecord,
): Promise<void> => {
  const blob = await buildPqcmmPdfBlob(model, record);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const base = (record.productName || record.name || "assessment")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  anchor.download = `${base || "assessment"}-pqcmm-report.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
};
