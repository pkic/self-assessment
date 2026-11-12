import { fieldRequirementNote } from "./fieldRequirement";

describe("fieldRequirementNote", () => {
  const rules = [{ fields: ["docs", "notes"], message: "Give one." }];

  it("leaves required fields unmarked", () => {
    expect(
      fieldRequirementNote({ key: "version", required: true }, rules),
    ).toBe(undefined);
  });

  it("marks fields covered by an at-least-one rule", () => {
    expect(fieldRequirementNote({ key: "docs" }, rules)).toBe(
      "one of these is required",
    );
  });

  it("marks every other field as optional", () => {
    expect(fieldRequirementNote({ key: "comment" }, rules)).toBe("optional");
    expect(fieldRequirementNote({ key: "comment" }, undefined)).toBe(
      "optional",
    );
  });
});
