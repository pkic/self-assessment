/**
 * Criteria are shown by their position within the level, as on the published
 * model pages: criterion 1.1.2 is listed under Level 1 as "2". The full id is
 * kept everywhere it identifies the criterion (tooltips, accessible names,
 * the machine-readable package). Ids without dots are shown unchanged.
 */
export const criterionLabel = (id: string): string => id.split(".").pop() || id;

/** Strips the Markdown the model uses so criterion text reads as a label. */
export const plainText = (markdown: string): string =>
  stripLinkTargets(markdown)
    .replace(/[*_`>#]/g, "")
    .split(/\s/)
    .filter(Boolean)
    .join(" ");

/** Turns "[text](url)" into "text" with a single linear scan. */
const stripLinkTargets = (markdown: string): string => {
  let output = "";
  let index = 0;
  while (index < markdown.length) {
    const close = markdown.indexOf("](", index);
    const open = close < 0 ? -1 : markdown.lastIndexOf("[", close);
    const end = close < 0 ? -1 : markdown.indexOf(")", close + 2);
    if (close < 0 || open < index || end < 0) {
      output += markdown.slice(index);
      break;
    }
    output += markdown.slice(index, open) + markdown.slice(open + 1, close);
    index = end + 1;
  }
  return output;
};
