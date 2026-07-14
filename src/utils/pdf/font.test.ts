import RobotoRegular from "../../assets/fonts/Roboto-Regular.ttf";
import RobotoBold from "../../assets/fonts/Roboto-Bold.ttf";

describe("bundled fonts", () => {
  it("bundles a distinct real bold (not the regular under weight 700)", () => {
    expect(RobotoRegular.startsWith("data:font/ttf;base64,")).toBe(true);
    expect(RobotoBold.startsWith("data:font/ttf;base64,")).toBe(true);
    expect(RobotoBold).not.toEqual(RobotoRegular);
  });
});
