import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { evidenceCriterionPolicy } from "../../assessment-engine/profile";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { Button, Card, TextArea } from "../ui";
import { criterionLabel } from "./criterionLabel";
import { EvidenceAttachments } from "./EvidenceAttachments";
import { QuestionResponseFields } from "./QuestionResponseFields";
import {
  emptyQuestionProgress,
  questionResponseIssues,
  responseDefinition,
} from "./questionResponse";
import type {
  AssessmentEvidenceFile,
  EvidenceCriterion,
  EvidenceCriterionProgress,
  EvidenceQuestion,
  EvidenceQuestionGroup,
  EvidenceQuestionProgress,
} from "./types";

type CriterionPolicy = ReturnType<typeof evidenceCriterionPolicy> | undefined;

const criterionStatusClass = (status: string, blocked: boolean): string =>
  `evidence-assessment-status-${status === "met" && blocked ? "blocked" : status}`;

interface CriterionCardProps {
  criterion: EvidenceCriterion;
  progress: EvidenceCriterionProgress;
  /** Engine blocker for this criterion ("id: reason"), when it has one. */
  gateBlocker?: string;
  policy: CriterionPolicy;
  /** Whether the methodology asks for evidence at this criterion's level. */
  evidenceRequired: boolean;
  evidenceFiles: AssessmentEvidenceFile[];
  onUpdate: (update: Partial<EvidenceCriterionProgress>) => void;
  onAddEvidence: (files: FileList) => Promise<void>;
  onRemoveEvidence: (id: string) => void;
}

export const CriterionCard: React.FC<CriterionCardProps> = ({
  criterion,
  progress,
  gateBlocker,
  policy,
  evidenceRequired,
  evidenceFiles,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
}) => {
  const passingLabel =
    policy?.statuses.find((option) => option.value === "met")?.label ?? "Met";
  return (
    <Card
      as="article"
      padding="lg"
      className={`evidence-assessment-criterion ${criterionStatusClass(
        progress.status,
        Boolean(gateBlocker),
      )}`}
    >
      <div className="evidence-assessment-item-title">
        <span
          title={`Criterion ${criterion.id}`}
          aria-label={`Criterion ${criterion.id}`}
        >
          {criterionLabel(criterion.id)}
        </span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {criterion.text}
        </ReactMarkdown>
      </div>
      <fieldset className="evidence-assessment-status-options">
        <legend>Criterion status</legend>
        {policy?.statuses.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={`status-${criterion.id}`}
              value={option.value}
              checked={progress.status === option.value}
              onChange={() => onUpdate({ status: option.value })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      {criterion.assessmentQuestionIds?.length ? (
        <p className="evidence-assessment-criterion__question-links">
          Assessed through questions{" "}
          {criterion.assessmentQuestionIds.join(", ")}.
        </p>
      ) : null}
      {evidenceRequired ? (
        <>
          <TextArea
            label={policy?.evidence.statementLabel ?? "Evidence"}
            hint={policy?.evidence.statementHint}
            rows={3}
            value={progress.evidenceStatement}
            onChange={(event) =>
              onUpdate({ evidenceStatement: event.target.value })
            }
          />
          {progress.status === "met" && gateBlocker ? (
            <output className="evidence-assessment-evidence-required">
              This criterion cannot establish the level:{" "}
              {gateBlocker.slice(criterion.id.length + 2)}.
            </output>
          ) : null}
          <EvidenceAttachments
            ownerLabel={`criterion ${criterion.id}`}
            evidenceIds={progress.evidenceIds}
            evidenceFiles={evidenceFiles}
            onAdd={onAddEvidence}
            onRemove={onRemoveEvidence}
          />
        </>
      ) : (
        <p className="evidence-assessment-level-zero-note">
          Evidence is not required at this level. Mark every criterion{" "}
          {passingLabel} to establish it.
        </p>
      )}
      <TextArea
        label="Notes and gaps"
        rows={2}
        value={progress.notes}
        onChange={(event) => onUpdate({ notes: event.target.value })}
      />
    </Card>
  );
};

interface QuestionCardProps {
  question: EvidenceQuestion;
  kind: EvidenceQuestionGroup["kind"];
  profile: AssessmentProfileData;
  /** Saved progress, or undefined when the question is untouched. */
  progress: EvidenceQuestionProgress | undefined;
  evidenceFiles: AssessmentEvidenceFile[];
  onUpdate: (update: Partial<EvidenceQuestionProgress>) => void;
  onAddEvidence: (
    limits: { acceptedMediaTypes?: string[]; maxFiles?: number },
    files: FileList,
  ) => Promise<void>;
  onRemoveEvidence: (id: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  kind,
  profile,
  progress: savedProgress,
  evidenceFiles,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
}) => {
  const progress = savedProgress ?? emptyQuestionProgress();
  const definition = responseDefinition(question, kind, profile);
  const responseIssues = savedProgress
    ? questionResponseIssues(question, kind, profile, progress, evidenceFiles)
    : [];
  const defaults = profile.runtime.questions?.defaults[kind];
  const acceptsEvidence = Boolean(definition.evidence) || kind === "assessment";
  return (
    <Card as="article" padding="lg" className="evidence-assessment-question">
      <div className="evidence-assessment-item-title">
        <span>{question.id}</span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {question.question}
        </ReactMarkdown>
      </div>
      {question.guidance ? (
        <details>
          <summary>Assessment guidance</summary>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {question.guidance}
          </ReactMarkdown>
        </details>
      ) : null}
      {/* A profile-defined response form already shows what is expected. */}
      {question.expectedInput && !question.response ? (
        <p>
          <strong>Expected input:</strong> {question.expectedInput}
        </p>
      ) : null}
      {question.purpose ? (
        <p className="evidence-assessment-question__purpose">
          <strong>Purpose:</strong> {question.purpose}
        </p>
      ) : null}
      <QuestionResponseFields
        question={question}
        kind={kind}
        profile={profile}
        progress={progress}
        onChange={onUpdate}
      />
      {responseIssues.length > 0 ? (
        <ul className="evidence-assessment-question__issues">
          {responseIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {acceptsEvidence ? (
        <EvidenceAttachments
          ownerLabel={`question ${question.id}`}
          evidenceIds={progress.evidenceIds}
          evidenceFiles={evidenceFiles}
          onAdd={(files) =>
            onAddEvidence(
              {
                acceptedMediaTypes: definition.evidence?.acceptedMediaTypes,
                maxFiles: definition.evidence?.maxFiles,
              },
              files,
            )
          }
          onRemove={onRemoveEvidence}
          label={definition.evidence?.label ?? defaults?.evidenceLabel}
          description={
            definition.evidence?.description ?? defaults?.evidenceDescription
          }
          acceptedMediaTypes={definition.evidence?.acceptedMediaTypes}
          maxFiles={definition.evidence?.maxFiles}
        />
      ) : null}
    </Card>
  );
};

interface LevelNavigationProps {
  previous?: number;
  next?: number;
  onSelect: (level: number) => void;
}

/** Back and Continue buttons at the end of a level. */
export const LevelNavigation: React.FC<LevelNavigationProps> = ({
  previous,
  next,
  onSelect,
}) => {
  if (previous === undefined && next === undefined) return null;
  return (
    <nav
      className="evidence-assessment-level-nav"
      aria-label="Move between levels"
    >
      {previous === undefined ? (
        <span />
      ) : (
        <Button onClick={() => onSelect(previous)}>
          Back to Level {previous}
        </Button>
      )}
      {next === undefined ? null : (
        <Button variant="primary" onClick={() => onSelect(next)}>
          Continue to Level {next}
        </Button>
      )}
    </nav>
  );
};
