import yaml from "js-yaml";
import { ProgressData } from "../types/types";

const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCodePoint(b);
  });
  return btoa(binary);
};

export const base64ToUtf8 = (encoded: string): string => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.codePointAt(i) ?? 0;
  return new TextDecoder().decode(bytes);
};

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
  const encodedData = utf8ToBase64(JSON.stringify(dataToEncode));
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams();
  hashParams.set("progress", encodedData);
  hashParams.set("assessmentName", utf8ToBase64(assessmentName));
  hashParams.set("assessorName", utf8ToBase64(assessorName));
  hashParams.set("useCaseDescription", utf8ToBase64(useCaseDescription));
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
