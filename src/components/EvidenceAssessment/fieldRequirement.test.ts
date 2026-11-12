import { fieldRequirementNote, groupFieldsByRule } from "./fieldRequirement";

describe("fieldRequirementNote", () => {
  const rules = [{ fields: ["docs", "notes"], message: "Give one." }];

  it("leaves required fields and rule members unmarked", () => {
    expect(
      fieldRequirementNote({ key: "version", required: true }, rules),
    ).toBe(undefined);
    expect(fieldRequirementNote({ key: "docs" }, rules)).toBe(undefined);
  });

  it("marks every other field as optional", () => {
    expect(fieldRequirementNote({ key: "comment" }, rules)).toBe("optional");
    expect(fieldRequirementNote({ key: "comment" }, undefined)).toBe(
      "optional",
    );
  });
});

describe("groupFieldsByRule", () => {
  it("gathers a rule's fields at the position of its first field", () => {
    const fields = [
      { key: "a" },
      { key: "docs" },
      { key: "b" },
      { key: "notes" },
    ];
    expect(
      groupFieldsByRule(fields, [
        { fields: ["docs", "notes"], message: "Give one." },
      ]),
    ).toEqual([
      { kind: "field", field: { key: "a" } },
      {
        kind: "rule",
        message: "Give one.",
        fields: [{ key: "docs" }, { key: "notes" }],
      },
      { kind: "field", field: { key: "b" } },
    ]);
  });

  it("keeps the order when there are no rules", () => {
    expect(groupFieldsByRule([{ key: "a" }, { key: "b" }], undefined)).toEqual([
      { kind: "field", field: { key: "a" } },
      { kind: "field", field: { key: "b" } },
    ]);
  });
});
