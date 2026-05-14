import { yamlParser } from "./yamlParser";
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
