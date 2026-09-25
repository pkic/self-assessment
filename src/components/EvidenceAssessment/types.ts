export interface EvidenceCriterion {
  id: string;
  text: string;
  assessmentQuestionIds?: string[];
}

export type EvidenceQuestionFieldType =
  | "text"
  | "textarea"
  | "date"
  | "date-time"
  | "date-range"
  | "time"
  | "month"
  | "week"
  | "url"
  | "tel"
  | "boolean"
  | "select"
  | "multiselect"
  | "cpe-2.3"
  | "package-url"
  | "number"
  | "duration";

// A widget hint for a type whose stored value and meaning don't change:
// checkbox for boolean, radio for select, range for number. Not a separate
// type, so a consumer switching on `type` still only sees one shape.
export type FieldPresentation = "checkbox" | "radio" | "range";

// Canonical duration units. Answers normalize to seconds using fixed
// (Julian-year-based) multipliers, not calendar-variable arithmetic, so two
// implementations agree on what a stored value means. See DURATION_UNIT_SECONDS.
export type DurationUnit =
  "second" | "minute" | "hour" | "day" | "week" | "month" | "year" | "decade";

export interface EvidenceQuestionField {
  key: string;
  label: string;
  type: EvidenceQuestionFieldType;
  required: boolean;
  hint?: string;
  rows?: number;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  allowedUnits?: DurationUnit[];
  presentation?: FieldPresentation;
  options?: { value: string; label: string }[];
}

export interface EvidenceQuestionResponse {
  fields: EvidenceQuestionField[];
  rules?: {
    kind: "at-least-one";
    fields: string[];
    message: string;
  }[];
  evidence?: {
    label: string;
    description: string;
    required: boolean;
    acceptedMediaTypes: string[];
    maxFiles: number;
  };
}

export interface EvidenceQuestion {
  id: string;
  question: string;
  guidance?: string;
  expectedInput?: string;
  purpose?: string;
  response?: EvidenceQuestionResponse;
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
  finding: string;
  values: Record<string, string | string[]>;
  evidenceIds: string[];
}

export interface EvidenceAssessmentRecord {
  stateSchemaVersion: 3;
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
    finding?: string;
    value: string;
    values?: Record<string, string | string[]>;
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
