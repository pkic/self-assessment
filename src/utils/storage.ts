import yaml from "js-yaml";
import type {
  ActionPlans,
  Assessment,
  AssessmentData,
  EnabledExtension,
  PkiEnvironment,
  ProgressData,
  RequirementProgress,
  StructureSnapshot,
  Workspace,
} from "../types/types";
import { PKIMM_1_0_0_NAMES } from "../legacy/pkimm-model-1.0.0-names";
import {
  assertSupportedStateSchemaVersion,
  ForwardCompatError,
  hasV2Content,
} from "./stateSchema";
import { normalizeAssessmentActionPlans } from "./actionPlans";
export { WIDGET_MAX_STATE_SCHEMA_VERSION } from "./stateSchema";

export type ParseResult =
  | { ok: true; assessment: Assessment; stateSchemaVersion: number }
  | { ok: false; error: string; forwardIncompatible?: boolean };

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

export interface LegacyAssessmentData {
  progress: Record<string, ProgressData>;
  assessmentName?: string;
  assessorName?: string;
  useCaseDescription?: string;
  enabledExtensions?: string[];
}

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
  id?: string;
  meta?: {
    createdAt: string;
    updatedAt: string;
    importedFromId?: string;
  };
  lastView?: "self" | "full";
  lastPosition?: {
    view: string;
    tab: string;
    categoryKey?: string;
    requirementKey?: string;
  };
  requirementProgress?: Record<string, RequirementProgress>;
  organizationName?: string;
  assessorPosition?: "internal" | "external";
  assessorCompany?: string;
  assessmentType?: "self" | "formal" | "third-party";
  startDate?: string;
  targetDate?: string;
  finishDate?: string;
  pkiEnvironment?: PkiEnvironment;
  workspace?: Workspace;
  actionPlans?: ActionPlans;
}

const isNewExportShape = (
  parsed: unknown,
): parsed is Partial<NewExportShape> & { dataVersion: string } =>
  typeof parsed === "object" &&
  parsed !== null &&
  "dataVersion" in parsed &&
  typeof (parsed as { dataVersion?: unknown }).dataVersion === "string";

const isJsonEnvelope = (parsed: unknown): boolean =>
  typeof parsed === "object" &&
  parsed !== null &&
  ((parsed as { kind?: unknown }).kind === "pkimm-assessment" ||
    "formatVersion" in (parsed as object));

export const importYAMLFile = (text: string): Assessment => {
  const parsed = yaml.load(text);
  const now = new Date().toISOString();
  if (isJsonEnvelope(parsed)) {
    throw new Error(
      "This looks like an older JSON assessment file, which is no longer supported. Re-export the assessment as YAML.",
    );
  }
  if (isNewExportShape(parsed)) {
    const p = parsed as Partial<NewExportShape> & { dataVersion: string };
    if (typeof p.stateSchemaVersion === "number") {
      assertSupportedStateSchemaVersion(p.stateSchemaVersion, "Imported file");
    }
    const assessment: Assessment = {
      id: p.id ?? newId(),
      // Nullish (NOT `||`) so a valid exported empty `name: ""` round-trips as
      // "" instead of falling through to the "Imported assessment" fallback,
      // which is only for a file that has no `name` field at all.
      name: p.name ?? p.assessmentName ?? "Imported assessment",
      dataVersion: p.dataVersion,
      progress: p.progress ?? {},
      enabledExtensions: p.enabledExtensions ?? [],
      assessmentName: p.assessmentName ?? "",
      assessorName: p.assessorName ?? "",
      useCaseDescription: p.useCaseDescription ?? "",
      requirementProgress: p.requirementProgress,
      organizationName: p.organizationName,
      assessorPosition: p.assessorPosition,
      assessorCompany: p.assessorCompany,
      assessmentType: p.assessmentType,
      startDate: p.startDate,
      targetDate: p.targetDate,
      finishDate: p.finishDate,
      pkiEnvironment: p.pkiEnvironment,
      workspace: p.workspace,
      actionPlans: p.actionPlans,
      lastView: p.lastView,
      lastPosition: p.lastPosition,
      sourceStructure: p.sourceStructure ?? { byKey: {} },
      meta: {
        createdAt: p.meta?.createdAt ?? now,
        updatedAt: p.meta?.updatedAt ?? now,
        ...(p.meta?.importedFromId
          ? { importedFromId: p.meta.importedFromId }
          : {}),
      },
    };
    return normalizeAssessmentActionPlans(assessment);
  }
  return importLegacyData(parsed as LegacyAssessmentData);
};

/** The single import entry point: parses a YAML export (new-shape or
 *  legacy 1.0.0) via `importYAMLFile`, which preserves `assessment.id` for
 *  a new-shape export — required so a re-import of a previously-exported
 *  file can be matched against its local counterpart for the collision
 *  chooser. A legacy 1.0.0 payload always mints a fresh id via `newId()`
 *  (no stable id to collide on).
 *
 *  Never throws: `importYAMLFile` can throw (malformed YAML, an
 *  unsupported `.pkimm.json` envelope, or a forward-incompatible
 *  `stateSchemaVersion`) — all are caught here and surfaced via
 *  `ParseResult` so callers only ever branch on it. */
export const importAssessmentFile = (text: string): ParseResult => {
  try {
    const assessment = importYAMLFile(text);
    return {
      ok: true,
      assessment,
      stateSchemaVersion: hasV2Content(assessment) ? 2 : 1,
    };
  } catch (err) {
    const message = (err as Error).message || "Could not import file.";
    return {
      ok: false,
      error: message,
      forwardIncompatible: err instanceof ForwardCompatError,
    };
  }
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
