import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { evidenceCriterionPolicy } from "../../assessment-engine/profile";
import type { GatedCriterionResult } from "../../assessment-engine/methodologies/cumulativeGates";
import { ChoiceGroup } from "./ChoiceGroup";
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
  /**
   * Whether the current status opens the support section (linked questions,
   * evidence). Statuses that don't only ask what is missing.
   */
  supportOpen: boolean;
  evidenceFiles: AssessmentEvidenceFile[];
  onUpdate: (update: Partial<EvidenceCriterionProgress>) => void;
  onAddEvidence: (files: FileList) => Promise<void>;
  onRemoveEvidence: (id: string) => void;
  /** The assessment questions linked to this criterion, already rendered. */
  children?: React.ReactNode;
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * What still stands between a claimed criterion and counting, as one
 * sentence fragment list ("2 more answers", "evidence").
 */
const outstandingParts = (
  result: GatedCriterionResult | undefined,
): string[] => {
  if (!result?.statusPasses || result.met) return [];
  const parts: string[] = [];
  const unanswered =
    result.questionIds.length - result.supportingQuestionIds.length;
  if (unanswered > 0) {
    parts.push(`${plural(unanswered, "more answer", "more answers")}`);
  }
  if (result.evidenceRequired && !result.evidencePasses) {
    parts.push("evidence");
  }
  return parts;
};

/** The line that opens a criterion's support section, if any. */
const supportIntroText = (
  passing: boolean,
  passingLabel: string,
  outstanding: string[],
  questionCount: number,
): string | null => {
  if (passing && outstanding.length > 0) {
    return `This counts as ${passingLabel} once it has ${outstanding.join(" and ")}.`;
  }
  if (!passing && questionCount > 0) {
    return "Answer the questions to record what is already in place.";
  }
  return null;
};

const StateChip: React.FC<{
  result?: GatedCriterionResult;
  status: string;
  statusLabel?: string;
  passingLabel: string;
}> = ({ result, status, statusLabel, passingLabel }) => {
  if (status === "not-assessed" || !statusLabel) return null;
  if (result?.met) {
    return (
      <span className="evidence-criterion__chip evidence-criterion__chip--ok">
        {passingLabel}
      </span>
    );
  }
  if (result?.statusPasses) {
    return (
      <span className="evidence-criterion__chip evidence-criterion__chip--warn">
        {passingLabel}, not yet supported
      </span>
    );
  }
  return <span className="evidence-criterion__chip">{statusLabel}</span>;
};

const CriterionEvidence: React.FC<
  Pick<
    CriterionCardProps,
    | "policy"
    | "progress"
    | "evidenceFiles"
    | "onUpdate"
    | "onAddEvidence"
    | "onRemoveEvidence"
  > & { criterionId: string }
> = ({
  criterionId,
  policy,
  progress,
  evidenceFiles,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
}) => (
  <div className="evidence-criterion__evidence">
    <TextArea
      label={policy?.evidence.statementLabel ?? "Evidence"}
      labelNote="or attach a file"
      hint={policy?.evidence.statementHint}
      rows={3}
      value={progress.evidenceStatement}
      onChange={(event) => onUpdate({ evidenceStatement: event.target.value })}
    />
    <EvidenceAttachments
      ownerLabel={`criterion ${criterionId}`}
      evidenceIds={progress.evidenceIds}
      evidenceFiles={evidenceFiles}
      onAdd={onAddEvidence}
      onRemove={onRemoveEvidence}
    />
  </div>
);

export const CriterionCard: React.FC<CriterionCardProps> = ({
  criterion,
  progress,
  result,
  policy,
  passingStatuses,
  evidenceRequired,
  supportOpen,
  evidenceFiles,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
  children,
}) => {
  const statuses = policy?.statuses ?? [];
  const passingLabel =
    statuses.find((option) => passingStatuses.includes(option.value))?.label ??
    "Met";
  const statusLabel = statuses.find(
    (option) => option.value === progress.status,
  )?.label;
  const decided = progress.status !== "not-assessed";
  const passing = passingStatuses.includes(progress.status);
  const outstanding = outstandingParts(result);
  const questionCount = result?.questionIds.length ?? 0;
  const headingId = `criterion-${criterion.id}`;

  const supportIntro = supportIntroText(
    passing,
    passingLabel,
    outstanding,
    questionCount,
  );

  return (
    <article
      aria-labelledby={headingId}
      className={`evidence-criterion evidence-criterion--${criterionState(result)}`}
    >
      <header className="evidence-criterion__header">
        <span
          className="evidence-criterion__number"
          title={`Criterion ${criterion.id}`}
        >
          {criterionLabel(criterion.id)}
        </span>
        <div className="evidence-criterion__statement" id={headingId}>
          <span className="pkimm-visually-hidden">
            Criterion {criterion.id}:{" "}
          </span>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {criterion.text}
          </ReactMarkdown>
        </div>
        <StateChip
          result={result}
          status={progress.status}
          statusLabel={statusLabel}
          passingLabel={passingLabel}
        />
      </header>

      <div className="evidence-criterion__decision">
        <ChoiceGroup
          legend="Your conclusion"
          name={`status-${criterion.id}`}
          options={statuses}
          value={progress.status}
          onChange={(status) => onUpdate({ status })}
          passingValues={passingStatuses}
        />
      </div>

      {decided && supportOpen ? (
        <section
          className="evidence-criterion__support"
          aria-label={`Support for criterion ${criterion.id}`}
        >
          {supportIntro ? (
            <p
              className={
                passing
                  ? "evidence-criterion__intro evidence-criterion__intro--warn"
                  : "evidence-criterion__intro"
              }
            >
              {supportIntro}
            </p>
          ) : null}
          {children ? (
            <ol className="evidence-criterion__questions">{children}</ol>
          ) : null}
          {evidenceRequired ? (
            <CriterionEvidence
              criterionId={criterion.id}
              policy={policy}
              progress={progress}
              evidenceFiles={evidenceFiles}
              onUpdate={onUpdate}
              onAddEvidence={onAddEvidence}
              onRemoveEvidence={onRemoveEvidence}
            />
          ) : null}
          <TextArea
            label="Notes and gaps"
            labelNote="optional"
            rows={2}
            value={progress.notes}
            onChange={(event) => onUpdate({ notes: event.target.value })}
          />
        </section>
      ) : null}

      {decided && !supportOpen ? (
        <div className="evidence-criterion__support evidence-criterion__support--plain">
          <TextArea
            label="What is missing?"
            labelNote="optional"
            rows={2}
            value={progress.notes}
            onChange={(event) => onUpdate({ notes: event.target.value })}
          />
        </div>
      ) : null}
    </article>
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
   * "step": a numbered item inside its criterion's support section (an
   * <li>). "panel": just the form, for a side panel that shows the question
   * itself. "card": a card of its own.
   */
  layout?: "card" | "step" | "panel";
}

const QuestionStatus: React.FC<{
  complete: boolean;
  started: boolean;
}> = ({ complete, started }) => {
  if (complete) {
    return (
      <span className="evidence-question__status evidence-question__status--ok">
        Answered
      </span>
    );
  }
  return (
    <span className="evidence-question__status">
      {started ? "In progress" : "To answer"}
    </span>
  );
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  kind,
  profile,
  progress: savedProgress,
  evidenceFiles,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
  layout = "card",
}) => {
  const progress = savedProgress ?? emptyQuestionProgress();
  const definition = responseDefinition(question, kind, profile);
  const issues = questionResponseIssues(
    question,
    kind,
    profile,
    progress,
    evidenceFiles,
  );
  const started = Boolean(savedProgress);
  const defaults = profile.runtime.questions?.defaults[kind];
  const acceptsEvidence = Boolean(definition.evidence) || kind === "assessment";
  const headingId = `question-${question.id}`;

  const body = (
    <>
      {question.guidance ? (
        <div className="evidence-question__guidance">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {question.guidance}
          </ReactMarkdown>
        </div>
      ) : null}
      {/* A profile-defined response form already shows what is expected. */}
      {question.expectedInput && !question.response ? (
        <p className="evidence-question__guidance">
          Expected: {question.expectedInput}
        </p>
      ) : null}
      <QuestionResponseFields
        question={question}
        kind={kind}
        profile={profile}
        progress={progress}
        onChange={onUpdate}
      />
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
      {started && issues.length > 0 ? (
        <div className="evidence-question__issues">
          <p>Still needed for this answer:</p>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );

  const header = (
    <header className="evidence-question__header">
      <div className="evidence-question__text" id={headingId}>
        <span className="evidence-question__id">{question.id}</span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {question.question}
        </ReactMarkdown>
      </div>
      <QuestionStatus complete={issues.length === 0} started={started} />
    </header>
  );

  if (layout === "panel") {
    return <div className="evidence-question">{body}</div>;
  }

  if (layout === "step") {
    return (
      <li className="evidence-question" aria-labelledby={headingId}>
        {header}
        {body}
      </li>
    );
  }

  return (
    <Card
      as="article"
      padding="lg"
      className="evidence-question evidence-question--card"
      aria-labelledby={headingId}
    >
      {header}
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
