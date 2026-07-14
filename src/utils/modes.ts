export interface ModeCaps {
  self: boolean;
  full: boolean;
  defaultView: "self" | "full";
}

const DEFAULT_MODE_CAPS: ModeCaps = {
  self: true,
  full: true,
  defaultView: "self",
};

/**
 * Parses the `modes` custom-element attribute into a set of view
 * capabilities. `self` can never be disabled — the raw assessment data must
 * never be hidden from the host — so `full` is the only axis a host can
 * restrict.
 */
export const parseModes = (attr: string | null | undefined): ModeCaps => {
  if (!attr || attr.trim() === "") {
    return { ...DEFAULT_MODE_CAPS };
  }

  const tokens = attr
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token === "self" || token === "full");

  if (tokens.length === 0) {
    return { ...DEFAULT_MODE_CAPS };
  }

  const hasSelf = tokens.includes("self");
  const hasFull = tokens.includes("full");

  return {
    self: true,
    full: hasFull || !hasSelf,
    defaultView: hasFull && !hasSelf ? "full" : "self",
  };
};
