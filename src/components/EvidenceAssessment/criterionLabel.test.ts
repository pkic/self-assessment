import { criterionLabel } from "./criterionLabel";

describe("criterionLabel", () => {
  it("shows a dotted criterion id by its position within the level", () => {
    expect(criterionLabel("1.1.2")).toBe("2");
    expect(criterionLabel("0.1.10")).toBe("10");
  });

  it("leaves ids without a position unchanged", () => {
    expect(criterionLabel("GOV-3")).toBe("GOV-3");
  });
});
