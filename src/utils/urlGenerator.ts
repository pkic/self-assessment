import yaml from "js-yaml";
import { EnabledExtension, ProgressData } from "../types/types";

export const WIDGET_MAX_STATE_SCHEMA_VERSION = 1;

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

export interface GenerateURLInput {
  progress: Record<string, ProgressData>;
  enabledExtensions: EnabledExtension[];
  dataVersion: string;
  stateSchemaVersion: number;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
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

export const generateURL = (input: GenerateURLInput): string => {
  const payload = {
    stateSchemaVersion: input.stateSchemaVersion,
    dataVersion: input.dataVersion,
    progress: compactProgress(input.progress),
    enabledExtensions: input.enabledExtensions,
  };
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  params.set("progress", utf8ToBase64(JSON.stringify(payload)));
  params.set("assessmentName", utf8ToBase64(input.assessmentName));
  params.set("assessorName", utf8ToBase64(input.assessorName));
  params.set("useCaseDescription", utf8ToBase64(input.useCaseDescription));
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
  if (stateSchemaVersion > WIDGET_MAX_STATE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported stateSchemaVersion ${stateSchemaVersion}; this widget supports up to ${WIDGET_MAX_STATE_SCHEMA_VERSION}.`,
    );
  }
  const dataVersion = raw.dataVersion ?? "1.0.0";
  const enabled = (raw.enabledExtensions ?? []).map((e) =>
    typeof e === "string" ? { id: e, version: "0.0.0" } : e,
  );
  return {
    progress: raw.progress ?? {},
    enabledExtensions: enabled,
    dataVersion,
    stateSchemaVersion,
    assessmentName: decodeText(params, "assessmentName"),
    assessorName: decodeText(params, "assessorName"),
    useCaseDescription: decodeText(params, "useCaseDescription"),
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
}

export const exportToYAML = (assessment: ExportYAMLInput): void => {
  const payload = {
    stateSchemaVersion: WIDGET_MAX_STATE_SCHEMA_VERSION,
    dataVersion: assessment.dataVersion,
    name: assessment.name,
    progress: assessment.progress,
    enabledExtensions: assessment.enabledExtensions,
    assessmentName: assessment.assessmentName,
    assessorName: assessment.assessorName,
    useCaseDescription: assessment.useCaseDescription,
    sourceStructure: assessment.sourceStructure,
    exportedAt: new Date().toISOString(),
  };
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
