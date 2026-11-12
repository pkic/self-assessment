/**
 * Criteria are shown by their position within the level, as on the published
 * model pages: criterion 1.1.2 is listed under Level 1 as "2". The full id is
 * kept everywhere it identifies the criterion (tooltips, accessible names,
 * the machine-readable package). Ids without dots are shown unchanged.
 */
export const criterionLabel = (id: string): string => id.split(".").pop() || id;
