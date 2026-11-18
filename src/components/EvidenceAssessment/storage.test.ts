import { migrateStoredEvidenceRecord } from "./storage";
import type { EvidenceAssessmentRecord } from "./types";

describe("evidence assessment state migration", () => {
  it("moves legacy free-text question answers into named values", () => {
    const legacy = {
      stateSchemaVersion: 2,
      id: "assessment-1",
      name: "Legacy assessment",
      modelId: "pqcmm",
      dataVersion: "1.0.1",
      subject: { productName: "Example" },
      assuranceProfileId: "self",
      criterionProgress: {},
      questionProgress: {
        "0.2.1": { answer: "2027-06-30", evidenceIds: [] },
      },
      evidenceFiles: [],
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    } as unknown as EvidenceAssessmentRecord;

    expect(migrateStoredEvidenceRecord(legacy)).toMatchObject({
      stateSchemaVersion: 3,
      questionProgress: {
        "0.2.1": {
          finding: "not-assessed",
          values: { response: "2027-06-30" },
          evidenceIds: [],
        },
      },
    });
  });
});
