import yaml from "js-yaml";
import { AssessmentData } from "../types/types";

export const parseYAML = (yamlText: string): AssessmentData => {
  const data = yaml.load(yamlText);
  if (typeof data === "object" && data !== null && "modules" in data) {
    return data as AssessmentData;
  } else {
    throw new Error("Invalid YAML format");
  }
};
