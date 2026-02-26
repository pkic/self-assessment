import yaml from "js-yaml";
import { ProgressData } from "../types/types";

export const generateURL = (
  progress: Record<string, ProgressData>,
  assessmentName: string,
  assessorName: string,
  useCaseDescription: string,
  enabledExtensions: string[] = [],
): string => {
  const dataToEncode = {
    progress,
    enabledExtensions,
  };
  const encodedData = btoa(JSON.stringify(dataToEncode));
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams();
  hashParams.set("progress", encodedData);
  hashParams.set("assessmentName", btoa(assessmentName));
  hashParams.set("assessorName", btoa(assessorName));
  hashParams.set("useCaseDescription", btoa(useCaseDescription));
  url.hash = hashParams.toString();
  return url.toString();
};

export const exportToYAML = (
  progress: Record<string, ProgressData>,
  assessmentName: string,
  assessorName: string,
  useCaseDescription: string,
  enabledExtensions: string[] = [],
) => {
  // Create a comprehensive object with all the variables
  const exportData = {
    progress,
    assessmentName,
    assessorName,
    useCaseDescription,
    enabledExtensions,
  };

  // Convert the object to a YAML string
  const yamlStr = yaml.dump(exportData);

  // Create a Blob from the YAML string
  const blob = new Blob([yamlStr], { type: "text/yaml" });

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create an anchor element and initiate the download
  const a = document.createElement("a");
  a.href = url;
  a.download = "progress.yaml";
  a.click();

  // Revoke the object URL to free up memory
  URL.revokeObjectURL(url);
};
