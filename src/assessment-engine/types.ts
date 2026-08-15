export type AssessmentFamily =
  "maturity" | "knowledge-diagnostic" | "certification-exam";

export interface AssessmentSubjectField {
  key: string;
  label: string;
  component: "text" | "textarea" | "date";
  required: boolean;
  rows?: number;
  hint?: string;
  format?: "cpe-2.3" | "package-url" | "uri";
}

export interface AssessmentSubjectRule {
  kind: "at-least-one";
  fields: string[];
  message: string;
}

export interface AssessmentStatusOption {
  value: string;
  label: string;
}

export type AssuranceFacet =
  | "identity"
  | "organization-binding"
  | "role-authority"
  | "document-signature"
  | "trusted-time"
  | "evidence-review"
  | "assessor-qualification"
  | "certification-issuance";

export interface ReportSignatureFieldPolicy {
  name: string;
  label: string;
  role: string;
  required: boolean;
}

export interface ReportSigningPolicy {
  format: "PAdES";
  fields: ReportSignatureFieldPolicy[];
  allowAdditionalSignatures: boolean;
  targetLevel: "B-T" | "B-LT" | "B-LTA";
  trustedTime: "signature-or-document-timestamp";
  acceptedAuthorityEvidence: string[];
}

export interface AssessmentProfileData {
  schemaVersion: "1.0.0";
  profile: {
    id: string;
    version: string;
    family: AssessmentFamily;
    model: { id: string; version: string };
    title: string;
    description: string;
  };
  runtime: {
    experience: string;
    methodology: {
      strategy: string;
      version: string;
      parameters: Record<string, unknown>;
    };
    subjectFields: AssessmentSubjectField[];
    subjectRules?: AssessmentSubjectRule[];
    criterion?: {
      statuses: AssessmentStatusOption[];
      evidence: {
        requiredForStatuses: string[];
        requiredFromLevel: number;
        statementLabel: string;
        statementHint: string;
        maxFileBytes: number;
        maxPackageBytes: number;
        acceptedMediaTypes: string[];
        validators: string[];
      };
    };
  };
  assurance: {
    defaultProfile: string;
    profiles: {
      id: string;
      label: string;
      reportLabel: string;
      availability: "browser" | "external-workflow";
      independentVerification: boolean;
      certification: boolean;
      requiredFacets: AssuranceFacet[];
      notice: string;
      attestation?: {
        enabled: boolean;
        signerRole: string;
        method: "electronic-acknowledgement" | "external-digital-signature";
        declaration: string;
      };
    }[];
  };
  report: {
    title: string;
    claimLabel: string;
    machineAttachmentName: string;
    includeEvidenceAttachments: boolean;
    includeEvidenceManifest: boolean;
    includeAttestation: boolean;
    signing?: ReportSigningPolicy;
  };
  futureServices: {
    pkicSubmission: {
      implemented: false;
      processingMayRequirePayment: boolean;
      covers: string[];
    };
  };
}

export interface AssessmentCredentialDraft<Subject = unknown> {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://pkic.org/ns/assessment/v1.jsonld",
  ];
  id: string;
  type: ["VerifiableCredential", "AssessmentCredential"];
  issuer: {
    id: string;
    name: string;
  };
  validFrom: string;
  credentialSchema: {
    id: string;
    type: "JsonSchema";
  };
  credentialSubject: Subject;
  security: {
    status: "unsecured-draft";
    notice: string;
  };
}

export interface AssessmentPackage<Subject = unknown> {
  format: "pkic-assessment-package";
  schemaVersion: "1.0.0";
  credential: AssessmentCredentialDraft<Subject>;
  attachments: AssessmentAttachment[];
}

export interface AssessmentAttachment {
  id: string;
  fileName: string;
  embeddedFileName: string;
  mediaType: string;
  size: number;
  sha256: string;
  addedAt: string;
  dataBase64?: string;
}

export interface EvidenceFile {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  sha256: string;
  addedAt: string;
  dataBase64: string;
}

export type EvidenceReviewStatus =
  | "not-provided"
  | "provided-not-reviewed"
  | "reviewed-supports"
  | "reviewed-inconclusive"
  | "reviewed-does-not-support";

export interface AssuranceSummary {
  claimStatus: "self-asserted";
  evidenceStatus: "none" | "provided-not-reviewed";
  independentVerification: false;
  certificationStatus: "not-certified";
}
