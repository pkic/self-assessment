import yaml from "js-yaml";
import type {
  Assessment,
  AssessmentData,
  EnabledExtension,
  ProgressData,
  SavedState,
  StructureSnapshot,
} from "../types/types";
import { PKIMM_1_0_0_NAMES } from "../legacy/pkimm-model-1.0.0-names";

export const buildStructureSnapshot = (
  data: AssessmentData,
): StructureSnapshot => {
  const byKey: StructureSnapshot["byKey"] = {};
  for (const m of data.modules) {
    for (const c of m.categories) {
      byKey[`${m.id}.${c.id}`] = { moduleId: m.id, categoryName: c.name };
      for (const r of c.requirements ?? []) {
        byKey[`${m.id}.${c.id}.${r.id}`] = {
          moduleId: m.id,
          categoryName: c.name,
          requirementName: r.description,
        };
      }
    }
  }
  return { byKey };
};

export const newId = (): string => crypto.randomUUID();

export const STORAGE_KEY = "pkimm-sa";
export const LEGACY_KEY = "assessmentData";
export const WIDGET_MAX_STATE_SCHEMA_VERSION = 1;

export interface LegacyAssessmentData {
  progress: Record<string, ProgressData>;
  assessmentName?: string;
  assessorName?: string;
  useCaseDescription?: string;
  enabledExtensions?: string[];
}

export const readSavedState = (): SavedState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as SavedState;
  if (parsed.stateSchemaVersion > WIDGET_MAX_STATE_SCHEMA_VERSION) {
    throw new Error(
      `Saved state uses stateSchemaVersion ${parsed.stateSchemaVersion}; widget supports up to ${WIDGET_MAX_STATE_SCHEMA_VERSION}.`,
    );
  }
  return parsed;
};

export const writeSavedState = (state: SavedState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

/** Reads the legacy "assessmentData" key directly, without the first-load
 *  guard. Use from the assessment-manager UI where the user explicitly
 *  asked to import legacy data even though pkimm-sa already exists. */
export const readLegacyAssessmentData = (): LegacyAssessmentData | null => {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LegacyAssessmentData;
  } catch {
    return null;
  }
};

/** First-load detection: returns the legacy payload only when pkimm-sa
 *  is absent, so the legacy prompt fires exactly once per browser. */
export const detectLegacyAssessmentData = (): LegacyAssessmentData | null => {
  if (localStorage.getItem(STORAGE_KEY)) return null;
  return readLegacyAssessmentData();
};

const buildLegacyStructureSnapshot = (
  progress: Record<string, ProgressData>,
): StructureSnapshot => {
  const byKey: StructureSnapshot["byKey"] = {};
  for (const key of Object.keys(progress)) {
    const known = PKIMM_1_0_0_NAMES[key];
    if (known) byKey[key] = known;
  }
  return { byKey };
};

export const importLegacyData = (legacy: LegacyAssessmentData): Assessment => {
  const now = new Date().toISOString();
  const enabled: EnabledExtension[] = (legacy.enabledExtensions ?? []).map(
    (id) => ({ id, version: "0.0.0" }),
  );
  return {
    id: newId(),
    name: legacy.assessmentName || "Imported assessment",
    dataVersion: "1.0.0",
    progress: { ...legacy.progress },
    enabledExtensions: enabled,
    assessmentName: legacy.assessmentName ?? "",
    assessorName: legacy.assessorName ?? "",
    useCaseDescription: legacy.useCaseDescription ?? "",
    sourceStructure: buildLegacyStructureSnapshot(legacy.progress),
    meta: { createdAt: now, updatedAt: now },
  };
};

export const removeLegacyAssessmentData = (): void => {
  localStorage.removeItem(LEGACY_KEY);
};

interface NewExportShape {
  stateSchemaVersion: number;
  dataVersion: string;
  name?: string;
  progress: Record<string, ProgressData>;
  enabledExtensions: EnabledExtension[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  sourceStructure: StructureSnapshot;
}

const isNewExportShape = (
  parsed: unknown,
): parsed is Partial<NewExportShape> & { dataVersion: string } =>
  typeof parsed === "object" &&
  parsed !== null &&
  "dataVersion" in parsed &&
  typeof (parsed as { dataVersion?: unknown }).dataVersion === "string";

export const importYAMLFile = (text: string): Assessment => {
  const parsed = yaml.load(text);
  const now = new Date().toISOString();
  if (isNewExportShape(parsed)) {
    const p = parsed;
    if (
      typeof p.stateSchemaVersion === "number" &&
      p.stateSchemaVersion > WIDGET_MAX_STATE_SCHEMA_VERSION
    ) {
      throw new Error(
        `Imported file uses stateSchemaVersion ${p.stateSchemaVersion}; widget supports up to ${WIDGET_MAX_STATE_SCHEMA_VERSION}.`,
      );
    }
    return {
      id: newId(),
      name: p.name || p.assessmentName || "Imported assessment",
      dataVersion: p.dataVersion,
      progress: p.progress ?? {},
      enabledExtensions: p.enabledExtensions ?? [],
      assessmentName: p.assessmentName ?? "",
      assessorName: p.assessorName ?? "",
      useCaseDescription: p.useCaseDescription ?? "",
      sourceStructure: p.sourceStructure ?? { byKey: {} },
      meta: { createdAt: now, updatedAt: now },
    };
  }
  return importLegacyData(parsed as LegacyAssessmentData);
};

const seedProgressFromSnapshot = (
  sourceStructure: StructureSnapshot,
): Record<string, ProgressData> => {
  const seeded: Record<string, ProgressData> = {};
  for (const [key, entry] of Object.entries(sourceStructure.byKey)) {
    // Only seed category-level keys (no requirementName); requirement-level
    // entries don't have their own progress, just the category that owns them.
    if (!entry.requirementName) {
      seeded[key] = {
        level: 0,
        result: "Not Assessed",
        description: "",
        applicability: true,
      };
    }
  }
  return seeded;
};

export const newEmptyAssessment = (
  dataVersion: string,
  sourceStructure: StructureSnapshot,
  name = "New assessment",
): Assessment => {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    dataVersion,
    progress: seedProgressFromSnapshot(sourceStructure),
    enabledExtensions: [],
    assessmentName: "",
    assessorName: "",
    useCaseDescription: "",
    sourceStructure,
    meta: { createdAt: now, updatedAt: now },
  };
};
