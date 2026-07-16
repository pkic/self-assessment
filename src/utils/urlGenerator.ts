import yaml from "js-yaml";
import { deflateSync, inflateSync, strToU8, strFromU8 } from "fflate";
import type {
  ActionPlans,
  Assessment,
  EnabledExtension,
  ModuleData,
  PkiEnvironment,
  ProgressData,
  RequirementProgress,
  Workspace,
} from "../types/types";
import { assertSupportedStateSchemaVersion, hasV2Content } from "./stateSchema";
import { calculateEffectiveCategoryLevel } from "./effectiveLevel";

const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCodePoint(b);
  });
  return btoa(binary);
};

export const base64ToUtf8 = (encoded: string): string => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.codePointAt(i) ?? 0;
  return new TextDecoder().decode(bytes);
};

// Binary-safe base64 helpers — distinct from utf8ToBase64/base64ToUtf8 above,
// which round-trip through TextEncoder/TextDecoder and are TEXT-only. Deflate
// output is arbitrary binary (not valid UTF-8), so it must go through these
// instead or the round-trip silently corrupts bytes that aren't valid UTF-8.
const BASE64_CHUNK_SIZE = 0x8000;

const bytesToBase64 = (u8: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < u8.length; i += BASE64_CHUNK_SIZE) {
    const chunk = u8.subarray(i, i + BASE64_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

interface FullParamPayload {
  hashVersion: 2;
  dataVersion: string;
  requirementProgress: Record<
    string,
    { level: number; applicability: boolean }
  >;
}

/** Encodes requirementProgress into the `full` URL param: JSON → raw DEFLATE
 *  (fflate's deflateSync/inflateSync ARE raw, no zlib/gzip header) → base64.
 *  Synchronous by design — no CompressionStream/async APIs. */
export const encodeFullParam = (
  dataVersion: string,
  requirementProgress: Record<string, RequirementProgress>,
): string => {
  const compact: FullParamPayload["requirementProgress"] = {};
  for (const [key, entry] of Object.entries(requirementProgress)) {
    compact[key] = { level: entry.level, applicability: entry.applicability };
  }
  const payload: FullParamPayload = {
    hashVersion: 2,
    // Kept so the `full` blob is self-describing (which model the requirement
    // ids belong to) even in isolation; rehydration itself reads the model
    // version from the accompanying compact `progress` param, not from here.
    dataVersion,
    requirementProgress: compact,
  };
  const deflated = deflateSync(strToU8(JSON.stringify(payload)));
  return bytesToBase64(deflated);
};

/** Decodes the `full` URL param produced by encodeFullParam. Never throws —
 *  returns null on any malformed input or an unexpected hashVersion, so a
 *  corrupted/foreign `full` param degrades to the plain `progress` param
 *  instead of breaking the share link entirely. */
export const decodeFullParam = (
  encoded: string,
): { requirementProgress: Record<string, RequirementProgress> } | null => {
  try {
    const json = strFromU8(inflateSync(base64ToBytes(encoded)));
    const parsed = JSON.parse(json) as Partial<FullParamPayload>;
    if (parsed.hashVersion !== 2) return null;
    const requirementProgress: Record<string, RequirementProgress> = {};
    for (const [key, entry] of Object.entries(
      parsed.requirementProgress ?? {},
    )) {
      requirementProgress[key] = {
        level: entry.level,
        applicability: entry.applicability,
        notes: "",
        evidence: "",
      };
    }
    return { requirementProgress };
  } catch {
    return null;
  }
};

export interface GenerateURLInput {
  progress: Record<string, ProgressData>;
  enabledExtensions: EnabledExtension[];
  dataVersion: string;
  stateSchemaVersion: number;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  /** Core module/category structure — needed to compute effective category
   *  levels for the v2 compact progress. Omit for the quick (v1) path. */
  modules?: ModuleData[];
  /** Per-requirement progress (full-assessment mode). Non-empty + modules
   *  present switches generateURL to the v2 effective-compact + `full`-param
   *  path; otherwise the output is byte-identical to the v1 quick path. */
  requirementProgress?: Record<string, RequirementProgress>;
}

/** A progress entry as it arrives from a URL hash. Modern hashes carry
 *  the compact shape (level + applicability only); legacy hashes from
 *  the old released widget include the full ProgressData. The consumer
 *  hydrates missing fields against the source YAML before storing. */
export type DecodedProgressEntry = Partial<ProgressData> & {
  level?: number;
  applicability?: boolean;
};

export interface DecodedHash {
  progress: Record<string, DecodedProgressEntry>;
  enabledExtensions: EnabledExtension[];
  dataVersion: string;
  stateSchemaVersion: number;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  /** Present iff a v2 `full` param was decoded. */
  requirementProgress?: Record<string, RequirementProgress>;
}

// Compact a progress map for transport: drop `result` and `description`
// because both are derivable at read time from `level` + the source YAML.
// On a fully-rated assessment this cuts the URL hash by ~4.5×, comfortably
// below the limits enforced by email clients, messaging apps, and QR
// codes that share links produced by this widget.
const compactProgress = (
  progress: Record<string, ProgressData>,
): Record<string, { level: number; applicability: boolean }> => {
  const out: Record<string, { level: number; applicability: boolean }> = {};
  for (const [key, entry] of Object.entries(progress)) {
    out[key] = {
      level: entry.level,
      applicability: entry.applicability,
    };
  }
  return out;
};

// v2 compact progress: core category entries carry the EFFECTIVE display
// level (blended from requirement ratings when present) rather than the
// self-declared category level, so a released widget reading only `progress`
// still renders the same level the full-assessment UI shows. Extension-scoped
// entries (`${extId}.${m}.${c}`) are not derivable from calculateEffectiveCategoryLevel
// (that call is core-category only) and are copied through unchanged.
const compactProgressEffective = (
  modules: ModuleData[],
  progress: Record<string, ProgressData>,
  requirementProgress: Record<string, RequirementProgress>,
): Record<string, { level: number; applicability: boolean }> => {
  const out: Record<string, { level: number; applicability: boolean }> = {};
  const coreKeys = new Set<string>();
  for (const m of modules) {
    for (const c of m.categories) {
      const key = `${m.id}.${c.id}`;
      coreKeys.add(key);
      const eff = calculateEffectiveCategoryLevel(
        m.id,
        c,
        progress,
        requirementProgress,
      );
      // eff.display === -1 covers BOTH explicit category Not Applicable and
      // *derived* Not Applicable (all in-scope requirements individually
      // scoped out) — in the derived case the category's stored
      // `applicability` is still true, so reading stored applicability here
      // would wrongly emit `{level:0, applicability:true}` ("Not Assessed")
      // for a category that is actually Not Applicable. eff.display !== -1
      // is correct for both cases.
      out[key] = {
        level: eff.display === -1 ? (progress[key]?.level ?? 0) : eff.display,
        applicability: eff.display !== -1,
      };
    }
  }
  // Copy through everything else (extension-scoped `${extId}.${m}.${c}` keys)
  // unchanged — this is not a core category key, so it was never touched above.
  for (const [key, entry] of Object.entries(progress)) {
    if (coreKeys.has(key)) continue;
    out[key] = {
      level: entry.level,
      applicability: entry.applicability,
    };
  }
  return out;
};

export const generateURL = (input: GenerateURLInput): string => {
  const hasFullMode =
    !!input.requirementProgress &&
    Object.keys(input.requirementProgress).length > 0 &&
    !!input.modules;

  const payload = {
    stateSchemaVersion: input.stateSchemaVersion,
    dataVersion: input.dataVersion,
    progress: hasFullMode
      ? compactProgressEffective(
          input.modules!,
          input.progress,
          input.requirementProgress!,
        )
      : compactProgress(input.progress),
    enabledExtensions: input.enabledExtensions,
  };
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  params.set("progress", utf8ToBase64(JSON.stringify(payload)));
  params.set("assessmentName", utf8ToBase64(input.assessmentName));
  params.set("assessorName", utf8ToBase64(input.assessorName));
  params.set("useCaseDescription", utf8ToBase64(input.useCaseDescription));
  if (hasFullMode) {
    params.set(
      "full",
      encodeFullParam(input.dataVersion, input.requirementProgress!),
    );
  }
  url.hash = params.toString();
  return url.toString();
};

const decodeText = (p: URLSearchParams, key: string): string => {
  const v = p.get(key);
  return v ? base64ToUtf8(v) : "";
};

export const decodeProgressHash = (hash: string): DecodedHash | null => {
  const params = new URLSearchParams(hash);
  const enc = params.get("progress");
  if (!enc) return null;
  const raw = JSON.parse(base64ToUtf8(enc)) as {
    stateSchemaVersion?: number;
    dataVersion?: string;
    progress?: Record<string, ProgressData>;
    enabledExtensions?: EnabledExtension[] | string[];
  };
  const stateSchemaVersion = raw.stateSchemaVersion ?? 1;
  assertSupportedStateSchemaVersion(stateSchemaVersion, "Shared link");
  const dataVersion = raw.dataVersion ?? "1.0.0";
  const enabled = (raw.enabledExtensions ?? []).map((e) =>
    typeof e === "string" ? { id: e, version: "0.0.0" } : e,
  );
  const full = params.get("full");
  const decodedFull = full ? decodeFullParam(full) : null;
  return {
    progress: raw.progress ?? {},
    enabledExtensions: enabled,
    dataVersion,
    stateSchemaVersion,
    assessmentName: decodeText(params, "assessmentName"),
    assessorName: decodeText(params, "assessorName"),
    useCaseDescription: decodeText(params, "useCaseDescription"),
    ...(decodedFull
      ? { requirementProgress: decodedFull.requirementProgress }
      : {}),
  };
};

export interface ExportYAMLInput {
  name?: string;
  dataVersion: string;
  progress: Record<string, ProgressData>;
  enabledExtensions: EnabledExtension[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  sourceStructure?: unknown;
  id?: string;
  meta?: { createdAt: string; updatedAt: string; importedFromId?: string };
  lastView?: "self" | "full";
  lastPosition?: {
    view: string;
    tab: string;
    categoryKey?: string;
    requirementKey?: string;
  };
  // Full-assessment (v2) fields — all optional; a quick assessment omits
  // every one of these, so the v2 spread contributes nothing and the payload
  // stamps stateSchemaVersion 1. The payload still always carries id/meta/
  // exportedAt, so it is NOT byte-identical to the pre-v2 export; v1 consumers
  // and the migration engine simply ignore those extra top-level keys.
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

// The v2-only fields spread into the YAML payload when stamped as v2 below.
// (Stamping itself is decided against the full assessment object, not this
// subset — see buildYAMLExportPayload.)
const v2ContentFields = (
  a: ExportYAMLInput,
): Pick<
  Assessment,
  | "requirementProgress"
  | "organizationName"
  | "assessorPosition"
  | "assessorCompany"
  | "assessmentType"
  | "startDate"
  | "targetDate"
  | "finishDate"
  | "pkiEnvironment"
  | "workspace"
  | "actionPlans"
> => ({
  requirementProgress: a.requirementProgress,
  organizationName: a.organizationName,
  assessorPosition: a.assessorPosition,
  assessorCompany: a.assessorCompany,
  assessmentType: a.assessmentType,
  startDate: a.startDate,
  targetDate: a.targetDate,
  finishDate: a.finishDate,
  pkiEnvironment: a.pkiEnvironment,
  workspace: a.workspace,
  actionPlans: a.actionPlans,
});

/** Pure payload builder, exported so tests can pin the exact shape (and
 *  byte-identity for a quick assessment) without touching the DOM. Keep
 *  side effects (Blob/anchor/click) out of this function. */
export const buildYAMLExportPayload = (
  assessment: ExportYAMLInput,
  exportedAt: string = new Date().toISOString(),
): Record<string, unknown> => {
  // Stamping is decided on the full input object — the same predicate call
  // the JSON export path uses — so this can never drift from hasV2Content's
  // definition of "v2" by missing a field in v2ContentFields below.
  // v2ContentFields is used only to select which fields get spread into the
  // serialized payload.
  const isV2 = hasV2Content(assessment as unknown as Assessment);
  return {
    stateSchemaVersion: isV2 ? 2 : 1,
    dataVersion: assessment.dataVersion,
    name: assessment.name,
    id: assessment.id,
    progress: assessment.progress,
    enabledExtensions: assessment.enabledExtensions,
    assessmentName: assessment.assessmentName,
    assessorName: assessment.assessorName,
    useCaseDescription: assessment.useCaseDescription,
    sourceStructure: assessment.sourceStructure,
    meta: assessment.meta,
    ...(assessment.lastView !== undefined
      ? { lastView: assessment.lastView }
      : {}),
    ...(assessment.lastPosition !== undefined
      ? { lastPosition: assessment.lastPosition }
      : {}),
    exportedAt,
    ...(isV2 ? v2ContentFields(assessment) : {}),
  };
};

export const exportToYAML = (assessment: ExportYAMLInput): void => {
  const payload = buildYAMLExportPayload(assessment);
  const yamlStr = yaml.dump(payload);
  const blob = new Blob([yamlStr], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${
    (assessment.name ?? assessment.assessmentName ?? "assessment")
      .replace(/\W+/g, "-")
      .toLowerCase() || "assessment"
  }.yaml`;
  a.click();
  URL.revokeObjectURL(url);
};

/** The single lossless YAML download. Maps a full Assessment onto the export
 *  payload (every field round-trips) and triggers a file download. */
export const downloadAssessmentYAML = (a: Assessment): void =>
  exportToYAML({
    id: a.id,
    name: a.name,
    dataVersion: a.dataVersion,
    progress: a.progress,
    enabledExtensions: a.enabledExtensions,
    assessmentName: a.assessmentName,
    assessorName: a.assessorName,
    useCaseDescription: a.useCaseDescription,
    sourceStructure: a.sourceStructure,
    meta: a.meta,
    lastView: a.lastView,
    lastPosition: a.lastPosition,
    requirementProgress: a.requirementProgress,
    organizationName: a.organizationName,
    assessorPosition: a.assessorPosition,
    assessorCompany: a.assessorCompany,
    assessmentType: a.assessmentType,
    startDate: a.startDate,
    targetDate: a.targetDate,
    finishDate: a.finishDate,
    pkiEnvironment: a.pkiEnvironment,
    workspace: a.workspace,
    actionPlans: a.actionPlans,
  });
