import yaml from "js-yaml";
import {
  ImportTooLargeError,
  MAX_FULL_PARAM_DECODED_LENGTH,
  MAX_FULL_PARAM_LENGTH,
  MAX_IMPORT_LENGTH,
  MAX_NESTING_DEPTH,
  MAX_REPORT_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  REPORT_LINE_BREAK_WEIGHT,
  REPORT_LIST_ITEM_WEIGHT,
  ReportTooLargeError,
  exceedsReportLimit,
  exceedsSize,
  limitTextLength,
  loadImportYaml,
  readImportFile,
} from "./inputLimits";

describe("limitTextLength", () => {
  it("keeps strings up to the limit and cuts longer ones with a marker", () => {
    expect(limitTextLength("a".repeat(MAX_TEXT_LENGTH))).toBe(
      "a".repeat(MAX_TEXT_LENGTH),
    );
    expect(limitTextLength("a".repeat(MAX_TEXT_LENGTH + 1))).toBe(
      `${"a".repeat(MAX_TEXT_LENGTH)}...`,
    );
  });
  it("cuts strings inside nested arrays and plain objects without changing the input", () => {
    const input = {
      a: [{ b: "x".repeat(MAX_TEXT_LENGTH + 5) }],
      n: 3,
      u: undefined,
    };
    const out = limitTextLength(input);
    expect(out.a[0].b).toHaveLength(MAX_TEXT_LENGTH + 3);
    expect(out).toEqual({
      a: [{ b: `${"x".repeat(MAX_TEXT_LENGTH)}...` }],
      n: 3,
      u: undefined,
    });
    expect(input.a[0].b).toHaveLength(MAX_TEXT_LENGTH + 5);
  });
  it("returns other objects as they are", () => {
    const set = new Set(["x"]);
    const date = new Date(0);
    class Box {
      s = "x".repeat(MAX_TEXT_LENGTH + 1);
    }
    const box = new Box();
    const out = limitTextLength({ set, date, box });
    expect(out.set).toBe(set);
    expect(out.date).toBe(date);
    expect(out.box).toBe(box);
  });
  it("returns null, numbers and booleans as they are", () => {
    expect(limitTextLength({ v: [null, 0, false] })).toEqual({
      v: [null, 0, false],
    });
  });
  it("copies an object reached more than once only once", () => {
    let node: unknown = "x".repeat(MAX_TEXT_LENGTH + 1);
    for (let i = 0; i < 40; i++) node = [node, node]; // 2^40 paths; finishes instantly only if copies are shared
    const out = limitTextLength(node) as unknown[];
    expect(out[0]).toBe(out[1]);
  });
  it("copies a structure that refers to itself", () => {
    const list: unknown[] = [];
    list.push(list, "x".repeat(MAX_TEXT_LENGTH + 1));
    const out = limitTextLength(list);
    expect(out[0]).toBe(out);
    expect(out[1]).toHaveLength(MAX_TEXT_LENGTH + 3);
  });
  it("keeps an own __proto__ key as data and leaves the prototype alone", () => {
    const input = JSON.parse('{"__proto__": {"polluted": true}, "s": "x"}');
    const out = limitTextLength(input);
    expect(Object.prototype.hasOwnProperty.call(out, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect((out as { polluted?: boolean }).polluted).toBeUndefined();
  });
  it("keeps an object without a prototype that way", () => {
    const input = Object.assign(Object.create(null), {
      s: "x".repeat(MAX_TEXT_LENGTH + 1),
    });
    const out = limitTextLength(input);
    expect(Object.getPrototypeOf(out)).toBeNull();
    expect(out.s).toHaveLength(MAX_TEXT_LENGTH + 3);
  });
});

describe("exceedsSize", () => {
  it("counts string lengths, each array's or object's width, and object keys", () => {
    expect(exceedsSize("abc", 3)).toBe(false);
    expect(exceedsSize("abcd", 3)).toBe(true);
    expect(exceedsSize({ ab: "cd" }, 5)).toBe(false); // 1 + 2 + 2
    expect(exceedsSize({ ab: "cd" }, 4)).toBe(true);
    expect(exceedsSize({ ab: "cd", e: "f" }, 8)).toBe(false); // 2 + (2 + 2) + (1 + 1)
    expect(exceedsSize({ ab: "cd", e: "f" }, 7)).toBe(true);
  });
  it("counts an empty array or object as one", () => {
    expect(exceedsSize([], 1)).toBe(false);
    expect(exceedsSize([], 0)).toBe(true);
    expect(exceedsSize({}, 1)).toBe(false);
    expect(exceedsSize({}, 0)).toBe(true);
  });
  it("counts null, numbers and booleans as one each", () => {
    expect(exceedsSize([null, 0, false], 6)).toBe(false); // 3 + 1 + 1 + 1
    expect(exceedsSize([null, 0, false], 5)).toBe(true);
  });
  it("counts an empty string as one", () => {
    expect(exceedsSize(["", "", ""], 6)).toBe(false); // 3 + 1 + 1 + 1
    expect(exceedsSize(["", "", ""], 5)).toBe(true);
  });
  it("counts a shared part each time it is reached", () => {
    const s = "x".repeat(10);
    expect(exceedsSize([s, s], 22)).toBe(false); // 2 + 10 + 10
    expect(exceedsSize([s, s], 21)).toBe(true);
    const shared = { ab: "cd", e: "f" }; // 8, width included
    expect(exceedsSize([shared, shared], 18)).toBe(false); // 2 + 8 + 8
    expect(exceedsSize([shared, shared], 17)).toBe(true);
  });
  it("adds a container's width before reading any of its values", () => {
    const list = ["x", "y"];
    Object.defineProperty(list, 0, {
      get() {
        throw new Error("read a value before adding the width");
      },
    });
    expect(exceedsSize(list, 1)).toBe(true); // the width 2 already passes 1
    const object = { b: "y" };
    Object.defineProperty(object, "a", {
      enumerable: true,
      get() {
        throw new Error("read a value before adding the width");
      },
    });
    expect(exceedsSize(object, 1)).toBe(true);
  });
  it("stops early on a structure that expands far beyond the limit", () => {
    let node: unknown = "x".repeat(1_000);
    for (let i = 0; i < 40; i++) node = [node, node];
    expect(exceedsSize(node, MAX_IMPORT_LENGTH)).toBe(true);
  });
  it("decides a very long flat array without walking all of it", () => {
    const list = new Array(5_000_000).fill("x".repeat(10_000));
    Object.defineProperty(list, list.length - 1, {
      get() {
        throw new Error("walked too far");
      },
    });
    expect(exceedsSize(list, MAX_IMPORT_LENGTH)).toBe(true);
  });
  it("walks depth first, finishing each value before reading the next", () => {
    const list: unknown[] = [];
    list.push(list); // index 0 never finishes: it reaches the depth limit first
    Object.defineProperty(list, 1, {
      get() {
        throw new Error("read a later value too early");
      },
    });
    expect(exceedsSize(list, MAX_IMPORT_LENGTH)).toBe(true);
  });
  it("rejects nesting deeper than MAX_NESTING_DEPTH without overflowing the stack", () => {
    const nest = (levels: number) => {
      let v: unknown = "leaf";
      for (let i = 0; i < levels; i++) v = [v];
      return v;
    };
    expect(exceedsSize(nest(MAX_NESTING_DEPTH), MAX_IMPORT_LENGTH)).toBe(false);
    expect(exceedsSize(nest(MAX_NESTING_DEPTH + 1), MAX_IMPORT_LENGTH)).toBe(
      true,
    );
    expect(exceedsSize(nest(1_000_000), MAX_IMPORT_LENGTH)).toBe(true);
  });
  it("treats non-plain objects as a single unit", () => {
    expect(exceedsSize({ s: new Set(["x".repeat(100)]) }, 3)).toBe(false); // 1 + 1 + 1
  });
  it("stops on a structure that refers to itself", () => {
    const list: unknown[] = [];
    list.push(list);
    expect(exceedsSize(list, MAX_IMPORT_LENGTH)).toBe(true);
  });
  it("counts an own __proto__ key", () => {
    const input = JSON.parse('{"__proto__": "xyz"}'); // 1 + 9 + 3
    expect(exceedsSize(input, 13)).toBe(false);
    expect(exceedsSize(input, 12)).toBe(true);
  });
  it("counts a line break as one character unless a weight is given", () => {
    expect(exceedsSize("a\nb", 3)).toBe(false);
    expect(exceedsSize("a\nb", 2)).toBe(true);
    expect(exceedsSize("a\nb", 3, 0)).toBe(false);
    expect(exceedsSize("a\nb", 2, 0)).toBe(true);
  });
  it("adds the weight for each line break, exactly at the limit", () => {
    expect(exceedsSize("a\nb", 53, 50)).toBe(false); // 3 + 1 x 50
    expect(exceedsSize("a\nb", 52, 50)).toBe(true);
    expect(exceedsSize("\n\n\n", 153, 50)).toBe(false); // 3 + 3 x 50
    expect(exceedsSize("\n\n\n", 152, 50)).toBe(true);
    expect(exceedsSize("\n".repeat(10_000), 510_000, 50)).toBe(false); // 10,000 + 10,000 x 50
    expect(exceedsSize("\n".repeat(10_000), 509_999, 50)).toBe(true);
  });
  it("leaves a string without line breaks at its length whatever the weight", () => {
    expect(exceedsSize("abc", 3, 50)).toBe(false);
    expect(exceedsSize("abc", 2, 50)).toBe(true);
  });
  it("adds the weight for line breaks in nested values, not in keys", () => {
    expect(exceedsSize({ ab: "c\nd" }, 16, 10)).toBe(false); // 1 + 2 + (3 + 1 x 10)
    expect(exceedsSize({ ab: "c\nd" }, 15, 10)).toBe(true);
    expect(exceedsSize({ "a\nb": "cd" }, 6, 10)).toBe(false); // 1 + 3 + 2
    expect(exceedsSize({ "a\nb": "cd" }, 5, 10)).toBe(true);
    expect(exceedsSize(["a\nb", "c\nd"], 28, 10)).toBe(false); // 2 + (3 + 10) + (3 + 10)
    expect(exceedsSize(["a\nb", "c\nd"], 27, 10)).toBe(true);
  });
  it("counts an empty string as one with a weight", () => {
    expect(exceedsSize(["", ""], 4, 50)).toBe(false); // 2 + 1 + 1
    expect(exceedsSize(["", ""], 3, 50)).toBe(true);
    expect(exceedsSize(["", ""], 404, 0, 200)).toBe(false); // 2 + 2 x 200 + 1 + 1
    expect(exceedsSize(["", ""], 403, 0, 200)).toBe(true);
  });
  it("adds the list item weight for each array element, not for object values", () => {
    expect(exceedsSize(["a", "b"], 404, 0, 200)).toBe(false); // 2 + 2 x 200 + 1 + 1
    expect(exceedsSize(["a", "b"], 403, 0, 200)).toBe(true);
    expect(exceedsSize([["a"]], 403, 0, 200)).toBe(false); // (1 + 200) + (1 + 200) + 1
    expect(exceedsSize([["a"]], 402, 0, 200)).toBe(true);
    expect(exceedsSize([], 1, 0, 200)).toBe(false);
    expect(exceedsSize([], 0, 0, 200)).toBe(true);
    expect(exceedsSize({ a: "x", b: "y" }, 6, 0, 200)).toBe(false); // 2 + (1 + 1) + (1 + 1)
    expect(exceedsSize({ a: "x", b: "y" }, 5, 0, 200)).toBe(true);
  });
  it("keeps the line break and list item weights apart", () => {
    expect(exceedsSize(["a", "b"], 4, 50)).toBe(false); // 2 + 1 + 1: no list item weight
    expect(exceedsSize(["a", "b"], 3, 50)).toBe(true);
    expect(exceedsSize("a\nb", 3, 0, 200)).toBe(false); // 3: no line break weight
    expect(exceedsSize("a\nb", 2, 0, 200)).toBe(true);
    expect(exceedsSize(["a\nb"], 254, 50, 200)).toBe(false); // (1 + 200) + (3 + 50)
    expect(exceedsSize(["a\nb"], 253, 50, 200)).toBe(true);
  });
  it("ignores a weight that is not above 0", () => {
    expect(exceedsSize("a\nb", 2, -5)).toBe(true); // still 3 characters
    expect(exceedsSize("a\nb", 3, -5)).toBe(false);
    expect(exceedsSize("a\nb", 2, NaN)).toBe(true);
    expect(exceedsSize("a\nb", 3, NaN)).toBe(false);
    expect(exceedsSize(["a", "b"], 3, 0, -5)).toBe(true); // still 2 + 1 + 1
    expect(exceedsSize(["a", "b"], 4, 0, -5)).toBe(false);
    expect(exceedsSize(["a", "b"], 3, 0, NaN)).toBe(true);
    expect(exceedsSize(["a", "b"], 4, 0, NaN)).toBe(false);
  });
});

describe("exceedsReportLimit", () => {
  it("counts against MAX_REPORT_TEXT_LENGTH with both report weights", () => {
    expect(exceedsReportLimit("x".repeat(MAX_REPORT_TEXT_LENGTH))).toBe(false);
    expect(exceedsReportLimit("x".repeat(MAX_REPORT_TEXT_LENGTH + 1))).toBe(
      true,
    );
    // Each "\n" counts itself plus REPORT_LINE_BREAK_WEIGHT.
    const breaks = Math.floor(
      MAX_REPORT_TEXT_LENGTH / (1 + REPORT_LINE_BREAK_WEIGHT),
    ); // 19,607
    expect(exceedsReportLimit("\n".repeat(breaks))).toBe(false);
    expect(exceedsReportLimit("\n".repeat(breaks + 1))).toBe(true);
    // Each "" item counts 1 of the list's width, REPORT_LIST_ITEM_WEIGHT and 1 itself.
    const items = Math.floor(
      MAX_REPORT_TEXT_LENGTH / (2 + REPORT_LIST_ITEM_WEIGHT),
    ); // 4,950
    expect(exceedsReportLimit(new Array(items).fill(""))).toBe(false);
    expect(exceedsReportLimit(new Array(items + 1).fill(""))).toBe(true);
  });
});

describe("loadImportYaml", () => {
  it("refuses text over MAX_IMPORT_LENGTH before parsing it", () => {
    // Not valid YAML: parsing it would throw a YAML error instead.
    expect(() => loadImportYaml("[".repeat(MAX_IMPORT_LENGTH + 1))).toThrow(
      ImportTooLargeError,
    );
  });
  it("refuses a small file whose aliases expand past MAX_IMPORT_LENGTH", () => {
    const lines = [`l0: &l0 "${"x".repeat(1_000)}"`];
    for (let i = 1; i <= 20; i++) {
      lines.push(`l${i}: &l${i} [*l${i - 1}, *l${i - 1}]`);
    }
    expect(() => loadImportYaml(lines.join("\n"))).toThrow(ImportTooLargeError);
  });
  it("refuses a small file whose aliases repeat many empty strings", () => {
    const items = (item: string) => new Array(20_000).fill(item).join(",");
    const text = `a: &a [${items('""')}]\nb: [${items("*a")}]`;
    expect(() => loadImportYaml(text)).toThrow(ImportTooLargeError);
  });
  // `levels` short lines, each wrapping the one before it through an alias.
  const aliasChain = (levels: number): string => {
    const lines = ["l0: &l0 [x]"];
    for (let i = 1; i <= levels; i++) lines.push(`l${i}: &l${i} [*l${i - 1}]`);
    return lines.join("\n");
  };
  it("refuses a small file whose aliases nest past MAX_NESTING_DEPTH", () => {
    expect(() => loadImportYaml(aliasChain(MAX_NESTING_DEPTH + 50))).toThrow(
      ImportTooLargeError,
    );
  });
  it("accepts aliases that nest within MAX_NESTING_DEPTH", () => {
    expect(() =>
      loadImportYaml(aliasChain(MAX_NESTING_DEPTH - 50)),
    ).not.toThrow();
  });
  // `count` empty keys of a block mapping indented by `indent`.
  const emptyKeys = (indent: string, count: number): string[] =>
    Array.from({ length: count }, (_, i) => `${indent}k${i.toString(36)}:`);
  it("refuses a small file whose wide mapping refers to itself", () => {
    const text = ["r: &a", "  x: *a", ...emptyKeys("  ", 300_000)].join("\n");
    expect(text.length).toBeLessThan(MAX_IMPORT_LENGTH);
    expect(() => loadImportYaml(text)).toThrow(ImportTooLargeError);
  });
  it("refuses a small file whose wide mapping is reached again through a cycle", () => {
    // c0 > c1 > c2 > c3 > c4, where c4 holds a key back to c0 and 300,000 empty keys.
    const text = [
      "c0: &c0",
      " c1:",
      "  c2:",
      "   c3:",
      "    c4:",
      "     back: *c0",
      ...emptyKeys("     ", 300_000),
    ].join("\n");
    expect(text.length).toBeLessThan(MAX_IMPORT_LENGTH);
    expect(() => loadImportYaml(text)).toThrow(ImportTooLargeError);
  });
  it("leaves deeply nested written YAML to the YAML parser's own error", () => {
    const levels = MAX_NESTING_DEPTH + 50;
    const text = `${"[".repeat(levels)}x${"]".repeat(levels)}`;
    expect(() => loadImportYaml(text)).toThrow(yaml.YAMLException);
    expect(() => loadImportYaml(text)).not.toThrow(ImportTooLargeError);
  });
  it("reads only the JSON schema's types", () => {
    expect(loadImportYaml("d: 2026-10-18")).toEqual({ d: "2026-10-18" }); // a string, not a Date
    expect(loadImportYaml("b: &b {x: 1}\nc:\n  <<: *b")).toEqual({
      b: { x: 1 },
      c: { "<<": { x: 1 } },
    }); // no merge
    for (const tagged of [
      "v: !!binary SGVsbG8=",
      "v: !!omap [{a: 1}]",
      "v: !!pairs [{a: 1}]",
      "v: !!set {a}",
    ]) {
      expect(() => loadImportYaml(tagged)).toThrow();
      expect(() => loadImportYaml(tagged)).not.toThrow(ImportTooLargeError);
    }
  });
  it("accepts anchors and aliases within the limit", () => {
    expect(loadImportYaml("a: &k [x]\nb: *k")).toEqual({ a: ["x"], b: ["x"] });
  });
});

describe("readImportFile", () => {
  it("refuses a file over MAX_IMPORT_LENGTH bytes without reading it", async () => {
    const file = new Blob([new Uint8Array(MAX_IMPORT_LENGTH + 1)]);
    const text = jest.spyOn(file, "text");
    await expect(readImportFile(file)).rejects.toBeInstanceOf(
      ImportTooLargeError,
    );
    expect(text).not.toHaveBeenCalled();
  });
  it("reads a file of up to MAX_IMPORT_LENGTH bytes as text", async () => {
    await expect(readImportFile(new Blob(["name: x"]))).resolves.toBe(
      "name: x",
    );
    const atLimit = new Blob([new Uint8Array(MAX_IMPORT_LENGTH)]);
    const text = jest.spyOn(atLimit, "text").mockResolvedValue("read");
    await expect(readImportFile(atLimit)).resolves.toBe("read");
    expect(text).toHaveBeenCalledTimes(1);
  });
});

describe("limits and errors", () => {
  it("uses the agreed values", () => {
    expect(MAX_TEXT_LENGTH).toBe(10_000);
    expect(MAX_REPORT_TEXT_LENGTH).toBe(1_000_000);
    expect(REPORT_LINE_BREAK_WEIGHT).toBe(50);
    expect(REPORT_LIST_ITEM_WEIGHT).toBe(200);
    expect(MAX_IMPORT_LENGTH).toBe(10 * 1024 * 1024);
    expect(MAX_FULL_PARAM_LENGTH).toBe(16_384);
    expect(MAX_FULL_PARAM_DECODED_LENGTH).toBe(256 * 1024);
    expect(MAX_NESTING_DEPTH).toBe(100);
  });
  it("names its errors and gives them fixed messages", () => {
    const importError = new ImportTooLargeError();
    expect(importError).toBeInstanceOf(Error);
    expect(importError.name).toBe("ImportTooLargeError");
    expect(importError.message).toBe(
      "This file is too large to import. The limit is 10 MB.",
    );
    const reportError = new ReportTooLargeError();
    expect(reportError).toBeInstanceOf(Error);
    expect(reportError.name).toBe("ReportTooLargeError");
    expect(reportError.message).toBe(
      "This assessment has too much text for a PDF report. Shorten some notes or evidence and try again.",
    );
  });
});
