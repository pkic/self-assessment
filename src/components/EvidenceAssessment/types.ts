export interface EvidenceCriterion {
  id: string;
  text: string;
}

export interface EvidenceQuestion {
  id: string;
  question: string;
  guidance?: string;
  expectedInput?: string;
  purpose?: string;
}

export interface EvidenceQuestionGroup {
  id: string;
  name: string;
  kind: "assessment" | "intake";
  introduction?: string;
  questions: EvidenceQuestion[];
}

export interface EvidenceLevel {
  number: number;
  name: string;
  title: string;
  description: string;
  summary: string;
  sourcePage: string;
  criteria: {
    introduction: string;
    items: EvidenceCriterion[];
  };
  assessment: {
    methodology: string;
    groups: EvidenceQuestionGroup[];
  };
  evidenceChecklist: {
    introduction: string;
    items: { id: string; text: string }[];
  };
}

export interface EvidenceModelData {
  schemaVersion: string;
  model: {
    id: string;
    name: string;
    abbreviation: string;
    version: string;
    scope: string;
    subjectLabel: string;
    description: string;
    canonicalUrl: string;
  };
  scoring: {
    method: string;
    minimumLevel: number;
    maximumLevel: number;
    criterionStatuses: string[];
    rule: string;
  };
  levels: EvidenceLevel[];
}

export type AssessmentEvidenceFile = EvidenceFile;

export interface EvidenceCriterionProgress {
  status: string;
  evidenceStatement: string;
  notes: string;
  evidenceIds: string[];
}

export interface EvidenceQuestionProgress {
  answer: string;
  evidenceIds: string[];
}

export interface EvidenceAssessmentRecord {
  stateSchemaVersion: 2;
  id: string;
  name: string;
  modelId: string;
  dataVersion: string;
  subject: Record<string, string>;
  assuranceProfileId: string;
  criterionProgress: Record<string, EvidenceCriterionProgress>;
  questionProgress: Record<string, EvidenceQuestionProgress>;
  evidenceFiles: AssessmentEvidenceFile[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentCredentialSubject {
  id: string;
  model: {
    id: string;
    version: string;
    schemaVersion: string;
    source: string;
  };
  profile: {
    id: string;
    version: string;
    schemaVersion: string;
  };
  assessment: {
    id: string;
    name: string;
    subject: Record<string, string>;
    assuranceProfileId: string;
    createdAt: string;
    updatedAt: string;
  };
  identifiers: import("../../assessment-engine/subject-identifiers").AssessmentSubjectIdentifiers;
  assurance: AssuranceSummary & {
    notice: string;
    approvalPolicy?: import("../../assessment-engine/types").ReportSigningPolicy;
  };
  integrity: {
    algorithm: "SHA-256";
    payloadSha256: string;
  };
  result: import("../../assessment-engine/methodologies/cumulativeGates").GatedMaturityScore;
  responses: {
    id: string;
    kind: "criterion" | "question";
    level: number;
    group?: string;
    prompt: string;
    status?: string;
    value: string;
    notes?: string;
    evidenceIds: string[];
    evidenceReviewStatus: EvidenceReviewStatus;
  }[];
}
import type {
  AssuranceSummary,
  EvidenceFile,
  EvidenceReviewStatus,
} from "../../assessment-engine/types";
