import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import { getBundledAssessmentProfileYaml } from "../../defaults/assessmentProfiles";
import { parseAssessmentProfile } from "../../assessment-engine/profile";
import { bytesToBase64 } from "./encoding";
import {
  buildAssessmentPackage,
  embeddedEvidenceName,
  newEvidenceAssessment,
  parseAssessmentPackage,
} from "./machine";
import { parseEvidenceModel } from "./model";
import { completePqcmmSubject } from "./testFixtures";

const model = parseEvidenceModel(getBundledAssessmentModelYaml("pqcmm")!);
const profile = parseAssessmentProfile(
  getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
);

describe("PQCMM machine-readable assessments", () => {
  it("omits evidence bytes from the PDF manifest but retains attachment metadata", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
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
    const assessmentPackage = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      false,
    );
    expect(assessmentPackage.attachments[0]).toMatchObject({
      id: "evidence-1",
      fileName: "screenshot.png",
      size: 3,
      sha256: "a".repeat(64),
    });
    expect(assessmentPackage.attachments[0]).not.toHaveProperty("dataBase64");
  });

  it("round-trips the portable JSON export including evidence bytes", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    assessment.subject.productName = "Quantum service";
    assessment.criterionProgress["1.1.1"] = {
      status: "met",
      evidenceStatement: "Release notes, page 3",
      notes: "",
      evidenceIds: ["evidence-1"],
    };
    assessment.questionProgress["0.2.1"] = {
      finding: "not-assessed",
      values: { targetDate: "2027-06-30" },
      evidenceIds: [],
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
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      true,
    );
    const restored = await parseAssessmentPackage(
      JSON.stringify(exported),
      model,
      profile,
    );
    expect(restored.subject.productName).toBe("Quantum service");
    expect(restored.criterionProgress["1.1.1"]).toEqual(
      assessment.criterionProgress["1.1.1"],
    );
    expect(restored.questionProgress["0.2.1"]).toEqual(
      assessment.questionProgress["0.2.1"],
    );
    expect(
      exported.credential.credentialSubject.responses.find(
        (response) => response.id === "0.2.1",
      ),
    ).toMatchObject({
      finding: "not-assessed",
      values: { targetDate: "2027-06-30" },
    });
    expect(restored.evidenceFiles).toEqual(assessment.evidenceFiles);
  });

  it("rejects evidence whose content does not match its SHA-256 digest", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
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
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      true,
    );

    await expect(
      parseAssessmentPackage(JSON.stringify(exported), model, profile),
    ).rejects.toThrow("Evidence file digest mismatch: evidence.txt");
  });

  it("uses the VC data model while explicitly marking the draft as unsecured", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    assessment.subject.productName = "Unsigned product";
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      false,
    );
    expect(exported.credential).toMatchObject({
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://pkic.org/ns/assessment/v1.jsonld",
      ],
      type: ["VerifiableCredential", "AssessmentCredential"],
      security: { status: "unsecured-draft" },
    });
    expect(exported.credential).not.toHaveProperty("proof");
    expect(exported.credential.credentialSubject.assurance).toMatchObject({
      claimStatus: "self-asserted",
      independentVerification: false,
      certificationStatus: "not-certified",
      approvalPolicy: {
        format: "PAdES",
        allowAdditionalSignatures: true,
      },
    });
    expect(exported.credential.credentialSubject.assurance).not.toHaveProperty(
      "proposedSigner",
    );
    expect(exported.credential.credentialSubject.identifiers).toEqual({
      cpe: "cpe:2.3:a:example:product:1.0.0:*:*:*:*:*:*:*",
    });
  });

  it("rejects an imported external-workflow assurance label", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      true,
    );
    exported.credential.credentialSubject.assessment.assuranceProfileId =
      "pkic-certified";
    await expect(
      parseAssessmentPackage(JSON.stringify(exported), model, profile),
    ).rejects.toThrow("not available to the browser workflow");
  });

  it("integrity-protects assessment timestamps", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      true,
    );
    exported.credential.credentialSubject.assessment.updatedAt =
      "2026-08-15T23:59:59.000Z";
    await expect(
      parseAssessmentPackage(JSON.stringify(exported), model, profile),
    ).rejects.toThrow("Assessment payload digest mismatch");
  });

  it("rejects response references to absent evidence", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      true,
    );
    exported.credential.credentialSubject.responses[0].evidenceIds = [
      "missing-evidence",
    ];
    await expect(
      parseAssessmentPackage(JSON.stringify(exported), model, profile),
    ).rejects.toThrow("references missing evidence");
  });

  it("rejects attachment counts above the browser import limit", async () => {
    const assessment = completePqcmmSubject(
      newEvidenceAssessment(model, profile),
    );
    assessment.evidenceFiles = [
      {
        id: "evidence-1",
        name: "empty.txt",
        mediaType: "text/plain",
        size: 0,
        sha256:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        addedAt: "2026-08-15T00:00:00.000Z",
        dataBase64: "",
      },
    ];
    const exported = await buildAssessmentPackage(
      model,
      profile,
      assessment,
      true,
    );
    exported.attachments = Array.from({ length: 257 }, (_, index) => ({
      ...exported.attachments[0],
      id: `evidence-${index}`,
      embeddedFileName: `evidence-${index}-empty.txt`,
    }));
    await expect(
      parseAssessmentPackage(JSON.stringify(exported), model, profile),
    ).rejects.toThrow("not a valid assessment package");
  });

  it("sanitizes both the attachment id and file name for PDF embedding", () => {
    expect(
      embeddedEvidenceName({
        id: "x) /FS /URL",
        name: "proof) /F (https://attacker.invalid",
        mediaType: "text/plain",
        size: 0,
        sha256: "0".repeat(64),
        addedAt: "2026-08-15T00:00:00.000Z",
        dataBase64: "",
      }),
    ).not.toMatch(/[()\s/]/);
  });
});
