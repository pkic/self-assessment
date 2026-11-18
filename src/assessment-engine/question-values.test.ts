import {
  MAX_CUSTOM_ENTRY_LENGTH,
  validCustomEntry,
  validQuestionFieldValue,
} from "./question-values";

describe("multiselect values", () => {
  const options = [{ value: "ML-KEM-768" }, { value: "ML-DSA-65" }];

  it("accepts only listed options unless custom entries are allowed", () => {
    const listed = { type: "multiselect", options };
    expect(validQuestionFieldValue(listed, ["ML-KEM-768"])).toBe(true);
    expect(validQuestionFieldValue(listed, ["HQC-128"])).toBe(false);
    expect(validQuestionFieldValue(listed, "ML-KEM-768")).toBe(false);

    const open = { ...listed, allowCustom: true };
    expect(validQuestionFieldValue(open, ["ML-KEM-768", "HQC-128"])).toBe(true);
  });

  it("rejects custom entries that are blank, padded, too long or multi-line", () => {
    expect(validCustomEntry("")).toBe(false);
    expect(validCustomEntry(" HQC")).toBe(false);
    expect(validCustomEntry("a\nb")).toBe(false);
    expect(validCustomEntry("x".repeat(MAX_CUSTOM_ENTRY_LENGTH + 1))).toBe(
      false,
    );
    expect(validCustomEntry("FN-DSA-512")).toBe(true);
  });
});
