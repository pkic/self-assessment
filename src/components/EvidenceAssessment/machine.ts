import { validateAssessmentPackage100 } from "../../generated/validators-2020";
import { currentAssuranceProfile } from "../../assessment-engine/assurance-policy";
import {
  assessmentPayloadSha256,
  assuranceSummary,
} from "../../assessment-engine/integrity";
import { downloadBlob } from "../../assessment-engine/download";
import {
  evidenceFromFile as buildEvidenceFromFile,
  evidenceMediaTypeAllowed,
  MAX_EVIDENCE_ATTACHMENTS,
  safeFileName,
  verifyEvidenceFile,
} from "../../assessment-engine/evidence";
import { newAssessmentId } from "../../assessment-engine/id";
import {
  calculateGatedMaturityScore,
  emptyCriterionProgress,
} from "../../assessment-engine/methodologies/cumulativeGates";
import { evidenceCriterionPolicy } from "../../assessment-engine/profile";
import { assertValidAssessmentSubject } from "../../assessment-engine/subject-validation";
import { collectSubjectIdentifiers } from "../../assessment-engine/subject-identifiers";
import type {
  AssessmentPackage,
  AssessmentProfileData,
} from "../../assessment-engine/types";
import type {
  AssessmentCredentialSubject,
  AssessmentEvidenceFile,
  EvidenceAssessmentRecord,
  EvidenceModelData,
} from "./types";

export const embeddedEvidenceName = (file: AssessmentEvidenceFile): string =>
  `evidence-${safeFileName(file.id)}-${safeFileName(file.name)}`;

const subjectDefaults = (
  profile: AssessmentProfileData,
): Record<string, string> =>
  Object.fromEntries(
    profile.runtime.subjectFields.map((field) => [field.key, ""]),
  );

export const subjectDisplayName = (
  profile: AssessmentProfileData,
  record: EvidenceAssessmentRecord,
): string => {
  const preferred = profile.runtime.subjectFields.find(
    (field) => field.key !== "name" && record.subject[field.key]?.trim(),
  );
  return preferred
    ? record.subject[preferred.key]
    : record.name || "assessment";
};

export const newEvidenceAssessment = (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
): EvidenceAssessmentRecord => {
  if (
    profile.profile.model.id !== model.model.id ||
    profile.profile.model.version !== model.model.version
  ) {
    throw new Error("The assessment profile does not match the loaded model.");
  }
  const now = new Date().toISOString();
  const subject = subjectDefaults(profile);
  if ("assessmentDate" in subject) subject.assessmentDate = now.slice(0, 10);
  return {
    stateSchemaVersion: 2,
    id: newAssessmentId(),
    name: profile.profile.title,
    modelId: model.model.id,
    dataVersion: model.model.version,
    subject,
    assuranceProfileId: profile.assurance.defaultProfile,
    criterionProgress: {},
    questionProgress: {},
    evidenceFiles: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const evidenceFromFile = async (
  file: File,
  existingFiles: AssessmentEvidenceFile[],
  profile: AssessmentProfileData,
): Promise<AssessmentEvidenceFile> => {
  const policy = evidenceCriterionPolicy(profile).evidence;
  return buildEvidenceFromFile(file, existingFiles, {
    maxFileBytes: policy.maxFileBytes,
    maxPackageBytes: policy.maxPackageBytes,
    acceptedMediaTypes: policy.acceptedMediaTypes,
  });
};

export const maxAssessmentPackageFileBytes = (
  profile: AssessmentProfileData,
): number => {
  const { maxPackageBytes } = evidenceCriterionPolicy(profile).evidence;
  return Math.ceil((maxPackageBytes * 4) / 3) + 1024 * 1024;
};

const expectedBase64Length = (byteLength: number): number =>
  Math.ceil(byteLength / 3) * 4;

const utf8SizeExceeds = (value: string, limit: number): boolean => {
  const encoder = new TextEncoder();
  let total = 0;
  for (let offset = 0; offset < value.length; offset += 64 * 1024) {
    total += encoder.encode(value.slice(offset, offset + 64 * 1024)).byteLength;
    if (total > limit) return true;
  }
  return false;
};

type EvidencePolicy = ReturnType<typeof evidenceCriterionPolicy>["evidence"];

const assertEvidenceFilePolicy = (
  file: AssessmentEvidenceFile,
  ids: Set<string>,
  policy: EvidencePolicy,
  totalBytes: number,
): number => {
  if (!/^[a-zA-Z0-9._-]+$/.test(file.id) || ids.has(file.id)) {
    throw new Error(`Invalid or duplicate evidence id: ${file.id}`);
  }
  ids.add(file.id);
  const nextTotalBytes = totalBytes + file.size;
  const exceedsSizePolicy =
    file.size > policy.maxFileBytes ||
    nextTotalBytes > policy.maxPackageBytes ||
    file.dataBase64.length !== expectedBase64Length(file.size);
  if (exceedsSizePolicy) {
    throw new Error(`Evidence file exceeds the export policy: ${file.name}`);
  }
  if (!evidenceMediaTypeAllowed(file.mediaType, policy.acceptedMediaTypes)) {
    throw new Error(`Evidence media type is not accepted: ${file.mediaType}`);
  }
  return nextTotalBytes;
};

const assertEvidenceReferences = (
  record: EvidenceAssessmentRecord,
  evidenceIds: Set<string>,
): void => {
  const progressEntries = [
    ...Object.values(record.criterionProgress),
    ...Object.values(record.questionProgress),
  ];
  for (const progress of progressEntries) {
    for (const evidenceId of progress.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        throw new Error(
          `Assessment response references missing evidence: ${evidenceId}`,
        );
      }
    }
  }
};

const assertResponseIds = (
  model: EvidenceModelData,
  record: EvidenceAssessmentRecord,
): void => {
  const knownIds = new Set(
    model.levels.flatMap((level) => [
      ...level.criteria.items.map(({ id }) => id),
      ...level.assessment.groups.flatMap((group) =>
        group.questions.map(({ id }) => id),
      ),
    ]),
  );
  const responseIds = [
    ...Object.keys(record.criterionProgress),
    ...Object.keys(record.questionProgress),
  ];
  for (const id of responseIds) {
    if (!knownIds.has(id)) {
      throw new Error(`Assessment response does not match the model: ${id}`);
    }
  }
};

const assertRecordEvidencePolicy = (
  model: EvidenceModelData,
  record: EvidenceAssessmentRecord,
  profile: AssessmentProfileData,
): void => {
  const policy = evidenceCriterionPolicy(profile).evidence;
  if (record.evidenceFiles.length > MAX_EVIDENCE_ATTACHMENTS) {
    throw new Error(
      `Assessment packages cannot contain more than ${MAX_EVIDENCE_ATTACHMENTS} evidence files.`,
    );
  }
  const ids = new Set<string>();
  let totalBytes = 0;
  for (const file of record.evidenceFiles) {
    totalBytes = assertEvidenceFilePolicy(file, ids, policy, totalBytes);
  }
  assertEvidenceReferences(record, ids);
  assertResponseIds(model, record);
};

const assertImportEvidencePolicy = (
  data: AssessmentPackage<AssessmentCredentialSubject>,
  profile: AssessmentProfileData,
): void => {
  const policy = evidenceCriterionPolicy(profile).evidence;
  if (data.attachments.length > MAX_EVIDENCE_ATTACHMENTS) {
    throw new Error(
      `Assessment packages cannot contain more than ${MAX_EVIDENCE_ATTACHMENTS} evidence files.`,
    );
  }
  const ids = new Set<string>();
  let totalBytes = 0;
  for (const attachment of data.attachments) {
    if (ids.has(attachment.id)) {
      throw new Error(`Duplicate evidence id: ${attachment.id}`);
    }
    ids.add(attachment.id);
    if (!attachment.dataBase64) {
      throw new Error(
        "The package does not contain its referenced evidence files.",
      );
    }
    if (attachment.size > policy.maxFileBytes) {
      throw new Error(
        `Evidence file exceeds the import limit: ${attachment.fileName}`,
      );
    }
    totalBytes += attachment.size;
    if (totalBytes > policy.maxPackageBytes) {
      throw new Error("Assessment package evidence exceeds the import limit.");
    }
    if (
      attachment.dataBase64.length !== expectedBase64Length(attachment.size)
    ) {
      throw new Error(`Evidence file size mismatch: ${attachment.fileName}`);
    }
    if (
      !evidenceMediaTypeAllowed(attachment.mediaType, policy.acceptedMediaTypes)
    ) {
      throw new Error(
        `Evidence media type is not accepted: ${attachment.mediaType}`,
      );
    }
  }
};

const assertPackageResponseSemantics = (
  data: AssessmentPackage<AssessmentCredentialSubject>,
  model: EvidenceModelData,
): void => {
  const criterionIds = new Set(
    model.levels.flatMap((level) =>
      level.criteria.items.map((criterion) => criterion.id),
    ),
  );
  const questionIds = new Set(
    model.levels.flatMap((level) =>
      level.assessment.groups.flatMap((group) =>
        group.questions.map((question) => question.id),
      ),
    ),
  );
  const responseIds = new Set<string>();
  const attachmentIds = new Set(data.attachments.map(({ id }) => id));
  for (const response of data.credential.credentialSubject.responses) {
    if (responseIds.has(response.id)) {
      throw new Error(`Duplicate assessment response id: ${response.id}`);
    }
    responseIds.add(response.id);
    const known =
      response.kind === "criterion"
        ? criterionIds.has(response.id)
        : questionIds.has(response.id);
    if (!known) {
      throw new Error(
        `Assessment response does not match the model: ${response.id}`,
      );
    }
    for (const evidenceId of response.evidenceIds) {
      if (!attachmentIds.has(evidenceId)) {
        throw new Error(
          `Assessment response references missing evidence: ${evidenceId}`,
        );
      }
    }
  }
};

export const normalizeEvidenceRecord = (
  model: EvidenceModelData,
  record: EvidenceAssessmentRecord,
): EvidenceAssessmentRecord => ({
  ...record,
  criterionProgress: Object.fromEntries(
    model.levels.flatMap((level) =>
      level.criteria.items.map((criterion) => [
        criterion.id,
        record.criterionProgress[criterion.id] ?? emptyCriterionProgress(),
      ]),
    ),
  ),
  questionProgress: Object.fromEntries(
    model.levels.flatMap((level) =>
      level.assessment.groups.flatMap((group) =>
        group.questions.map((question) => [
          question.id,
          record.questionProgress[question.id] ?? {
            answer: "",
            evidenceIds: [],
          },
        ]),
      ),
    ),
  ),
});

const evidenceReviewStatus = (
  statement: string,
  evidenceIds: string[],
): "not-provided" | "provided-not-reviewed" =>
  statement.trim() || evidenceIds.length > 0
    ? "provided-not-reviewed"
    : "not-provided";

export const buildAssessmentPackage = async (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
  record: EvidenceAssessmentRecord,
  includeEvidenceContent: boolean,
): Promise<AssessmentPackage<AssessmentCredentialSubject>> => {
  const normalized = normalizeEvidenceRecord(model, record);
  assertValidAssessmentSubject(profile, normalized.subject);
  currentAssuranceProfile(profile, normalized.assuranceProfileId);
  assertRecordEvidencePolicy(model, normalized, profile);
  const [assurance, payloadSha256] = await Promise.all([
    Promise.resolve(assuranceSummary(normalized)),
    assessmentPayloadSha256(model.model.id, profile, normalized),
  ]);
  const subject: AssessmentCredentialSubject = {
    id: `urn:uuid:${record.id}#subject`,
    model: {
      id: model.model.id,
      version: model.model.version,
      schemaVersion: model.schemaVersion,
      source: model.model.canonicalUrl,
    },
    profile: {
      id: profile.profile.id,
      version: profile.profile.version,
      schemaVersion: profile.schemaVersion,
    },
    assessment: {
      id: record.id,
      name: record.name,
      subject: record.subject,
      assuranceProfileId: record.assuranceProfileId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    identifiers: collectSubjectIdentifiers(profile, record.subject),
    assurance: {
      ...assurance,
      notice: currentAssuranceProfile(profile, record.assuranceProfileId)
        .notice,
      ...(profile.report.signing
        ? { approvalPolicy: profile.report.signing }
        : {}),
    },
    integrity: { algorithm: "SHA-256", payloadSha256 },
    result: calculateGatedMaturityScore(
      model,
      record,
      profile.runtime.methodology,
    ),
    responses: [
      ...model.levels.flatMap((level) =>
        level.criteria.items.map((criterion) => {
          const progress =
            record.criterionProgress[criterion.id] ?? emptyCriterionProgress();
          return {
            id: criterion.id,
            kind: "criterion" as const,
            level: level.number,
            prompt: criterion.text,
            status: progress.status,
            value: progress.evidenceStatement,
            notes: progress.notes,
            evidenceIds: progress.evidenceIds,
            evidenceReviewStatus: evidenceReviewStatus(
              progress.evidenceStatement,
              progress.evidenceIds,
            ),
          };
        }),
      ),
      ...model.levels.flatMap((level) =>
        level.assessment.groups.flatMap((group) =>
          group.questions.map((question) => {
            const progress = record.questionProgress[question.id] ?? {
              answer: "",
              evidenceIds: [],
            };
            return {
              id: question.id,
              kind: "question" as const,
              level: level.number,
              group: group.name,
              prompt: question.question,
              value: progress.answer,
              evidenceIds: progress.evidenceIds,
              evidenceReviewStatus: evidenceReviewStatus(
                progress.answer,
                progress.evidenceIds,
              ),
            };
          }),
        ),
      ),
    ],
  };
  const issuerName =
    record.subject.assessorOrganization?.trim() || "Self-assessed organization";
  return {
    format: "pkic-assessment-package",
    schemaVersion: "1.0.0",
    credential: {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://pkic.org/ns/assessment/v1.jsonld",
      ],
      id: `urn:uuid:${record.id}`,
      type: ["VerifiableCredential", "AssessmentCredential"],
      issuer: {
        id: `urn:pkic:assessment-issuer:${record.id}`,
        name: issuerName,
      },
      validFrom: record.updatedAt,
      credentialSchema: {
        id: "https://pkic.org/assessment-package.schema-1.0.0.json#/$defs/subject",
        type: "JsonSchema",
      },
      credentialSubject: subject,
      security: {
        status: "unsecured-draft",
        notice:
          "This credential draft has no issuer proof. Treat it as a self-asserted assessment until a trusted issuer applies a verifiable credential securing mechanism.",
      },
    },
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
  };
};

export const parseAssessmentPackage = async (
  text: string,
  model: EvidenceModelData,
  profile: AssessmentProfileData,
): Promise<EvidenceAssessmentRecord> => {
  if (utf8SizeExceeds(text, maxAssessmentPackageFileBytes(profile))) {
    throw new Error("The selected assessment package is too large.");
  }
  const parsed: unknown = JSON.parse(text);
  if (!validateAssessmentPackage100(parsed)) {
    throw new Error("The selected file is not a valid assessment package.");
  }
  const data = parsed as AssessmentPackage<AssessmentCredentialSubject>;
  const subject = data.credential.credentialSubject;
  if (
    subject.model.id !== model.model.id ||
    subject.model.version !== model.model.version
  ) {
    throw new Error(
      `This package uses ${subject.model.id} ${subject.model.version}; this tool loaded ${model.model.id} ${model.model.version}.`,
    );
  }
  if (
    subject.profile.id !== profile.profile.id ||
    subject.profile.version !== profile.profile.version
  ) {
    throw new Error(
      `This package uses assessment profile ${subject.profile.id} ${subject.profile.version}; this tool loaded ${profile.profile.id} ${profile.profile.version}.`,
    );
  }
  currentAssuranceProfile(profile, subject.assessment.assuranceProfileId);
  assertImportEvidencePolicy(data, profile);
  assertPackageResponseSemantics(data, model);

  const criterionProgress = Object.fromEntries(
    subject.responses
      .filter((response) => response.kind === "criterion")
      .map((response) => [
        response.id,
        {
          status: response.status ?? "not-assessed",
          evidenceStatement: response.value,
          notes: response.notes ?? "",
          evidenceIds: response.evidenceIds,
        },
      ]),
  );
  const questionProgress = Object.fromEntries(
    subject.responses
      .filter((response) => response.kind === "question")
      .map((response) => [
        response.id,
        { answer: response.value, evidenceIds: response.evidenceIds },
      ]),
  );
  const evidenceFiles: AssessmentEvidenceFile[] = [];
  for (const attachment of data.attachments) {
    const file = {
      id: attachment.id,
      name: attachment.fileName,
      mediaType: attachment.mediaType,
      size: attachment.size,
      sha256: attachment.sha256,
      addedAt: attachment.addedAt,
      dataBase64: attachment.dataBase64!,
    };
    await verifyEvidenceFile(file);
    evidenceFiles.push(file);
  }

  const restored: EvidenceAssessmentRecord = {
    stateSchemaVersion: 2,
    id: subject.assessment.id,
    name: subject.assessment.name,
    modelId: subject.model.id,
    dataVersion: subject.model.version,
    subject: subject.assessment.subject,
    assuranceProfileId: subject.assessment.assuranceProfileId,
    criterionProgress,
    questionProgress,
    evidenceFiles,
    createdAt: subject.assessment.createdAt,
    updatedAt: subject.assessment.updatedAt,
  };
  if (
    (await assessmentPayloadSha256(
      model.model.id,
      profile,
      normalizeEvidenceRecord(model, restored),
    )) !== subject.integrity.payloadSha256
  ) {
    throw new Error("Assessment payload digest mismatch.");
  }
  return restored;
};

export const downloadAssessmentPackage = async (
  model: EvidenceModelData,
  profile: AssessmentProfileData,
  record: EvidenceAssessmentRecord,
): Promise<void> => {
  const payload = await buildAssessmentPackage(model, profile, record, true);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  downloadBlob(
    blob,
    `${safeFileName(subjectDisplayName(profile, record)).toLowerCase()}-${model.model.id}-${model.model.version}-assessment.json`,
  );
};
