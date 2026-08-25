import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
} from "pdf-lib";
import { writeFile } from "node:fs/promises";
import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import { getBundledAssessmentProfileYaml } from "../../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "../../assessment-engine/profile";
import { bytesToBase64 } from "./encoding";
import { newEvidenceAssessment } from "./machine";
import { parseEvidenceModel } from "./model";
import { buildEvidenceAssessmentPdfBlob } from "./pdf";
import { namedDestinationPageIndex } from "./pdfSignatureField";
import { buildExampleAssessment } from "./exampleAssessment";
import { completePqcmmSubject } from "./testFixtures";

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
    const model = parseEvidenceModel(getBundledAssessmentModelYaml("pqcmm")!);
    const profile = parseAssessmentProfile(
      getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
    );
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    assessment.subject.productName = "Test product";
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
    const blob = await buildEvidenceAssessmentPdfBlob(
      model,
      profile,
      assessment,
    );
    expect(blob.type).toBe("application/pdf");
    expect(await embeddedNames(blob)).toEqual(
      expect.arrayContaining([
        "pqcmm-assessment-package.json",
        "evidence-evidence-1-screen.png",
      ]),
    );
    const document = await PDFDocument.load(await blob.arrayBuffer());
    for (const field of profile.report.signing!.fields) {
      expect(document.getForm().getSignature(field.name)).toBeDefined();
    }
    const approvalPage = namedDestinationPageIndex(
      document,
      "pkic-executive-approval",
    );
    expect(approvalPage).toBeGreaterThanOrEqual(0);
    expect(document.getPages()[approvalPage!].node.Annots()?.size()).toBe(
      profile.report.signing!.fields.length,
    );

    const exampleOutput = process.env.PKIC_EXAMPLE_REPORT_OUTPUT;
    if (exampleOutput) {
      const example = await buildExampleAssessment(model, profile);
      const exampleBlob = await buildEvidenceAssessmentPdfBlob(
        model,
        profile,
        example,
      );
      await writeFile(
        exampleOutput,
        new Uint8Array(await exampleBlob.arrayBuffer()),
      );
    }
  }, 30_000);
});
