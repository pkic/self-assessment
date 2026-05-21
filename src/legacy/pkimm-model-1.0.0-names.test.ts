import { PKIMM_1_0_0_NAMES } from "./pkimm-model-1.0.0-names";

describe("PKIMM 1.0.0 bundled names", () => {
  it("contains the four governance categories", () => {
    expect(PKIMM_1_0_0_NAMES["G.1"]).toEqual({
      moduleId: "G",
      categoryName: "Strategy and Vision",
    });
    expect(PKIMM_1_0_0_NAMES["G.2"]?.categoryName).toBe(
      "Policies and documentation",
    );
    expect(PKIMM_1_0_0_NAMES["G.3"]?.categoryName).toBe("Compliance");
    expect(PKIMM_1_0_0_NAMES["G.4"]?.categoryName).toBe(
      "Processes and procedures",
    );
  });

  it("contains a known requirement", () => {
    expect(PKIMM_1_0_0_NAMES["G.1.1"]?.requirementName).toBe(
      "Organizational sponsor and support",
    );
  });

  it("preserves the 1.0.0 typo verbatim so name matching is honest", () => {
    // The released 1.0.0 YAML has 'he scope...' (missing leading T).
    // We preserve it so the migration engine reports the requirement as
    // unmappedFromSource rather than silently matching the wrong thing.
    expect(PKIMM_1_0_0_NAMES["G.2.1"]?.requirementName).toBe(
      "he scope of policies is defined and documented",
    );
  });
});
