export const MAX_PROFILE_YAML_BYTES = 512 * 1024;
export const MAX_MODEL_YAML_BYTES = 2 * 1024 * 1024;

const contentLength = (response: Response): number | null => {
  const value = response.headers.get("content-length");
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const fetchTextWithLimit = async (
  url: string,
  label: string,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Unable to load ${label} (${response.status}).`);
  }
  const declaredLength = contentLength(response);
  if (declaredLength !== null && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error(`${label} exceeds the ${maxBytes}-byte safety limit.`);
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw new Error(`${label} exceeds the ${maxBytes}-byte safety limit.`);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`${label} exceeds the ${maxBytes}-byte safety limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
};
