import { yamlParser, validateSchema } from "./yamlParser";
import { AssessmentData, ExtensionData } from "../types/types";

describe("parseYAML", () => {
  it("should parse valid YAML into an AssessmentData object", () => {
    const validYAML = `modules:
  - id: "G"
    name: "Governance"
    description: Test Governance Description
    categories: []
 `;

    const expectedOutput: AssessmentData = {
      modules: [
        {
          name: "Governance",
          description: "Test Governance Description",
          id: "G",
          categories: [],
        },
      ],
    };

    expect(yamlParser(validYAML)).toEqual(expectedOutput);
  });

  it("should throw an error for invalid YAML format", () => {
    const invalidYAML = `
    invalidYaml
    `;

    expect(() => yamlParser(invalidYAML)).toThrow("Invalid YAML format");
  });

  it("should throw an error if YAML does not contain 'modules' key", () => {
    const yamlWithoutModules = `
    someOtherKey:
      - name: "Module 1"
        description: "Description of Module 1"
    `;

    expect(() => yamlParser(yamlWithoutModules)).toThrow("Invalid YAML format");
  });

  it("should throw an error if YAML is not an object", () => {
    const nonObjectYAML = `
    - just
    - a
    - list
    `;

    expect(() => yamlParser(nonObjectYAML)).toThrow("Invalid YAML format");
  });

  it("should handle empty YAML input", () => {
    const emptyYAML = ``;

    expect(() => yamlParser(emptyYAML)).toThrow("Invalid YAML format");
  });

  it("should handle YAML with null value", () => {
    const nullYAML = `null`;

    expect(() => yamlParser(nullYAML)).toThrow("Invalid YAML format");
  });

  it("should parse valid extension YAML with documentation", () => {
    const extensionYAML = `
extension:
  id: "test"
  name: "Test Extension"
  version: "1.0.0"
  description: "Test description"
  documentation: "https://example.com/docs"
relevance:
  modules: []
`;
    const result = yamlParser(extensionYAML) as ExtensionData;
    expect(result.extension.id).toBe("test");
    expect(result.extension.documentation).toBe("https://example.com/docs");
  });
});

const MODEL_2_0_0 = `
schemaVersion: "2.0.0"
version: "2.0.0"
modules:
  - id: "G"
    name: "Governance"
    description: "Gov"
    categories:
      - id: "strategy-and-vision"
        weight: 5
        name: "Strategy and vision"
        description: "Strategy."
        levels:
          - number: 1
            name: "Initial"
            description: "x"
          - number: 2
            name: "Foundational"
            description: "x"
          - number: 3
            name: "Advanced"
            description: "x"
          - number: 4
            name: "Managed"
            description: "x"
          - number: 5
            name: "Optimized"
            description: "x"
`;

const MODEL_2_0_0_BAD_ID = MODEL_2_0_0.replace(
  '"strategy-and-vision"',
  '"Strategy_And_Vision"',
);

const MODEL_2_0_0_LEGACY_LEVEL = MODEL_2_0_0.replace(
  '"Foundational"',
  '"2 - Basic"',
);

const REFERENCES_1_0_0 = `
schemaVersion: "1.0.0"
version: "1.0.0"
references:
  - id: "iso-27001"
    title: "ISO/IEC 27001"
    url: "https://www.iso.org/standard/27001"
    authority: "ISO"
    regions: ["GLOBAL"]
`;

const EXTENSION_1_0_0 = `
schemaVersion: "1.0.0"
extension:
  id: "test"
  name: "Test"
  version: "0.1.0"
  description: "Test extension"
  documentation: "https://example.com/docs"
  compatibility: ["2.0.0"]
relevance:
  modules: []
overlays:
  modules: []
`;

describe("validateSchema", () => {
  it("accepts a valid 2.0.0 model", () => {
    const data = yamlParser(MODEL_2_0_0);
    expect(() => validateSchema(data)).not.toThrow();
  });

  it("rejects a 2.0.0 model with a non-kebab-case category id", () => {
    const data = yamlParser(MODEL_2_0_0_BAD_ID);
    expect(() => validateSchema(data)).toThrow(/pattern/i);
  });

  it("rejects a 2.0.0 model still using the prefixed 1.0.0 form '2 - Basic'", () => {
    const data = yamlParser(MODEL_2_0_0_LEGACY_LEVEL);
    expect(() => validateSchema(data)).toThrow(/pattern|const/i);
  });

  it("rejects an unknown schemaVersion", () => {
    const bad = MODEL_2_0_0.replace(
      'schemaVersion: "2.0.0"',
      'schemaVersion: "99.0.0"',
    );
    expect(() => validateSchema(yamlParser(bad))).toThrow(
      /schemaVersion|unknown/i,
    );
  });

  it("accepts a valid references catalog", () => {
    const data = yamlParser(REFERENCES_1_0_0);
    expect(() => validateSchema(data)).not.toThrow();
  });

  it("accepts a valid extension YAML", () => {
    const data = yamlParser(EXTENSION_1_0_0);
    expect(() => validateSchema(data)).not.toThrow();
  });
});
