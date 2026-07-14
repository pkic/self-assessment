/** An extension's compatibility entry matches a model version when it is the
 *  version or a prefix of it at a dot boundary: "2" matches every 2.x.y,
 *  "2.0" every 2.0.x, "2.0.0" only 2.0.0. An absent/empty list means the
 *  extension declares no restriction and is treated as compatible. */
export const isCompatibleVersion = (
  compatibility: string[] | undefined,
  modelVersion: string,
): boolean => {
  if (!compatibility || compatibility.length === 0) return true;
  return compatibility.some(
    (entry) => modelVersion === entry || modelVersion.startsWith(entry + "."),
  );
};
