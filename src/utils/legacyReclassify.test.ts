import { reclassifyUntouchedLevelOne } from "./legacyReclassify";
import yaml from "js-yaml";
import type { AssessmentData } from "../types/types";

const SOURCE_YAML = `
schemaVersion: "1.0.0"
version: "1.0.0"
modules:
  - id: "G"
    name: "Governance"
    description: "x"
    categories:
      - id: "1"
        weight: 5
        name: "Strategy and Vision"
        description: "x"
        levels:
          - { number: 1, name: "1 - Initial", description: "Ad-hoc planning." }
          - { number: 2, name: "2 - Basic", description: "Some plan." }
          - { number: 3, name: "3 - Advanced", description: "Approved." }
          - { number: 4, name: "4 - Managed", description: "Measured." }
          - { number: 5, name: "5 - Optimized", description: "Optimizing." }
        requirements: []
      - id: "2"
        weight: 4
        name: "Compliance"
        description: "x"
        levels:
          - { number: 1, name: "1 - Initial", description: "No compliance program." }
          - { number: 2, name: "2 - Basic", description: "x" }
          - { number: 3, name: "3 - Advanced", description: "x" }
          - { number: 4, name: "4 - Managed", description: "x" }
          - { number: 5, name: "5 - Optimized", description: "x" }
        requirements: []
`;

const data = yaml.load(SOURCE_YAML) as AssessmentData;

describe("reclassifyUntouchedLevelOne", () => {
  it("resets entries with level=1 and unchanged level-1 description to level 0", () => {
    const progress = {
      "G.1": {
        level: 1,
        result: "1 - Initial",
        description: "Ad-hoc planning.",
        applicability: true,
      },
      "G.2": {
        level: 1,
        result: "1 - Initial",
        description:
          "We have an ad-hoc PKI deployment with some maturity work in progress.",
        applicability: true,
      },
    };
    const { reclassified, progress: out } = reclassifyUntouchedLevelOne(
      progress,
      data,
    );
    expect(out["G.1"].level).toBe(0);
    expect(out["G.1"].result).toBe("Not Assessed");
    expect(out["G.2"].level).toBe(1);
    expect(reclassified).toBe(1);
  });
});
