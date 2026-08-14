import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PqcmmAssessmentRecord } from "./types";

interface PqcmmDatabase extends DBSchema {
  assessments: {
    key: string;
    value: PqcmmAssessmentRecord;
    indexes: { "by-updated": string };
  };
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = "pqcmm-sa";
const DB_VERSION = 1;
let databasePromise: Promise<IDBPDatabase<PqcmmDatabase>> | null = null;

const database = (): Promise<IDBPDatabase<PqcmmDatabase>> => {
  if (!databasePromise) {
    databasePromise = openDB<PqcmmDatabase>(DB_NAME, DB_VERSION, {
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

export const listPqcmmAssessments = async (): Promise<
  PqcmmAssessmentRecord[]
> => {
  const db = await database();
  const records = await db.getAllFromIndex("assessments", "by-updated");
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const loadActivePqcmmAssessment = async (): Promise<
  PqcmmAssessmentRecord | undefined
> => {
  const db = await database();
  const activeId = await db.get("meta", "activeId");
  return activeId ? db.get("assessments", activeId) : undefined;
};

export const savePqcmmAssessment = async (
  record: PqcmmAssessmentRecord,
): Promise<void> => {
  const db = await database();
  const tx = db.transaction(["assessments", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("assessments").put(record),
    tx.objectStore("meta").put(record.id, "activeId"),
    tx.done,
  ]);
};

export const selectPqcmmAssessment = async (id: string): Promise<void> => {
  const db = await database();
  await db.put("meta", id, "activeId");
};

export const deletePqcmmAssessment = async (id: string): Promise<void> => {
  const db = await database();
  await db.delete("assessments", id);
  const activeId = await db.get("meta", "activeId");
  if (activeId === id) await db.delete("meta", "activeId");
};
