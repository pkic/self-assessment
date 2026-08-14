export type PqcmmCriterionStatus =
  "not-assessed" | "met" | "not-met" | "partial";

export interface PqcmmCriterion {
  id: string;
  text: string;
}

export interface PqcmmQuestion {
  id: string;
  question: string;
  guidance?: string;
  expectedInput?: string;
  purpose?: string;
}

export interface PqcmmQuestionGroup {
  id: string;
  name: string;
  kind: "assessment" | "intake";
  introduction?: string;
  questions: PqcmmQuestion[];
}

export interface PqcmmLevel {
  number: number;
  name: string;
  title: string;
  description: string;
  summary: string;
  sourcePage: string;
  criteria: {
    introduction: string;
    items: PqcmmCriterion[];
  };
  assessment: {
    methodology: string;
    groups: PqcmmQuestionGroup[];
  };
  evidenceChecklist: {
    introduction: string;
    items: { id: string; text: string }[];
  };
}

export interface PqcmmModelData {
  schemaVersion: string;
  model: {
    id: "pqcmm";
    name: string;
    abbreviation: "PQCMM";
    version: string;
    scope: "product-or-service";
    subjectLabel: string;
    description: string;
    canonicalUrl: string;
  };
  scoring: {
    method: "cumulative-all-criteria";
    minimumLevel: 0;
    maximumLevel: 5;
    criterionStatuses: PqcmmCriterionStatus[];
    rule: string;
  };
  levels: PqcmmLevel[];
}

export interface PqcmmEvidenceFile {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  sha256: string;
  addedAt: string;
  dataBase64: string;
}

export interface PqcmmCriterionProgress {
  status: PqcmmCriterionStatus;
  evidenceStatement: string;
  notes: string;
  evidenceIds: string[];
}

export interface PqcmmQuestionProgress {
  answer: string;
  evidenceIds: string[];
}

export interface PqcmmAssessmentRecord {
  stateSchemaVersion: 1;
  id: string;
  name: string;
  modelId: "pqcmm";
  dataVersion: string;
  productName: string;
  productVersion: string;
  vendorName: string;
  deploymentScope: string;
  assessmentType: "self" | "third-party";
  assessorName: string;
  assessorOrganization: string;
  assessmentDate: string;
  criterionProgress: Record<string, PqcmmCriterionProgress>;
  questionProgress: Record<string, PqcmmQuestionProgress>;
  evidenceFiles: PqcmmEvidenceFile[];
  createdAt: string;
  updatedAt: string;
}

export interface PqcmmScore {
  achievedLevel: number | null;
  nextLevel: number | null;
  criteriaMet: number;
  criteriaTotal: number;
  questionsAnswered: number;
  questionsTotal: number;
  evidenceFiles: number;
  levelResults: {
    level: number;
    met: boolean;
    criteriaMet: number;
    criteriaTotal: number;
    blockers: string[];
  }[];
}

export interface PqcmmMachineEvidence {
  id: string;
  fileName: string;
  embeddedFileName: string;
  mediaType: string;
  size: number;
  sha256: string;
  addedAt: string;
  dataBase64?: string;
}

export interface PqcmmMachineAssessment {
  format: "pkic-pqcmm-assessment";
  schemaVersion: "1.0.0";
  model: {
    id: "pqcmm";
    version: string;
    schemaVersion: string;
    source: string;
  };
  assessment: {
    id: string;
    name: string;
    productName: string;
    productVersion: string;
    vendorName: string;
    deploymentScope: string;
    assessmentType: "self" | "third-party";
    assessorName: string;
    assessorOrganization: string;
    assessmentDate: string;
    createdAt: string;
    updatedAt: string;
  };
  result: PqcmmScore;
  criteria: {
    id: string;
    level: number;
    text: string;
    status: PqcmmCriterionStatus;
    evidenceStatement: string;
    notes: string;
    evidenceIds: string[];
  }[];
  questions: {
    id: string;
    level: number;
    group: string;
    question: string;
    answer: string;
    evidenceIds: string[];
  }[];
  attachments: PqcmmMachineEvidence[];
}
