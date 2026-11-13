import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { Button, IconButton, Modal } from "../ui";
import { plainText } from "./criterionLabel";
import { questionIsAnswered } from "./questionResponse";
import type {
  AssessmentEvidenceFile,
  EvidenceQuestion,
  EvidenceQuestionGroup,
  EvidenceQuestionProgress,
} from "./types";

export interface ExtraQuestionGroup {
  group: EvidenceQuestionGroup;
  questions: EvidenceQuestion[];
}

interface Props {
  groups: ExtraQuestionGroup[];
  profile: AssessmentProfileData;
  questionProgress: Record<string, EvidenceQuestionProgress>;
  evidenceFiles: AssessmentEvidenceFile[];
  /** Renders the full question form shown in the drawer. */
  renderQuestion: (
    question: EvidenceQuestion,
    kind: EvidenceQuestionGroup["kind"],
  ) => React.ReactNode;
}

/**
 * Questions no criterion depends on. They add detail to the report but do
 * not decide the level, so the page lists them compactly and each one opens
 * in a side panel instead of putting every form on the page.
 */
export const ExtraQuestions: React.FC<Props> = ({
  groups,
  profile,
  questionProgress,
  evidenceFiles,
  renderQuestion,
}) => {
  const [open, setOpen] = useState<{
    question: EvidenceQuestion;
    kind: EvidenceQuestionGroup["kind"];
  } | null>(null);
  if (groups.length === 0) return null;
  const total = groups.reduce((sum, entry) => sum + entry.questions.length, 0);
  const answered = groups.reduce(
    (sum, entry) =>
      sum +
      entry.questions.filter((question) =>
        questionIsAnswered(
          question,
          entry.group.kind,
          profile,
          questionProgress[question.id],
          evidenceFiles,
        ),
      ).length,
    0,
  );

  return (
    <section
      className="evidence-extra"
      aria-labelledby="evidence-extra-heading"
    >
      <header className="evidence-extra__header">
        <h4 id="evidence-extra-heading">More detail for the report</h4>
        <span className="evidence-extra__count">
          {answered} of {total} answered
        </span>
      </header>
      <p className="evidence-extra__intro">
        These questions don&apos;t decide the level. Answer the ones that apply
        to give readers of the report more context.
      </p>
      {groups.map(({ group, questions }) => (
        <div key={group.id} className="evidence-extra__group">
          <h5>{group.name}</h5>
          <ul>
            {questions.map((question) => {
              const done = questionIsAnswered(
                question,
                group.kind,
                profile,
                questionProgress[question.id],
                evidenceFiles,
              );
              const text = plainText(question.question);
              return (
                <li key={question.id}>
                  <span className="evidence-extra__question">{text}</span>
                  {done ? (
                    <span className="evidence-question__status evidence-question__status--ok">
                      Answered
                    </span>
                  ) : (
                    <span />
                  )}
                  <Button
                    size="sm"
                    variant={done ? "ghost" : "secondary"}
                    aria-label={`${done ? "Edit" : "Answer"}: ${text}`}
                    onClick={() => setOpen({ question, kind: group.kind })}
                  >
                    {done ? "Edit" : "Answer"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        placement="right"
        titleId="evidence-extra-drawer-title"
        className="evidence-extra__drawer"
      >
        {open ? (
          <>
            <header className="evidence-extra__drawer-header">
              <div id="evidence-extra-drawer-title">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {open.question.question}
                </ReactMarkdown>
              </div>
              <IconButton label="Close" onClick={() => setOpen(null)}>
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </IconButton>
            </header>
            <div className="evidence-extra__drawer-body">
              {renderQuestion(open.question, open.kind)}
            </div>
            <footer className="evidence-extra__drawer-footer">
              <Button variant="primary" onClick={() => setOpen(null)}>
                Done
              </Button>
            </footer>
          </>
        ) : null}
      </Modal>
    </section>
  );
};
