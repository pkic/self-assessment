import { readFileSync } from "fs";
import { join } from "path";

const css = readFileSync(join(__dirname, "index.module.scss"), "utf8");

describe("design tokens", () => {
  it("declares the full spacing scale", () => {
    for (const step of ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl"]) {
      expect(css).toContain(`--pkimm-space-${step}:`);
    }
  });
});
