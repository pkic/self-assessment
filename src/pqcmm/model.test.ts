import { BUNDLED_PQCMM_MODEL_YAML } from "../defaults/pqcmmBundledData";
import { parsePqcmmModel } from "./model";

describe("PQCMM model data", () => {
  it("loads the approved 1.0.1 model with stable criteria and question ids", () => {
    const model = parsePqcmmModel(BUNDLED_PQCMM_MODEL_YAML);
    expect(model.model).toMatchObject({
      id: "pqcmm",
      version: "1.0.1",
      scope: "product-or-service",
    });
    expect(model.levels.map((level) => level.number)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(
      model.levels.reduce(
        (total, level) => total + level.criteria.items.length,
        0,
      ),
    ).toBe(22);
    expect(
      model.levels.reduce(
        (total, level) =>
          total +
          level.assessment.groups.reduce(
            (groupTotal, group) => groupTotal + group.questions.length,
            0,
          ),
        0,
      ),
    ).toBe(72);
    expect(
      model.levels
        .flatMap((level) => level.assessment.groups)
        .flatMap((group) => group.questions)
        .map((question) => question.id),
    ).toEqual(expect.arrayContaining(["0.2.1", "1.2.1", "5.5.4"]));
  });

  it("rejects a model that changes the cumulative scoring method", () => {
    expect(() =>
      parsePqcmmModel(
        BUNDLED_PQCMM_MODEL_YAML.replace(
          "method: cumulative-all-criteria",
          "method: weighted-average",
        ),
      ),
    ).toThrow(/schema validation failed/i);
  });
});
