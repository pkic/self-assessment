import { BUNDLED_PQCMM_MODEL_YAML } from "../defaults/pqcmmBundledData";
import { bytesToBase64 } from "./encoding";
import {
  buildPqcmmMachineAssessment,
  newPqcmmAssessment,
  parsePqcmmMachineAssessment,
} from "./machine";
import { parsePqcmmModel } from "./model";

const model = parsePqcmmModel(BUNDLED_PQCMM_MODEL_YAML);

describe("PQCMM machine-readable assessments", () => {
  it("omits evidence bytes from the PDF manifest but retains attachment metadata", () => {
    const assessment = newPqcmmAssessment(model);
    assessment.evidenceFiles = [
      {
        id: "evidence-1",
        name: "screenshot.png",
        mediaType: "image/png",
        size: 3,
        sha256: "a".repeat(64),
        addedAt: "2026-08-14T12:00:00.000Z",
        dataBase64: bytesToBase64(new Uint8Array([1, 2, 3])),
      },
    ];
    const manifest = buildPqcmmMachineAssessment(model, assessment, false);
    expect(manifest.attachments[0]).toMatchObject({
      id: "evidence-1",
      fileName: "screenshot.png",
      size: 3,
      sha256: "a".repeat(64),
    });
    expect(manifest.attachments[0]).not.toHaveProperty("dataBase64");
  });

  it("round-trips the portable JSON export including evidence bytes", async () => {
    const assessment = newPqcmmAssessment(model);
    assessment.productName = "Quantum service";
    assessment.criterionProgress["1.1.1"] = {
      status: "met",
      evidenceStatement: "Release notes, page 3",
      notes: "",
      evidenceIds: ["evidence-1"],
    };
    assessment.evidenceFiles = [
      {
        id: "evidence-1",
        name: "release-notes.pdf",
        mediaType: "application/pdf",
        size: 4,
        sha256:
          "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
        addedAt: "2026-08-14T12:00:00.000Z",
        dataBase64: bytesToBase64(new Uint8Array([1, 2, 3, 4])),
      },
    ];
    const exported = buildPqcmmMachineAssessment(model, assessment, true);
    const restored = await parsePqcmmMachineAssessment(
      JSON.stringify(exported),
      model,
    );
    expect(restored.productName).toBe("Quantum service");
    expect(restored.criterionProgress["1.1.1"]).toEqual(
      assessment.criterionProgress["1.1.1"],
    );
    expect(restored.evidenceFiles).toEqual(assessment.evidenceFiles);
  });

  it("rejects evidence whose content does not match its SHA-256 digest", async () => {
    const assessment = newPqcmmAssessment(model);
    assessment.evidenceFiles = [
      {
        id: "evidence-1",
        name: "evidence.txt",
        mediaType: "text/plain",
        size: 3,
        sha256: "0".repeat(64),
        addedAt: "2026-08-14T12:00:00.000Z",
        dataBase64: bytesToBase64(new Uint8Array([1, 2, 3])),
      },
    ];
    const exported = buildPqcmmMachineAssessment(model, assessment, true);

    await expect(
      parsePqcmmMachineAssessment(JSON.stringify(exported), model),
    ).rejects.toThrow("Evidence file digest mismatch: evidence.txt");
  });
});
