import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
} from "pdf-lib";
import { BUNDLED_PQCMM_MODEL_YAML } from "../defaults/pqcmmBundledData";
import { bytesToBase64 } from "./encoding";
import { newPqcmmAssessment } from "./machine";
import { parsePqcmmModel } from "./model";
import { buildPqcmmPdfBlob } from "./pdf";

const embeddedNames = async (blob: Blob): Promise<string[]> => {
  const document = await PDFDocument.load(await blob.arrayBuffer());
  const names = document.catalog.lookup(PDFName.of("Names"), PDFDict);
  const embedded = names.lookup(PDFName.of("EmbeddedFiles"), PDFDict);
  const entries = embedded.lookup(PDFName.of("Names"), PDFArray);
  const result: string[] = [];
  for (let index = 0; index < entries.size(); index += 2) {
    const value = entries.lookup(index);
    if (value instanceof PDFString || value instanceof PDFHexString) {
      result.push(value.decodeText());
    }
  }
  return result;
};

describe("PQCMM PDF report", () => {
  it("embeds a machine-readable manifest and each evidence file", async () => {
    const model = parsePqcmmModel(BUNDLED_PQCMM_MODEL_YAML);
    const assessment = newPqcmmAssessment(model);
    assessment.productName = "Test product";
    assessment.evidenceFiles = [
      {
        id: "evidence-1",
        name: "screen.png",
        mediaType: "image/png",
        size: 3,
        sha256: "c".repeat(64),
        addedAt: "2026-08-14T12:00:00.000Z",
        dataBase64: bytesToBase64(new Uint8Array([1, 2, 3])),
      },
    ];
    const blob = await buildPqcmmPdfBlob(model, assessment);
    expect(blob.type).toBe("application/pdf");
    expect(await embeddedNames(blob)).toEqual(
      expect.arrayContaining([
        "pqcmm-assessment.json",
        "evidence-evidence-1-screen.png",
      ]),
    );
  }, 30_000);
});
