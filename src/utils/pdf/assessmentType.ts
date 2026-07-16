// Pure assessment-type → confidence mapping, kept dependency-free (no
// @react-pdf/renderer import) so it can be unit tested from the node jest
// project. AssessmentTypeHeader.tsx (the @react-pdf component) imports this
// module rather than duplicating the mapping.
export type AssessmentType = "" | "self" | "formal" | "third-party";

export type AssessmentConfidence = "Low" | "Medium" | "High" | null;

export interface AssessmentTypeInfo {
  label: string;
  confidence: AssessmentConfidence;
}

export const mapAssessmentType = (t: AssessmentType): AssessmentTypeInfo => {
  switch (t) {
    case "self":
      return { label: "Self-assessed", confidence: "Low" };
    case "formal":
      return { label: "Formal", confidence: "Medium" };
    case "third-party":
      return { label: "Third-party", confidence: "High" };
    default:
      return { label: "Assessment type not specified", confidence: null };
  }
};
