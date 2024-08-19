import yaml from "js-yaml";
import { AssessmentData, ConfigData } from "../types/types";

export const yamlParser = (yamlText: string): AssessmentData | ConfigData => {
  const data = yaml.load(yamlText);
  if (typeof data === "object" && data !== null && "modules" in data) {
    return data as AssessmentData;
  } else if (typeof data === "object" && data !== null && "email" in data) {
    return data as ConfigData;
  } else if (typeof data === "object" && data !== null && "overview" in data) {
    return data as ConfigData;
  } else {
    throw new Error("Invalid YAML format");
  }
};
