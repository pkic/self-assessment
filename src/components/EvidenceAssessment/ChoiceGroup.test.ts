import { choiceLayout, choiceTone } from "./ChoiceGroup";

describe("ChoiceGroup", () => {
  it("uses segments for short labels and a list for long ones", () => {
    expect(
      choiceLayout([
        { value: "met", label: "Met" },
        { value: "not-met", label: "Not met" },
      ]),
    ).toBe("segments");
    expect(
      choiceLayout([
        { value: "supports", label: "Supports the assessment conclusion" },
        { value: "not-assessed", label: "Not assessed" },
      ]),
    ).toBe("list");
  });

  it("colours passing, partial and negative outcomes", () => {
    expect(choiceTone("supports", ["supports"])).toBe("ok");
    expect(choiceTone("partially-supports")).toBe("warn");
    expect(choiceTone("does-not-support")).toBe("danger");
    expect(choiceTone("not-met")).toBe("danger");
    expect(choiceTone("not-assessed")).toBe("neutral");
    expect(choiceTone("not-applicable")).toBe("neutral");
  });
});
