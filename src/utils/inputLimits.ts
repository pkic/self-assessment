import yaml from "js-yaml";

/** Longest text a single field can hold: typing stops here, and PDF export cuts longer text. */
export const MAX_TEXT_LENGTH = 10_000;
/** Most a PDF report may count in total (see `exceedsReportLimit`), with REPORT_LINE_BREAK_WEIGHT added for each line break and REPORT_LIST_ITEM_WEIGHT for each list item. */
export const MAX_REPORT_TEXT_LENGTH = 1_000_000;
/** What each line break adds toward MAX_REPORT_TEXT_LENGTH besides its own character: it starts a new line in the PDF layout. */
export const REPORT_LINE_BREAK_WEIGHT = 50;
/** What each list item adds toward MAX_REPORT_TEXT_LENGTH besides its own count: it is its own unit in the PDF layout, which costs more than a line break inside text. */
export const REPORT_LIST_ITEM_WEIGHT = 200;
/** Largest import: the file in bytes, its text in characters, and its content once parsed (see `exceedsSize`). */
export const MAX_IMPORT_LENGTH = 10 * 1024 * 1024;
/** Longest share-link `full` parameter that is decoded. */
export const MAX_FULL_PARAM_LENGTH = 16_384;
/** Most bytes a share-link `full` parameter may inflate to; a fully rated 2.0.0 assessment inflates to about 6 KB. */
export const MAX_FULL_PARAM_DECODED_LENGTH = 256 * 1024;
/** Deepest nesting of arrays and objects that `exceedsSize` accepts. */
export const MAX_NESTING_DEPTH = 100;

/** Thrown by `readImportFile` and `loadImportYaml` for a file over MAX_IMPORT_LENGTH: its size, its text, or its content once aliases are expanded. */
export class ImportTooLargeError extends Error {
  constructor() {
    super("This file is too large to import. The limit is 10 MB.");
    this.name = "ImportTooLargeError";
  }
}

/** Thrown by PDF export when the report counts more than MAX_REPORT_TEXT_LENGTH, with REPORT_LINE_BREAK_WEIGHT added for each line break and REPORT_LIST_ITEM_WEIGHT for each list item. */
export class ReportTooLargeError extends Error {
  constructor() {
    super(
      "This assessment has too much text for a PDF report. Shorten some notes or evidence and try again.",
    );
    this.name = "ReportTooLargeError";
  }
}

type Container = unknown[] | Record<string, unknown>;

// Arrays and plain objects (prototype Object.prototype or null); any other value is a leaf.
const isContainer = (value: unknown): value is Container => {
  if (typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) return true;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// Maps each original to its copy. Copies are registered before their entries
// are copied, so a shared part is copied once and a structure that refers to
// itself ends.
type Copies = WeakMap<object, Container>;

const cutText = (text: string): string =>
  text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}...` : text;

// copyArray, copyObject and limitValue call each other; as function
// declarations they are all defined before any of them runs.
function copyArray(value: unknown[], copies: Copies): unknown[] {
  const copy: unknown[] = [];
  copies.set(value, copy);
  for (let index = 0; index < value.length; index++) {
    copy[index] = limitValue(value[index], copies);
  }
  return copy;
}

function copyObject(
  value: Record<string, unknown>,
  copies: Copies,
): Record<string, unknown> {
  const copy: Record<string, unknown> = Object.create(
    Object.getPrototypeOf(value),
  );
  copies.set(value, copy);
  for (const key of Object.keys(value)) {
    // defineProperty keeps an own "__proto__" key as data, not as the prototype.
    Object.defineProperty(copy, key, {
      value: limitValue(value[key], copies),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return copy;
}

function limitValue(value: unknown, copies: Copies): unknown {
  if (typeof value === "string") return cutText(value);
  if (!isContainer(value)) return value;
  const known = copies.get(value);
  if (known) return known;
  return Array.isArray(value)
    ? copyArray(value, copies)
    : copyObject(value, copies);
}

/** Copy of `value` where each string over MAX_TEXT_LENGTH is cut to that length and ends with "..."; copies only arrays and plain objects, each once. */
export const limitTextLength = <T>(value: T): T =>
  limitValue(value, new WeakMap()) as T;

// Number of "\n" in `text`.
const countLineBreaks = (text: string): number => {
  let breaks = 0;
  for (
    let at = text.indexOf("\n");
    at !== -1;
    at = text.indexOf("\n", at + 1)
  ) {
    breaks++;
  }
  return breaks;
};

// What a value other than an array or object adds: a string its length (at
// least 1) plus `lineBreakWeight` for each "\n" (looked for only when the
// weight is above 0), anything else 1.
const sizeOf = (value: unknown, lineBreakWeight: number): number => {
  if (typeof value !== "string") return 1;
  const length = value.length || 1;
  return lineBreakWeight > 0
    ? length + countLineBreaks(value) * lineBreakWeight
    : length;
};

// One open container, read one value at a time: an array by index, an object
// through the own keys taken when it was reached. `width`, its number of
// values, was added to the total then, so the keys held stay within the total.
type Frame = {
  readonly width: number;
  readonly depth: number;
  next: number;
} & (
  | { readonly container: unknown[]; readonly keys: null }
  | { readonly container: Record<string, unknown>; readonly keys: string[] }
);

const openFrame = (container: Container, depth: number): Frame => {
  if (Array.isArray(container)) {
    return { container, keys: null, width: container.length, depth, next: 0 };
  }
  const keys = Object.keys(container);
  return { container, keys, width: keys.length, depth, next: 0 };
};

// What an array or object adds when it is reached: its width (at least 1),
// plus `listItemWeight` for each array element when that weight is above 0.
const containerSize = (frame: Frame, listItemWeight: number): number => {
  const width = Math.max(frame.width, 1);
  return frame.keys === null && listItemWeight > 0
    ? width + frame.width * listItemWeight
    : width;
};

interface SizeCount {
  total: number;
  readonly maxLength: number;
  readonly lineBreakWeight: number;
  readonly listItemWeight: number;
  // One frame per open container, from the root down to the value being read.
  readonly stack: Frame[];
}

// Counts a value when it is reached (an array or object before any of its
// values) and opens an array or object; true as soon as a limit is passed.
const countValue = (
  count: SizeCount,
  value: unknown,
  keyLength: number,
  depth: number,
): boolean => {
  if (!isContainer(value)) {
    count.total += keyLength + sizeOf(value, count.lineBreakWeight);
    return count.total > count.maxLength;
  }
  if (depth > MAX_NESTING_DEPTH) return true;
  const frame = openFrame(value, depth);
  count.total += keyLength + containerSize(frame, count.listItemWeight);
  if (count.total > count.maxLength) return true;
  count.stack.push(frame);
  return false;
};

// Counts the next value of an open container: an array element, or an
// object's value together with its key's length.
const countNextValue = (count: SizeCount, frame: Frame): boolean => {
  const index = frame.next++;
  if (frame.keys === null) {
    return countValue(count, frame.container[index], 0, frame.depth + 1);
  }
  const key = frame.keys[index];
  return countValue(count, frame.container[key], key.length, frame.depth + 1);
};

/** True when `value` nests deeper than MAX_NESTING_DEPTH or, written out in full, passes `maxLength`. Each value counts when it is reached, and a value reached twice counts twice: an array or object its width (its number of values, at least 1), a string its length (at least 1), anything else 1; an object's value also adds its key's length. When above 0, `lineBreakWeight` (0 by default) is added for each "\n" in a string, and `listItemWeight` (0 by default) for each array element. */
export const exceedsSize = (
  value: unknown,
  maxLength: number,
  lineBreakWeight = 0,
  listItemWeight = 0,
): boolean => {
  const count: SizeCount = {
    total: 0,
    maxLength,
    lineBreakWeight,
    listItemWeight,
    stack: [],
  };
  if (countValue(count, value, 0, 1)) return true;
  while (count.stack.length > 0) {
    const frame = count.stack[count.stack.length - 1];
    if (frame.next === frame.width) {
      count.stack.pop();
    } else if (countNextValue(count, frame)) {
      return true;
    }
  }
  return false;
};

/** True when a PDF report counts more than MAX_REPORT_TEXT_LENGTH (see `exceedsSize`), with REPORT_LINE_BREAK_WEIGHT added for each line break and REPORT_LIST_ITEM_WEIGHT for each list item. */
export const exceedsReportLimit = (value: unknown): boolean =>
  exceedsSize(
    value,
    MAX_REPORT_TEXT_LENGTH,
    REPORT_LINE_BREAK_WEIGHT,
    REPORT_LIST_ITEM_WEIGHT,
  );

/** Reads an imported file as text; a file over MAX_IMPORT_LENGTH bytes is refused with ImportTooLargeError without being read. Every character takes at least one byte, so a file within the limit holds at most MAX_IMPORT_LENGTH characters. */
export const readImportFile = (file: Blob): Promise<string> =>
  file.size > MAX_IMPORT_LENGTH
    ? Promise.reject(new ImportTooLargeError())
    : file.text();

/** Parses an imported YAML file with YAML's JSON schema (no dates, binary data, sets, ordered maps, pairs or merge keys) within MAX_IMPORT_LENGTH. */
export const loadImportYaml = (text: string): unknown => {
  if (text.length > MAX_IMPORT_LENGTH) throw new ImportTooLargeError();
  const parsed = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  if (exceedsSize(parsed, MAX_IMPORT_LENGTH)) throw new ImportTooLargeError();
  return parsed;
};
