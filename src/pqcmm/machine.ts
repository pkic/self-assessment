import { validatePqcmmAssessment100 } from "../generated/validators-2020";
import { base64ToBytes, bytesToBase64, sha256Hex } from "./encoding";
import { calculatePqcmmScore, emptyCriterionProgress } from "./scoring";
import type {
  PqcmmAssessmentRecord,
  PqcmmEvidenceFile,
  PqcmmMachineAssessment,
  PqcmmModelData,
} from "./types";

export const MAX_EVIDENCE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_EVIDENCE_BYTES = 100 * 1024 * 1024;

const safeFileName = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "evidence";

export const embeddedEvidenceName = (file: PqcmmEvidenceFile): string =>
  `evidence-${file.id}-${safeFileName(file.name)}`;

export const newPqcmmAssessment = (
  model: PqcmmModelData,
): PqcmmAssessmentRecord => {
  const now = new Date().toISOString();
  return {
    stateSchemaVersion: 1,
    id: crypto.randomUUID(),
    name: "PQCMM assessment",
    modelId: "pqcmm",
    dataVersion: model.model.version,
    productName: "",
    productVersion: "",
    vendorName: "",
    deploymentScope: "",
    assessmentType: "self",
    assessorName: "",
    assessorOrganization: "",
    assessmentDate: now.slice(0, 10),
    criterionProgress: {},
    questionProgress: {},
    evidenceFiles: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const evidenceFromFile = async (
  file: File,
  existingFiles: PqcmmEvidenceFile[],
): Promise<PqcmmEvidenceFile> => {
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new Error("Each evidence file must be 25 MB or smaller.");
  }
  const currentSize = existingFiles.reduce((sum, item) => sum + item.size, 0);
  if (currentSize + file.size > MAX_TOTAL_EVIDENCE_BYTES) {
    throw new Error("The assessment evidence package cannot exceed 100 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mediaType: file.type || "application/octet-stream",
    size: file.size,
    sha256: await sha256Hex(bytes),
    addedAt: new Date().toISOString(),
    dataBase64: bytesToBase64(bytes),
  };
};

export const buildPqcmmMachineAssessment = (
  model: PqcmmModelData,
  record: PqcmmAssessmentRecord,
  includeEvidenceContent: boolean,
): PqcmmMachineAssessment => ({
  format: "pkic-pqcmm-assessment",
  schemaVersion: "1.0.0",
  model: {
    id: "pqcmm",
    version: model.model.version,
    schemaVersion: model.schemaVersion,
    source: model.model.canonicalUrl,
  },
  assessment: {
    id: record.id,
    name: record.name,
    productName: record.productName,
    productVersion: record.productVersion,
    vendorName: record.vendorName,
    deploymentScope: record.deploymentScope,
    assessmentType: record.assessmentType,
    assessorName: record.assessorName,
    assessorOrganization: record.assessorOrganization,
    assessmentDate: record.assessmentDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  },
  result: calculatePqcmmScore(model, record),
  criteria: model.levels.flatMap((level) =>
    level.criteria.items.map((criterion) => {
      const progress =
        record.criterionProgress[criterion.id] ?? emptyCriterionProgress();
      return {
        id: criterion.id,
        level: level.number,
        text: criterion.text,
        status: progress.status,
        evidenceStatement: progress.evidenceStatement,
        notes: progress.notes,
        evidenceIds: progress.evidenceIds,
      };
    }),
  ),
  questions: model.levels.flatMap((level) =>
    level.assessment.groups.flatMap((group) =>
      group.questions.map((question) => ({
        id: question.id,
        level: level.number,
        group: group.name,
        question: question.question,
        answer: record.questionProgress[question.id]?.answer ?? "",
        evidenceIds: record.questionProgress[question.id]?.evidenceIds ?? [],
      })),
    ),
  ),
  attachments: record.evidenceFiles.map((file) => ({
    id: file.id,
    fileName: file.name,
    embeddedFileName: embeddedEvidenceName(file),
    mediaType: file.mediaType,
    size: file.size,
    sha256: file.sha256,
    addedAt: file.addedAt,
    ...(includeEvidenceContent ? { dataBase64: file.dataBase64 } : {}),
  })),
});

export const parsePqcmmMachineAssessment = async (
  text: string,
  model: PqcmmModelData,
): Promise<PqcmmAssessmentRecord> => {
  const parsed: unknown = JSON.parse(text);
  if (!validatePqcmmAssessment100(parsed)) {
    throw new Error(
      "The selected file is not a valid PQCMM assessment export.",
    );
  }
  const data = parsed as PqcmmMachineAssessment;
  if (data.model.version !== model.model.version) {
    throw new Error(
      `This export uses PQCMM ${data.model.version}; this tool currently loaded ${model.model.version}.`,
    );
  }
  if (data.attachments.some((attachment) => !attachment.dataBase64)) {
    throw new Error(
      "The export does not contain its referenced evidence files.",
    );
  }

  const criterionProgress = Object.fromEntries(
    data.criteria.map((criterion) => [
      criterion.id,
      {
        status: criterion.status,
        evidenceStatement: criterion.evidenceStatement,
        notes: criterion.notes,
        evidenceIds: criterion.evidenceIds,
      },
    ]),
  );
  const questionProgress = Object.fromEntries(
    data.questions.map((question) => [
      question.id,
      { answer: question.answer, evidenceIds: question.evidenceIds },
    ]),
  );
  const evidenceFiles: PqcmmEvidenceFile[] = [];
  for (const attachment of data.attachments) {
    const bytes = base64ToBytes(attachment.dataBase64!);
    if (bytes.byteLength !== attachment.size) {
      throw new Error(`Evidence file size mismatch: ${attachment.fileName}`);
    }
    if ((await sha256Hex(bytes)) !== attachment.sha256) {
      throw new Error(`Evidence file digest mismatch: ${attachment.fileName}`);
    }
    evidenceFiles.push({
      id: attachment.id,
      name: attachment.fileName,
      mediaType: attachment.mediaType,
      size: attachment.size,
      sha256: attachment.sha256,
      addedAt: attachment.addedAt,
      dataBase64: attachment.dataBase64!,
    });
  }

  return {
    stateSchemaVersion: 1,
    id: data.assessment.id,
    name: data.assessment.name,
    modelId: "pqcmm",
    dataVersion: data.model.version,
    productName: data.assessment.productName,
    productVersion: data.assessment.productVersion,
    vendorName: data.assessment.vendorName,
    deploymentScope: data.assessment.deploymentScope,
    assessmentType: data.assessment.assessmentType,
    assessorName: data.assessment.assessorName,
    assessorOrganization: data.assessment.assessorOrganization,
    assessmentDate: data.assessment.assessmentDate,
    criterionProgress,
    questionProgress,
    evidenceFiles,
    createdAt: data.assessment.createdAt,
    updatedAt: data.assessment.updatedAt,
  };
};

export const downloadPqcmmAssessment = (
  model: PqcmmModelData,
  record: PqcmmAssessmentRecord,
): void => {
  const payload = buildPqcmmMachineAssessment(model, record, true);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(record.productName || record.name).toLowerCase()}-pqcmm-${model.model.version}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
