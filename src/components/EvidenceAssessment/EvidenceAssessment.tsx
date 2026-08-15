import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBundledAssessmentModelYaml } from "../../defaults/assessmentModels";
import { Button, Card, Select, TextArea, TextField } from "../ui";
import { evidenceCriterionPolicy } from "../../assessment-engine/profile";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { newAssessmentId } from "../../assessment-engine/id";
import { secureCryptographyAvailable } from "../../assessment-engine/evidence";
import { assessmentSubjectIssues } from "../../assessment-engine/subject-validation";
import { parseEvidenceModel } from "./model";
import {
  fetchTextWithLimit,
  MAX_MODEL_YAML_BYTES,
} from "../../assessment-engine/fetch";
import {
  deleteEvidenceAssessment,
  listEvidenceAssessments,
  loadActiveEvidenceAssessment,
  saveEvidenceAssessment,
  selectEvidenceAssessment,
} from "./storage";
import {
  downloadAssessmentPackage,
  evidenceFromFile,
  maxAssessmentPackageFileBytes,
  newEvidenceAssessment,
  parseAssessmentPackage,
} from "./machine";
import { downloadEvidenceAssessmentPdf } from "./pdf";
import {
  calculateGatedMaturityScore,
  criterionHasEvidence,
  emptyCriterionProgress,
} from "../../assessment-engine/methodologies/cumulativeGates";
import type {
  EvidenceAssessmentRecord,
  EvidenceCriterionProgress,
  EvidenceCriterionStatus,
  AssessmentEvidenceFile,
  EvidenceModelData,
  EvidenceQuestionProgress,
} from "./types";
import { EvidenceAttachments } from "./EvidenceAttachments";
import { ApprovalPolicyCard } from "./ApprovalPolicyCard";
import "./EvidenceAssessment.module.scss";

interface Props {
  src: string | null;
  profile: AssessmentProfileData;
}

type EvidenceOwner = { kind: "criterion" | "question"; id: string };
const compatibleRecord = (
  record: EvidenceAssessmentRecord | undefined,
  model: EvidenceModelData,
): record is EvidenceAssessmentRecord =>
  Boolean(
    record &&
    record.modelId === model.model.id &&
    record.dataVersion === model.model.version,
  );

export const EvidenceAssessment: React.FC<Props> = ({ src, profile }) => {
  const cryptographyAvailable = secureCryptographyAvailable();
  const [model, setModel] = useState<EvidenceModelData | null>(null);
  const [record, setRecord] = useState<EvidenceAssessmentRecord | null>(null);
  const [assessments, setAssessments] = useState<EvidenceAssessmentRecord[]>(
    [],
  );
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Loading assessment…");
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        const text = src
          ? await fetchTextWithLimit(
              src,
              "assessment model",
              MAX_MODEL_YAML_BYTES,
              controller.signal,
            )
          : getBundledAssessmentModelYaml(profile.profile.model.id);
        if (!text) {
          throw new Error(
            `No bundled model is available for ${profile.profile.model.id}; provide dataUrl.`,
          );
        }
        const parsed = parseEvidenceModel(text);
        if (
          profile.profile.model.id !== parsed.model.id ||
          profile.profile.model.version !== parsed.model.version
        ) {
          throw new Error(
            "The assessment profile does not match the loaded model.",
          );
        }
        if (cancelled) return;
        setModel(parsed);
        const [active, stored] = await Promise.all([
          loadActiveEvidenceAssessment(),
          listEvidenceAssessments(),
        ]);
        if (cancelled) return;
        const current = compatibleRecord(active, parsed)
          ? active
          : newEvidenceAssessment(parsed, profile);
        setRecord(current);
        setAssessments(
          compatibleRecord(active, parsed)
            ? stored.filter((item) => item.dataVersion === parsed.model.version)
            : [
                current,
                ...stored.filter(
                  (item) => item.dataVersion === parsed.model.version,
                ),
              ],
        );
        if (!compatibleRecord(active, parsed))
          await saveEvidenceAssessment(current);
        setStatusMessage("Saved locally in this browser");
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : String(caught));
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [profile, src]);

  useEffect(() => {
    if (!record) return;
    setStatusMessage("Saving locally…");
    const timeout = window.setTimeout(() => {
      void saveEvidenceAssessment(record).then(async () => {
        setAssessments(
          (await listEvidenceAssessments()).filter(
            (item) => item.dataVersion === record.dataVersion,
          ),
        );
        setStatusMessage("Saved locally in this browser");
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [record]);

  const score = useMemo(
    () =>
      model && profile && record
        ? calculateGatedMaturityScore(
            model,
            record,
            profile.runtime.methodology,
          )
        : null,
    [model, profile, record],
  );
  const criterionPolicy = profile ? evidenceCriterionPolicy(profile) : null;
  const level = model?.levels.find((item) => item.number === selectedLevel);

  const mutate = (
    updater: (current: EvidenceAssessmentRecord) => EvidenceAssessmentRecord,
  ) =>
    setRecord((current) =>
      current
        ? { ...updater(current), updatedAt: new Date().toISOString() }
        : current,
    );

  const updateSubjectField = (field: string, value: string) =>
    mutate((current) => ({
      ...current,
      subject: { ...current.subject, [field]: value },
    }));

  const updateCriterion = (
    id: string,
    update: Partial<EvidenceCriterionProgress>,
  ) =>
    mutate((current) => ({
      ...current,
      criterionProgress: {
        ...current.criterionProgress,
        [id]: {
          ...(current.criterionProgress[id] ?? emptyCriterionProgress()),
          ...update,
        },
      },
    }));

  const updateQuestion = (
    id: string,
    update: Partial<EvidenceQuestionProgress>,
  ) =>
    mutate((current) => {
      const progress = current.questionProgress[id] ?? {
        answer: "",
        evidenceIds: [],
      };
      return {
        ...current,
        questionProgress: {
          ...current.questionProgress,
          [id]: {
            ...progress,
            ...update,
          },
        },
      };
    });

  const addEvidence = async (owner: EvidenceOwner, files: FileList) => {
    if (!record) return;
    try {
      const added: AssessmentEvidenceFile[] = [];
      let packageFiles = [...record.evidenceFiles];
      for (const file of Array.from(files)) {
        const evidence = await evidenceFromFile(file, packageFiles, profile!);
        added.push(evidence);
        packageFiles = [...packageFiles, evidence];
      }
      const ids = added.map((file) => file.id);
      mutate((current) => {
        if (owner.kind === "criterion") {
          const progress =
            current.criterionProgress[owner.id] ?? emptyCriterionProgress();
          return {
            ...current,
            evidenceFiles: [...current.evidenceFiles, ...added],
            criterionProgress: {
              ...current.criterionProgress,
              [owner.id]: {
                ...progress,
                evidenceIds: [...progress.evidenceIds, ...ids],
              },
            },
          };
        }
        const progress = current.questionProgress[owner.id] ?? {
          answer: "",
          evidenceIds: [],
        };
        return {
          ...current,
          evidenceFiles: [...current.evidenceFiles, ...added],
          questionProgress: {
            ...current.questionProgress,
            [owner.id]: {
              ...progress,
              evidenceIds: [...progress.evidenceIds, ...ids],
            },
          },
        };
      });
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const removeEvidence = (owner: EvidenceOwner, evidenceId: string) =>
    mutate((current) => {
      const criterionProgress = { ...current.criterionProgress };
      const questionProgress = { ...current.questionProgress };
      if (owner.kind === "criterion" && criterionProgress[owner.id]) {
        criterionProgress[owner.id] = {
          ...criterionProgress[owner.id],
          evidenceIds: criterionProgress[owner.id].evidenceIds.filter(
            (id) => id !== evidenceId,
          ),
        };
      }
      if (owner.kind === "question" && questionProgress[owner.id]) {
        questionProgress[owner.id] = {
          ...questionProgress[owner.id],
          evidenceIds: questionProgress[owner.id].evidenceIds.filter(
            (id) => id !== evidenceId,
          ),
        };
      }
      const stillReferenced = [
        ...Object.values(criterionProgress).flatMap((item) => item.evidenceIds),
        ...Object.values(questionProgress).flatMap((item) => item.evidenceIds),
      ].includes(evidenceId);
      return {
        ...current,
        criterionProgress,
        questionProgress,
        evidenceFiles: stillReferenced
          ? current.evidenceFiles
          : current.evidenceFiles.filter((file) => file.id !== evidenceId),
      };
    });

  const createAssessment = async () => {
    if (!model || !profile) return;
    const created = newEvidenceAssessment(model, profile);
    await saveEvidenceAssessment(created);
    setRecord(created);
    setSelectedLevel(0);
  };

  const selectAssessment = async (id: string) => {
    const selected = assessments.find((item) => item.id === id);
    if (!selected) return;
    await selectEvidenceAssessment(id);
    setRecord(selected);
  };

  const deleteAssessment = async () => {
    if (!record || !model || !profile) return;
    if (!window.confirm(`Delete “${record.name}” from this browser?`)) return;
    await deleteEvidenceAssessment(record.id);
    const remaining = assessments.filter((item) => item.id !== record.id);
    const next = remaining[0] ?? newEvidenceAssessment(model, profile);
    await saveEvidenceAssessment(next);
    setRecord(next);
  };

  const importAssessment = async (file: File) => {
    if (!model || !profile) return;
    try {
      if (file.size > maxAssessmentPackageFileBytes(profile)) {
        throw new Error("The selected assessment package is too large.");
      }
      let imported = await parseAssessmentPackage(
        await file.text(),
        model,
        profile,
      );
      if (assessments.some((item) => item.id === imported.id)) {
        const now = new Date().toISOString();
        imported = {
          ...imported,
          id: newAssessmentId(),
          name: `${imported.name} (imported)`,
          createdAt: now,
          updatedAt: now,
        };
      }
      await saveEvidenceAssessment(imported);
      setRecord(imported);
      setSelectedLevel(0);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  if (error && (!model || !profile || !record)) {
    return (
      <div className="evidence-assessment-load-error" role="alert">
        {error}
      </div>
    );
  }
  if (!model || !profile || !record || !score || !level) {
    return (
      <div className="evidence-assessment-loading" role="status">
        {statusMessage}
      </div>
    );
  }

  const subjectIssues = assessmentSubjectIssues(profile, record.subject);
  const exportAvailable = cryptographyAvailable && subjectIssues.length === 0;

  return (
    <div className="evidence-assessment-assessment-container">
      <header className="evidence-assessment-header">
        <div>
          <span className="evidence-assessment-header__eyebrow">
            {model.model.name} {model.model.version}
          </span>
          <h2>{profile.profile.title}</h2>
          <p>{profile.profile.description}</p>
        </div>
        <div className="evidence-assessment-header__result" aria-live="polite">
          <span>
            {score.achievedLevel === null
              ? "No level established"
              : `Level ${score.achievedLevel}`}
          </span>
          <small>{statusMessage}</small>
        </div>
      </header>

      <div className="evidence-assessment-toolbar">
        <Select
          label="Saved assessment"
          value={record.id}
          onChange={(event) => void selectAssessment(event.target.value)}
        >
          {assessments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Button onClick={() => void createAssessment()}>New</Button>
        <Button variant="danger" onClick={() => void deleteAssessment()}>
          Delete
        </Button>
        <Button
          disabled={!exportAvailable}
          title={
            !cryptographyAvailable
              ? "Export requires HTTPS or localhost."
              : subjectIssues[0]
          }
          onClick={() =>
            void downloadAssessmentPackage(model, profile, record).catch(
              (caught) =>
                setError(
                  caught instanceof Error ? caught.message : String(caught),
                ),
            )
          }
        >
          Export JSON
        </Button>
        <Button onClick={() => importRef.current?.click()}>Import JSON</Button>
        <input
          ref={importRef}
          className="pkimm-visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label={`Import ${model.model.abbreviation} assessment JSON`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importAssessment(file);
            event.target.value = "";
          }}
        />
        <Button
          variant="primary"
          disabled={generatingPdf || !exportAvailable}
          title={
            !cryptographyAvailable
              ? "PDF generation requires HTTPS or localhost."
              : subjectIssues[0]
          }
          onClick={async () => {
            setGeneratingPdf(true);
            try {
              await downloadEvidenceAssessmentPdf(model, profile, record);
            } catch (caught) {
              setError(
                caught instanceof Error ? caught.message : String(caught),
              );
            } finally {
              setGeneratingPdf(false);
            }
          }}
        >
          {generatingPdf ? "Generating PDF…" : "Download PDF report"}
        </Button>
      </div>

      {error ? (
        <div className="evidence-assessment-inline-error" role="alert">
          {error}
        </div>
      ) : null}

      {!cryptographyAvailable ? (
        <div className="evidence-assessment-crypto-notice" role="status">
          This page is using an insecure HTTP connection. You can review and
          complete text fields, but evidence hashing, JSON export, and PDF
          generation require HTTPS or localhost.
        </div>
      ) : null}

      <main className="evidence-assessment-main">
        <Card
          as="section"
          padding="lg"
          className="evidence-assessment-scope-card"
        >
          <div className="evidence-assessment-section-heading">
            <div>
              <h3>Assessment scope</h3>
              <p>
                Identify one product or service, including the released version
                and deployment modes covered.
              </p>
            </div>
          </div>
          <div className="evidence-assessment-field-grid">
            {profile.runtime.subjectFields.map((field) => {
              const common = {
                key: field.key,
                label: field.label,
                required: field.required,
                hint: field.hint,
                value: record.subject[field.key] ?? "",
                onChange: (
                  event: React.ChangeEvent<
                    HTMLInputElement | HTMLTextAreaElement
                  >,
                ) => updateSubjectField(field.key, event.target.value),
              };
              return field.component === "textarea" ? (
                <TextArea {...common} rows={field.rows ?? 3} />
              ) : (
                <TextField
                  {...common}
                  type={field.component === "date" ? "date" : "text"}
                />
              );
            })}
          </div>
          {subjectIssues.length > 0 ? (
            <div role="alert">
              {subjectIssues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          ) : null}
        </Card>

        <ApprovalPolicyCard
          profile={profile}
          assuranceProfileId={record.assuranceProfileId}
        />

        <Card
          as="section"
          padding="lg"
          className="evidence-assessment-score-card"
        >
          <div className="evidence-assessment-score-card__level">
            <strong>
              {score.achievedLevel === null
                ? "No level"
                : `Claimed Level ${score.achievedLevel}`}
            </strong>
            <span>
              {score.achievedLevel === null
                ? "Not yet established"
                : "Highest fully met cumulative level"}
            </span>
          </div>
          <dl>
            <div>
              <dt>Criteria marked Met</dt>
              <dd>
                {score.criteriaMet}/{score.criteriaTotal}
              </dd>
            </div>
            <div>
              <dt>Questions answered</dt>
              <dd>
                {score.questionsAnswered}/{score.questionsTotal}
              </dd>
            </div>
            <div>
              <dt>Evidence files</dt>
              <dd>{score.evidenceFiles}</dd>
            </div>
          </dl>
          <p>{model.scoring.rule}</p>
        </Card>

        <nav
          className="evidence-assessment-level-tabs"
          aria-label={`${model.model.abbreviation} maturity levels`}
        >
          {model.levels.map((item) => {
            const result = score.levelResults.find(
              (entry) => entry.level === item.number,
            );
            return (
              <button
                key={item.number}
                type="button"
                className={selectedLevel === item.number ? "active" : ""}
                aria-current={
                  selectedLevel === item.number ? "page" : undefined
                }
                onClick={() => setSelectedLevel(item.number)}
              >
                <span>Level {item.number}</span>
                <small>
                  {item.name}
                  {result?.met ? " · met" : ""}
                </small>
              </button>
            );
          })}
        </nav>

        <section
          className="evidence-assessment-level-panel"
          aria-labelledby={`evidence-assessment-level-${level.number}`}
        >
          <div className="evidence-assessment-level-panel__heading">
            <div>
              <span>Level {level.number}</span>
              <h3 id={`evidence-assessment-level-${level.number}`}>
                {level.name}
              </h3>
              <p>{level.summary}</p>
            </div>
            <a
              href={level.sourcePage}
              target="_blank"
              rel="noopener noreferrer"
            >
              View approved model text
            </a>
          </div>

          <div className="evidence-assessment-model-copy">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {level.criteria.introduction}
            </ReactMarkdown>
          </div>
          <div className="evidence-assessment-criterion-list">
            {level.criteria.items.map((criterion) => {
              const progress =
                record.criterionProgress[criterion.id] ??
                emptyCriterionProgress();
              const missingEvidence =
                level.number > 0 &&
                progress.status === "met" &&
                !criterionHasEvidence(progress, record.evidenceFiles);
              return (
                <Card
                  key={criterion.id}
                  as="article"
                  padding="lg"
                  className={`evidence-assessment-criterion evidence-assessment-status-${progress.status}`}
                >
                  <div className="evidence-assessment-item-title">
                    <span>{criterion.id}</span>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {criterion.text}
                    </ReactMarkdown>
                  </div>
                  <fieldset className="evidence-assessment-status-options">
                    <legend>Criterion status</legend>
                    {criterionPolicy?.statuses.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name={`status-${criterion.id}`}
                          value={option.value}
                          checked={progress.status === option.value}
                          onChange={() =>
                            updateCriterion(criterion.id, {
                              status: option.value as EvidenceCriterionStatus,
                            })
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </fieldset>
                  {level.number > 0 ? (
                    <>
                      <TextArea
                        label={
                          criterionPolicy?.evidence.statementLabel ?? "Evidence"
                        }
                        hint={criterionPolicy?.evidence.statementHint}
                        rows={3}
                        value={progress.evidenceStatement}
                        onChange={(event) =>
                          updateCriterion(criterion.id, {
                            evidenceStatement: event.target.value,
                          })
                        }
                      />
                      {missingEvidence ? (
                        <p
                          className="evidence-assessment-evidence-required"
                          role="status"
                        >
                          This criterion cannot establish the level until
                          evidence is provided.
                        </p>
                      ) : null}
                      <EvidenceAttachments
                        ownerLabel={`criterion ${criterion.id}`}
                        evidenceIds={progress.evidenceIds}
                        evidenceFiles={record.evidenceFiles}
                        onAdd={(files) =>
                          addEvidence(
                            { kind: "criterion", id: criterion.id },
                            files,
                          )
                        }
                        onRemove={(id) =>
                          removeEvidence(
                            { kind: "criterion", id: criterion.id },
                            id,
                          )
                        }
                      />
                    </>
                  ) : (
                    <p className="evidence-assessment-level-zero-note">
                      Level 0 is self-declared. Evidence is not required, but
                      both Level 0 criteria must be marked Met to establish it.
                    </p>
                  )}
                  <TextArea
                    label="Notes and gaps"
                    rows={2}
                    value={progress.notes}
                    onChange={(event) =>
                      updateCriterion(criterion.id, {
                        notes: event.target.value,
                      })
                    }
                  />
                </Card>
              );
            })}
          </div>

          {level.assessment.methodology ? (
            <details className="evidence-assessment-methodology">
              <summary>Assessment methodology record</summary>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {level.assessment.methodology}
              </ReactMarkdown>
            </details>
          ) : null}

          <div className="evidence-assessment-question-groups">
            {level.assessment.groups.map((group) => (
              <section key={group.id}>
                <h4>{group.name}</h4>
                {group.introduction ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {group.introduction}
                  </ReactMarkdown>
                ) : null}
                {group.questions.map((question) => {
                  const progress = record.questionProgress[question.id] ?? {
                    answer: "",
                    evidenceIds: [],
                  };
                  return (
                    <Card
                      key={question.id}
                      as="article"
                      padding="lg"
                      className="evidence-assessment-question"
                    >
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
                      {question.expectedInput ? (
                        <p>
                          <strong>Expected input:</strong>{" "}
                          {question.expectedInput}
                        </p>
                      ) : null}
                      {question.purpose ? (
                        <p>
                          <strong>Purpose:</strong> {question.purpose}
                        </p>
                      ) : null}
                      <TextArea
                        label="Response and evidence references"
                        rows={4}
                        value={progress.answer}
                        onChange={(event) =>
                          updateQuestion(question.id, {
                            answer: event.target.value,
                          })
                        }
                      />
                      <EvidenceAttachments
                        ownerLabel={`question ${question.id}`}
                        evidenceIds={progress.evidenceIds}
                        evidenceFiles={record.evidenceFiles}
                        onAdd={(files) =>
                          addEvidence(
                            { kind: "question", id: question.id },
                            files,
                          )
                        }
                        onRemove={(id) =>
                          removeEvidence(
                            { kind: "question", id: question.id },
                            id,
                          )
                        }
                      />
                    </Card>
                  );
                })}
              </section>
            ))}
          </div>

          {level.evidenceChecklist.items.length > 0 ? (
            <Card
              as="section"
              padding="lg"
              className="evidence-assessment-checklist"
            >
              <h4>Evidence checklist</h4>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {level.evidenceChecklist.introduction}
              </ReactMarkdown>
              <ul>
                {level.evidenceChecklist.items.map((item) => (
                  <li key={item.id}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item.text}
                    </ReactMarkdown>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </section>
      </main>
    </div>
  );
};
