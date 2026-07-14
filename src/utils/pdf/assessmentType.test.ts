// AssessmentTypeHeader.tsx imports @react-pdf/renderer, which is published
// as ESM and cannot load under this project's node jest environment (only
// the dom project, via jsdom + the component test, exercises it). The pure
// mapping lives in ./assessmentType so it can be unit tested here without
// pulling in @react-pdf/renderer; AssessmentTypeHeader re-exports it.
import { mapAssessmentType } from "./assessmentType";

test("maps each assessment type to its confidence rung", () => {
  expect(mapAssessmentType("self")).toEqual({
    label: "Self-assessed",
    confidence: "Low",
  });
  expect(mapAssessmentType("formal")).toEqual({
    label: "Formal",
    confidence: "Medium",
  });
  expect(mapAssessmentType("third-party")).toEqual({
    label: "Third-party",
    confidence: "High",
  });
  expect(mapAssessmentType("")).toEqual({
    label: "Assessment type not specified",
    confidence: null,
  });
});
