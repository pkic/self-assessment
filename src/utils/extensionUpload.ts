import { yamlParser, validateSchema } from "./yamlParser";
import { isCompatibleVersion } from "./compatibility";
import type { ExtensionData } from "../types/types";

export type ExtensionParseResult =
  { ok: true; extension: ExtensionData } | { ok: false; error: string };

// Parse an uploaded file's text into a validated ExtensionData. Never throws.
export function parseExtensionFile(text: string): ExtensionParseResult {
  let parsed: unknown;
  try {
    parsed = yamlParser(text);
  } catch (e) {
    return {
      ok: false,
      error: `Could not parse the file as YAML: ${(e as Error).message}`,
    };
  }
  if (!parsed || typeof parsed !== "object" || !("extension" in parsed)) {
    return {
      ok: false,
      error: "This file is not a PKIMM extension (no `extension` block).",
    };
  }
  if (
    typeof (parsed as { schemaVersion?: unknown }).schemaVersion !== "string"
  ) {
    return {
      ok: false,
      error: "The extension is missing a `schemaVersion` field.",
    };
  }
  try {
    validateSchema(parsed as ExtensionData);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  return { ok: true, extension: parsed as ExtensionData };
}

// Ids among `exts` incompatible with `modelVersion`.
export function computeIncompatibleExtensionIds(
  exts: ExtensionData[],
  modelVersion: string,
): Set<string> {
  const out = new Set<string>();
  for (const ext of exts) {
    if (!isCompatibleVersion(ext.extension.compatibility, modelVersion)) {
      out.add(ext.extension.id);
    }
  }
  return out;
}
