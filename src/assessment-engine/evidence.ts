import type { EvidenceFile } from "./types";
import { newAssessmentId } from "./id";

export const MAX_EVIDENCE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_EVIDENCE_PACKAGE_BYTES = 100 * 1024 * 1024;
export const MAX_EVIDENCE_ATTACHMENTS = 256;

export interface EvidenceLimits {
  maxFileBytes: number;
  maxPackageBytes: number;
  acceptedMediaTypes?: string[];
}

export const secureCryptographyAvailable = (): boolean =>
  Boolean(globalThis.crypto?.subtle);

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};

export const base64ToBytes = (encoded: string): Uint8Array => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  if (!secureCryptographyAvailable()) {
    throw new Error(
      "Cryptographic hashing requires HTTPS or localhost. Open this assessment in a secure context before attaching evidence or exporting.",
    );
  }
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    ),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

export const safeFileName = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "evidence";

export const evidenceMediaTypeAllowed = (
  mediaType: string,
  acceptedMediaTypes: string[] = ["*/*"],
): boolean =>
  acceptedMediaTypes.some((accepted) => {
    if (accepted === "*/*" || accepted === mediaType) return true;
    if (!accepted.endsWith("/*")) return false;
    return mediaType.startsWith(accepted.slice(0, -1));
  });

export const evidenceFromFile = async (
  file: File,
  existingFiles: EvidenceFile[],
  limits: EvidenceLimits,
): Promise<EvidenceFile> => {
  if (file.size > limits.maxFileBytes) {
    throw new Error(
      `Each evidence file must be ${Math.floor(limits.maxFileBytes / 1024 / 1024)} MB or smaller.`,
    );
  }
  const currentSize = existingFiles.reduce((sum, item) => sum + item.size, 0);
  if (currentSize + file.size > limits.maxPackageBytes) {
    throw new Error(
      `The assessment evidence package cannot exceed ${Math.floor(limits.maxPackageBytes / 1024 / 1024)} MB.`,
    );
  }
  const mediaType = file.type || "application/octet-stream";
  if (!evidenceMediaTypeAllowed(mediaType, limits.acceptedMediaTypes)) {
    throw new Error(`Evidence media type is not accepted: ${mediaType}`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    id: newAssessmentId(),
    name: file.name,
    mediaType,
    size: file.size,
    sha256: await sha256Hex(bytes),
    addedAt: new Date().toISOString(),
    dataBase64: bytesToBase64(bytes),
  };
};

export const verifyEvidenceFile = async (file: EvidenceFile): Promise<void> => {
  const bytes = base64ToBytes(file.dataBase64);
  if (bytes.byteLength !== file.size) {
    throw new Error(`Evidence file size mismatch: ${file.name}`);
  }
  if ((await sha256Hex(bytes)) !== file.sha256) {
    throw new Error(`Evidence file digest mismatch: ${file.name}`);
  }
};
