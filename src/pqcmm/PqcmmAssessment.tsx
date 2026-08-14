import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BUNDLED_PQCMM_MODEL_YAML } from "../defaults/pqcmmBundledData";
import { Button, Card, Select, TextArea, TextField } from "../components/ui";
import { parsePqcmmModel } from "./model";
import {
  deletePqcmmAssessment,
  listPqcmmAssessments,
  loadActivePqcmmAssessment,
  savePqcmmAssessment,
  selectPqcmmAssessment,
} from "./storage";
import {
  downloadPqcmmAssessment,
  evidenceFromFile,
  newPqcmmAssessment,
  parsePqcmmMachineAssessment,
} from "./machine";
import { downloadPqcmmPdf } from "./pdf";
import {
  calculatePqcmmScore,
  criterionHasEvidence,
  emptyCriterionProgress,
} from "./scoring";
import type {
  PqcmmAssessmentRecord,
  PqcmmCriterionProgress,
  PqcmmCriterionStatus,
  PqcmmEvidenceFile,
  PqcmmModelData,
  PqcmmQuestionProgress,
} from "./types";
import { EvidenceAttachments } from "./EvidenceAttachments";
import "./PqcmmAssessment.module.scss";

interface Props {
  src: string | null;
}

type EvidenceOwner = { kind: "criterion" | "question"; id: string };
const STATUS_OPTIONS: { value: PqcmmCriterionStatus; label: string }[] = [
  { value: "not-assessed", label: "Not assessed" },
  { value: "met", label: "Met" },
  { value: "partial", label: "Partial" },
  { value: "not-met", label: "Not met" },
];

const compatibleRecord = (
  record: PqcmmAssessmentRecord | undefined,
  model: PqcmmModelData,
): record is PqcmmAssessmentRecord =>
  Boolean(record && record.dataVersion === model.model.version);

export const PqcmmAssessment: React.FC<Props> = ({ src }) => {
  const [model, setModel] = useState<PqcmmModelData | null>(null);
  const [record, setRecord] = useState<PqcmmAssessmentRecord | null>(null);
  const [assessments, setAssessments] = useState<PqcmmAssessmentRecord[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Loading PQCMM…");
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const text = src
          ? await fetch(src).then((response) => {
              if (!response.ok)
                throw new Error(
                  `Unable to load PQCMM data (${response.status}).`,
                );
              return response.text();
            })
          : BUNDLED_PQCMM_MODEL_YAML;
        const parsed = parsePqcmmModel(text);
        if (cancelled) return;
        setModel(parsed);
        const [active, stored] = await Promise.all([
          loadActivePqcmmAssessment(),
          listPqcmmAssessments(),
        ]);
        if (cancelled) return;
        const current = compatibleRecord(active, parsed)
          ? active
          : newPqcmmAssessment(parsed);
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
          await savePqcmmAssessment(current);
        setStatusMessage("Saved locally in this browser");
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : String(caught));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!record) return;
    setStatusMessage("Saving locally…");
    const timeout = window.setTimeout(() => {
      void savePqcmmAssessment(record).then(async () => {
        setAssessments(
          (await listPqcmmAssessments()).filter(
            (item) => item.dataVersion === record.dataVersion,
          ),
        );
        setStatusMessage("Saved locally in this browser");
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [record]);

  const score = useMemo(
    () => (model && record ? calculatePqcmmScore(model, record) : null),
    [model, record],
  );
  const level = model?.levels.find((item) => item.number === selectedLevel);

  const mutate = (
    updater: (current: PqcmmAssessmentRecord) => PqcmmAssessmentRecord,
  ) =>
    setRecord((current) =>
      current
        ? { ...updater(current), updatedAt: new Date().toISOString() }
        : current,
    );

  const updateField = <K extends keyof PqcmmAssessmentRecord>(
    field: K,
    value: PqcmmAssessmentRecord[K],
  ) => mutate((current) => ({ ...current, [field]: value }));

  const updateCriterion = (
    id: string,
    update: Partial<PqcmmCriterionProgress>,
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

  const updateQuestion = (id: string, update: Partial<PqcmmQuestionProgress>) =>
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
      const added: PqcmmEvidenceFile[] = [];
      let packageFiles = [...record.evidenceFiles];
      for (const file of Array.from(files)) {
        const evidence = await evidenceFromFile(file, packageFiles);
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
    if (!model) return;
    const created = newPqcmmAssessment(model);
    await savePqcmmAssessment(created);
    setRecord(created);
    setSelectedLevel(0);
  };

  const selectAssessment = async (id: string) => {
    const selected = assessments.find((item) => item.id === id);
    if (!selected) return;
    await selectPqcmmAssessment(id);
    setRecord(selected);
  };

  const deleteAssessment = async () => {
    if (!record || !model) return;
    if (!window.confirm(`Delete “${record.name}” from this browser?`)) return;
    await deletePqcmmAssessment(record.id);
    const remaining = assessments.filter((item) => item.id !== record.id);
    const next = remaining[0] ?? newPqcmmAssessment(model);
    await savePqcmmAssessment(next);
    setRecord(next);
  };

  const importAssessment = async (file: File) => {
    if (!model) return;
    try {
      let imported = await parsePqcmmMachineAssessment(
        await file.text(),
        model,
      );
      if (assessments.some((item) => item.id === imported.id)) {
        const now = new Date().toISOString();
        imported = {
          ...imported,
          id: crypto.randomUUID(),
          name: `${imported.name} (imported)`,
          createdAt: now,
          updatedAt: now,
        };
      }
      await savePqcmmAssessment(imported);
      setRecord(imported);
      setSelectedLevel(0);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  if (error && !model) {
    return (
      <div className="pqcmm-load-error" role="alert">
        {error}
      </div>
    );
  }
  if (!model || !record || !score || !level) {
    return (
      <div className="pqcmm-loading" role="status">
        {statusMessage}
      </div>
    );
  }

  return (
    <div className="pqcmm-assessment-container">
      <header className="pqcmm-header">
        <div>
          <span className="pqcmm-header__eyebrow">
            PQC Maturity Model {model.model.version}
          </span>
          <h2>PQCMM Assessment</h2>
          <p>
            Product and service evidence assessment. Data never leaves this
            browser.
          </p>
        </div>
        <div className="pqcmm-header__result" aria-live="polite">
          <span>
            {score.achievedLevel === null
              ? "No level established"
              : `Level ${score.achievedLevel}`}
          </span>
          <small>{statusMessage}</small>
        </div>
      </header>

      <div className="pqcmm-toolbar">
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
        <Button onClick={() => downloadPqcmmAssessment(model, record)}>
          Export JSON
        </Button>
        <Button onClick={() => importRef.current?.click()}>Import JSON</Button>
        <input
          ref={importRef}
          className="pkimm-visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Import PQCMM assessment JSON"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importAssessment(file);
            event.target.value = "";
          }}
        />
        <Button
          variant="primary"
          disabled={generatingPdf}
          onClick={async () => {
            setGeneratingPdf(true);
            try {
              await downloadPqcmmPdf(model, record);
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
        <div className="pqcmm-inline-error" role="alert">
          {error}
        </div>
      ) : null}

      <main className="pqcmm-main">
        <Card as="section" padding="lg" className="pqcmm-scope-card">
          <div className="pqcmm-section-heading">
            <div>
              <h3>Assessment scope</h3>
              <p>
                Identify one product or service, including the released version
                and deployment modes covered.
              </p>
            </div>
          </div>
          <div className="pqcmm-field-grid">
            <TextField
              label="Assessment name"
              value={record.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
            <TextField
              label="Product or service"
              required
              value={record.productName}
              onChange={(event) =>
                updateField("productName", event.target.value)
              }
            />
            <TextField
              label="Product version or release"
              required
              value={record.productVersion}
              onChange={(event) =>
                updateField("productVersion", event.target.value)
              }
            />
            <TextField
              label="Vendor"
              value={record.vendorName}
              onChange={(event) =>
                updateField("vendorName", event.target.value)
              }
            />
            <TextArea
              label="Deployment scope and configurations"
              rows={3}
              value={record.deploymentScope}
              onChange={(event) =>
                updateField("deploymentScope", event.target.value)
              }
            />
            <Select
              label="Assurance method"
              value={record.assessmentType}
              onChange={(event) =>
                updateField(
                  "assessmentType",
                  event.target.value as PqcmmAssessmentRecord["assessmentType"],
                )
              }
            >
              <option value="self">Self-assessment</option>
              <option value="third-party">Third-party assessment</option>
            </Select>
            <TextField
              label="Assessor name"
              value={record.assessorName}
              onChange={(event) =>
                updateField("assessorName", event.target.value)
              }
            />
            <TextField
              label="Assessor organization"
              value={record.assessorOrganization}
              onChange={(event) =>
                updateField("assessorOrganization", event.target.value)
              }
            />
            <TextField
              label="Assessment date"
              type="date"
              value={record.assessmentDate}
              onChange={(event) =>
                updateField("assessmentDate", event.target.value)
              }
            />
          </div>
        </Card>

        <Card as="section" padding="lg" className="pqcmm-score-card">
          <div className="pqcmm-score-card__level">
            <strong>
              {score.achievedLevel === null
                ? "No level"
                : `Level ${score.achievedLevel}`}
            </strong>
            <span>
              {score.achievedLevel === null
                ? "Not yet established"
                : "Highest fully met cumulative level"}
            </span>
          </div>
          <dl>
            <div>
              <dt>Criteria supported</dt>
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

        <nav className="pqcmm-level-tabs" aria-label="PQCMM maturity levels">
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
          className="pqcmm-level-panel"
          aria-labelledby={`pqcmm-level-${level.number}`}
        >
          <div className="pqcmm-level-panel__heading">
            <div>
              <span>Level {level.number}</span>
              <h3 id={`pqcmm-level-${level.number}`}>{level.name}</h3>
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

          <div className="pqcmm-model-copy">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {level.criteria.introduction}
            </ReactMarkdown>
          </div>
          <div className="pqcmm-criterion-list">
            {level.criteria.items.map((criterion) => {
              const progress =
                record.criterionProgress[criterion.id] ??
                emptyCriterionProgress();
              const missingEvidence =
                level.number > 0 &&
                progress.status === "met" &&
                !criterionHasEvidence(progress);
              return (
                <Card
                  key={criterion.id}
                  as="article"
                  padding="lg"
                  className={`pqcmm-criterion pqcmm-status-${progress.status}`}
                >
                  <div className="pqcmm-item-title">
                    <span>{criterion.id}</span>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {criterion.text}
                    </ReactMarkdown>
                  </div>
                  <fieldset className="pqcmm-status-options">
                    <legend>Criterion status</legend>
                    {STATUS_OPTIONS.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name={`status-${criterion.id}`}
                          value={option.value}
                          checked={progress.status === option.value}
                          onChange={() =>
                            updateCriterion(criterion.id, {
                              status: option.value,
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
                        label="Evidence statement or references"
                        hint="Required when marked Met. Cite URLs, document references, test results, and the assessed product version."
                        rows={3}
                        value={progress.evidenceStatement}
                        onChange={(event) =>
                          updateCriterion(criterion.id, {
                            evidenceStatement: event.target.value,
                          })
                        }
                      />
                      {missingEvidence ? (
                        <p className="pqcmm-evidence-required" role="status">
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
                    <p className="pqcmm-level-zero-note">
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
            <details className="pqcmm-methodology">
              <summary>Assessment methodology record</summary>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {level.assessment.methodology}
              </ReactMarkdown>
            </details>
          ) : null}

          <div className="pqcmm-question-groups">
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
                      className="pqcmm-question"
                    >
                      <div className="pqcmm-item-title">
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
            <Card as="section" padding="lg" className="pqcmm-checklist">
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
