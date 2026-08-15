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

const normalizeRecord = (
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
  const withoutDeprecatedSignerFields = { ...legacy };
  delete withoutDeprecatedSignerFields.executiveName;
  delete withoutDeprecatedSignerFields.executiveTitle;
  delete withoutDeprecatedSignerFields.executiveOrganization;
  if (record.stateSchemaVersion === 2 && record.subject) {
    return withoutDeprecatedSignerFields;
  }
  return {
    ...withoutDeprecatedSignerFields,
    stateSchemaVersion: 2,
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
  };
};

const database = (): Promise<IDBPDatabase<EvidenceAssessmentDatabase>> => {
  if (!databasePromise) {
    databasePromise = openDB<EvidenceAssessmentDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const assessments = db.createObjectStore("assessments", {
          keyPath: "id",
        });
        assessments.createIndex("by-updated", "updatedAt");
        db.createObjectStore("meta");
      },
    });
  }
  return databasePromise;
};

export const listEvidenceAssessments = async (): Promise<
  EvidenceAssessmentRecord[]
> => {
  const db = await database();
  const records = await db.getAllFromIndex("assessments", "by-updated");
  return records
    .map(normalizeRecord)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const loadActiveEvidenceAssessment = async (): Promise<
  EvidenceAssessmentRecord | undefined
> => {
  const db = await database();
  const activeId = await db.get("meta", "activeId");
  const record = activeId ? await db.get("assessments", activeId) : undefined;
  return record ? normalizeRecord(record) : undefined;
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
