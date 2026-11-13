import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EvidenceAssessmentRecord } from "./types";

interface EvidenceAssessmentDatabase extends DBSchema {
  assessments: {
    key: string;
    value: EvidenceAssessmentRecord;
    indexes: { "by-updated": string };
  };
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = "pkic-evidence-assessments";
const DB_VERSION = 1;
let databasePromise: Promise<IDBPDatabase<EvidenceAssessmentDatabase>> | null =
  null;

export const migrateStoredEvidenceRecord = (
  record: EvidenceAssessmentRecord,
): EvidenceAssessmentRecord => {
  const legacy = record as unknown as EvidenceAssessmentRecord & {
    assessmentType?: "self" | "third-party";
    productName?: string;
    productVersion?: string;
    vendorName?: string;
    deploymentScope?: string;
    assessorName?: string;
    assessorOrganization?: string;
    assessmentDate?: string;
    executiveName?: string;
    executiveTitle?: string;
    executiveOrganization?: string;
  };
  const legacyVersion = (record as unknown as { stateSchemaVersion?: number })
    .stateSchemaVersion;
  const withoutDeprecatedSignerFields = { ...legacy };
  delete withoutDeprecatedSignerFields.executiveName;
  delete withoutDeprecatedSignerFields.executiveTitle;
  delete withoutDeprecatedSignerFields.executiveOrganization;
  if (legacyVersion === 3 && record.subject) {
    return withoutDeprecatedSignerFields;
  }
  const legacyQuestionProgress = legacy.questionProgress as unknown as Record<
    string,
    { answer?: string; evidenceIds?: string[] }
  >;
  const migratedQuestionProgress = Object.fromEntries(
    Object.entries(legacyQuestionProgress ?? {}).map(([id, progress]) => {
      const values: Record<string, string | string[]> = progress.answer
        ? { response: progress.answer }
        : {};
      return [
        id,
        {
          finding: "not-assessed",
          values,
          evidenceIds: progress.evidenceIds ?? [],
        },
      ];
    }),
  );
  if (legacyVersion === 2 && record.subject) {
    return {
      ...withoutDeprecatedSignerFields,
      stateSchemaVersion: 3,
      questionProgress: migratedQuestionProgress,
    };
  }
  return {
    ...withoutDeprecatedSignerFields,
    stateSchemaVersion: 3,
    subject: {
      productName: legacy.productName ?? "",
      productVersion: legacy.productVersion ?? "",
      vendorName: legacy.vendorName ?? "",
      deploymentScope: legacy.deploymentScope ?? "",
      assessorName: legacy.assessorName ?? "",
      assessorOrganization: legacy.assessorOrganization ?? "",
      assessmentDate: legacy.assessmentDate ?? "",
    },
    assuranceProfileId: "self",
    questionProgress: migratedQuestionProgress,
  };
};

const database = (): Promise<IDBPDatabase<EvidenceAssessmentDatabase>> => {
  databasePromise ??= openDB<EvidenceAssessmentDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const assessments = db.createObjectStore("assessments", {
        keyPath: "id",
      });
      assessments.createIndex("by-updated", "updatedAt");
      db.createObjectStore("meta");
    },
  });
  return databasePromise;
};

export const listEvidenceAssessments = async (): Promise<
  EvidenceAssessmentRecord[]
> => {
  const db = await database();
  const records = await db.getAllFromIndex("assessments", "by-updated");
  return records
    .map(migrateStoredEvidenceRecord)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const loadActiveEvidenceAssessment = async (): Promise<
  EvidenceAssessmentRecord | undefined
> => {
  const db = await database();
  const activeId = await db.get("meta", "activeId");
  const record = activeId ? await db.get("assessments", activeId) : undefined;
  return record ? migrateStoredEvidenceRecord(record) : undefined;
};

export const saveEvidenceAssessment = async (
  record: EvidenceAssessmentRecord,
): Promise<void> => {
  const db = await database();
  const tx = db.transaction(["assessments", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("assessments").put(record),
    tx.objectStore("meta").put(record.id, "activeId"),
    tx.done,
  ]);
};

export const selectEvidenceAssessment = async (id: string): Promise<void> => {
  const db = await database();
  await db.put("meta", id, "activeId");
};

export const deleteEvidenceAssessment = async (id: string): Promise<void> => {
  const db = await database();
  await db.delete("assessments", id);
  const activeId = await db.get("meta", "activeId");
  if (activeId === id) await db.delete("meta", "activeId");
};
