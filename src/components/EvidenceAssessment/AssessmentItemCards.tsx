import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { evidenceCriterionPolicy } from "../../assessment-engine/profile";
import type { GatedCriterionResult } from "../../assessment-engine/methodologies/cumulativeGates";
import { ChoiceGroup, choiceTone } from "./ChoiceGroup";
import { passingQuestionFindings } from "./assessmentView";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { Button, Card, TextArea } from "../ui";
import { criterionLabel, plainText } from "./criterionLabel";
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

/** Card state: counted, claimed but still missing something, or open. */
const criterionState = (
  result: GatedCriterionResult | undefined,
): "met" | "progress" | "open" => {
  if (result?.met) return "met";
  if (result?.statusPasses) return "progress";
  return "open";
};

interface CriterionCardProps {
  criterion: EvidenceCriterion;
  progress: EvidenceCriterionProgress;
  /** The engine's view of this criterion's gate. */
  result?: GatedCriterionResult;
  policy: CriterionPolicy;
  passingStatuses: string[];
  /** Whether the methodology asks for evidence at this criterion's level. */
  evidenceRequired: boolean;
  evidenceFiles: AssessmentEvidenceFile[];
  onUpdate: (update: Partial<EvidenceCriterionProgress>) => void;
  onAddEvidence: (files: FileList) => Promise<void>;
  onRemoveEvidence: (id: string) => void;
  /** The assessment questions linked to this criterion, already rendered. */
  children?: React.ReactNode;
}

interface GateCheck {
  label: string;
  done: boolean;
}

const gateChecks = (
  result: GatedCriterionResult | undefined,
  passingLabel: string,
): GateCheck[] => {
  if (!result) return [];
  const checks: GateCheck[] = [
    { label: `Marked ${passingLabel}`, done: result.statusPasses },
  ];
  if (result.evidenceRequired) {
    checks.push({ label: "Evidence recorded", done: result.evidencePasses });
  }
  if (result.questionIds.length > 0) {
    checks.push({
      label: `Questions support it (${result.supportingQuestionIds.length} of ${result.questionIds.length})`,
      done: result.supportingQuestionIds.length === result.questionIds.length,
    });
  }
  return checks;
};

export const CriterionCard: React.FC<CriterionCardProps> = ({
  criterion,
  progress,
  result,
  policy,
  passingStatuses,
  evidenceRequired,
  evidenceFiles,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
  children,
}) => {
  const passingLabel =
    policy?.statuses.find((option) => passingStatuses.includes(option.value))
      ?.label ?? "Met";
  const checks = gateChecks(result, passingLabel);
  const questionCount = result?.questionIds.length ?? 0;
  return (
    <Card
      as="article"
      padding="lg"
      className={`evidence-assessment-criterion evidence-assessment-criterion--${criterionState(result)}`}
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

      {children ? (
        <section className="evidence-assessment-criterion__section">
          <h5>
            {questionCount === 1
              ? "Question for this criterion"
              : `Questions for this criterion (${questionCount})`}
          </h5>
          <div className="evidence-assessment-criterion__questions">
            {children}
          </div>
        </section>
      ) : null}

      <section className="evidence-assessment-criterion__section">
        {children ? <h5>Your conclusion</h5> : null}
        <ChoiceGroup
          legend="Criterion status"
          name={`status-${criterion.id}`}
          options={policy?.statuses ?? []}
          value={progress.status}
          onChange={(status) => onUpdate({ status })}
          passingValues={passingStatuses}
        />
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
      </section>

      {checks.length > 1 ? (
        <ul
          className="evidence-assessment-gate-checks"
          aria-label="What this criterion needs to count"
        >
          {checks.map((check) => (
            <li
              key={check.label}
              className={
                check.done
                  ? "evidence-assessment-gate-checks__done"
                  : "evidence-assessment-gate-checks__open"
              }
            >
              <span className="pkimm-visually-hidden">
                {check.done ? "Done: " : "Still needed: "}
              </span>
              {check.label}
            </li>
          ))}
        </ul>
      ) : null}
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
  /**
   * Shown inside its criterion: a collapsible row whose summary carries the
   * question and its current finding, instead of a card of its own.
   */
  nested?: boolean;
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
  nested = false,
}) => {
  const progress = savedProgress ?? emptyQuestionProgress();
  const definition = responseDefinition(question, kind, profile);
  const responseIssues = savedProgress
    ? questionResponseIssues(question, kind, profile, progress, evidenceFiles)
    : [];
  const defaults = profile.runtime.questions?.defaults[kind];
  const acceptsEvidence = Boolean(definition.evidence) || kind === "assessment";
  const findings = profile.runtime.questions?.findings ?? [];
  const finding = findings.find((option) => option.value === progress.finding);

  const body = (
    <>
      {question.guidance ? (
        <details className="evidence-assessment-question__guidance">
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
        <div className="evidence-assessment-question__issues">
          <p>To complete this answer</p>
          <ul>
            {responseIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
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
    </>
  );

  if (nested) {
    return (
      <details className="evidence-assessment-question evidence-assessment-question--nested">
        <summary>
          <span className="evidence-assessment-question__id">
            {question.id}
          </span>
          <span className="evidence-assessment-question__text">
            {plainText(question.question)}
          </span>
          {finding ? (
            <span
              className={`evidence-assessment-question__finding evidence-assessment-question__finding--${choiceTone(
                finding.value,
                passingQuestionFindings(profile),
              )}`}
            >
              {finding.label}
            </span>
          ) : null}
        </summary>
        <div className="evidence-assessment-question__body">{body}</div>
      </details>
    );
  }

  return (
    <Card as="article" padding="lg" className="evidence-assessment-question">
      <div className="evidence-assessment-item-title">
        <span>{question.id}</span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {question.question}
        </ReactMarkdown>
      </div>
      {body}
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
