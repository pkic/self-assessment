import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faLink } from "@fortawesome/free-solid-svg-icons";
import type { Workspace } from "../../types/types";
import { newId } from "../../utils/storage";
import {
  addArtifact,
  updateArtifact,
  removeArtifact,
  addPoc,
  updatePoc,
  removePoc,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  updateChecklistItem,
  addIntakeItem,
  updateIntakeItem,
  removeIntakeItem,
  setWorkingNotes,
  loadSuggestedIntake,
  loadSuggestedChecklist,
} from "../../utils/workspace";
import {
  Button,
  Card,
  Checkbox,
  IconButton,
  Select,
  TextArea,
  TextField,
} from "../ui";
import { WorkspaceRecord } from "./WorkspaceRecord";
import "./Workspace.module.scss";

export interface WorkspaceViewProps {
  workspace: Workspace | undefined;
  requirementChoices: { key: string; label: string; assessed: boolean }[];
  onWorkspaceChange: (next: Workspace) => void;
  onRescueOrphan: (originalKey: string, targetKey: string) => void;
  onDiscardOrphan: (originalKey: string) => void;
}

interface OrphanRowProps {
  entry: NonNullable<Workspace["orphanedEntries"]>[number];
  choices: { key: string; label: string; assessed: boolean }[];
  onRescue: (originalKey: string, targetKey: string) => void;
  onDiscard: (originalKey: string) => void;
}

const OrphanRow: React.FC<OrphanRowProps> = ({
  entry,
  choices,
  onRescue,
  onDiscard,
}) => {
  const [target, setTarget] = useState(choices[0]?.key ?? "");
  const label = entry.requirementName ?? entry.originalKey;

  const handleRescue = () => {
    if (!target) return;
    const choice = choices.find((c) => c.key === target);
    if (choice?.assessed) {
      const confirmed = window.confirm(
        "This requirement already has an assessment — overwrite it?",
      );
      if (!confirmed) return;
    }
    onRescue(entry.originalKey, target);
  };

  return (
    <div className="pkimm-workspace__orphan-row">
      <span className="pkimm-workspace__orphan-label">{label}</span>
      <Select
        label={`Rescue target for ${label}`}
        hideLabel
        fieldClassName="pkimm-workspace__orphan-target-field"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      >
        {choices.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
            {c.assessed ? " (already assessed)" : ""}
          </option>
        ))}
      </Select>
      <Button onClick={handleRescue}>Rescue</Button>
      <Button variant="danger" onClick={() => onDiscard(entry.originalKey)}>
        Discard
      </Button>
    </div>
  );
};

const toggleSet = (set: Set<string>, key: string): Set<string> => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  workspace,
  requirementChoices,
  onWorkspaceChange,
  onRescueOrphan,
  onDiscardOrphan,
}) => {
  const ws = workspace;
  const artifacts = ws?.artifacts ?? [];
  const pocs = ws?.pocs ?? [];
  const checklist = ws?.checklist ?? [];
  const intake = ws?.intake ?? [];
  const orphanedEntries = ws?.orphanedEntries ?? [];
  const doneCount = checklist.filter((c) => c.done).length;

  const rootRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pendingFocusKey, setPendingFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocusKey) return;
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-record-id="${pendingFocusKey}"] input, [data-record-id="${pendingFocusKey}"] textarea`,
    );
    el?.focus();
    setPendingFocusKey(null);
  }, [pendingFocusKey]);

  const toggle = (key: string) => setExpanded((prev) => toggleSet(prev, key));
  const openNew = (key: string) => {
    setExpanded((prev) => new Set(prev).add(key));
    setPendingFocusKey(key);
  };

  const addIntake = () => {
    const questionId = newId();
    onWorkspaceChange(
      addIntakeItem(ws, { questionId, question: "", answer: "" }),
    );
    openNew(`intake:${questionId}`);
  };
  const addArtifactRecord = () => {
    const id = newId();
    onWorkspaceChange(addArtifact(ws, { id, title: "", locator: "" }));
    openNew(`artifact:${id}`);
  };
  const addPocRecord = () => {
    const id = newId();
    onWorkspaceChange(addPoc(ws, { id, name: "" }));
    openNew(`poc:${id}`);
  };

  return (
    <div className="pkimm-workspace" ref={rootRef}>
      <p className="pkimm-workspace__intro">
        The Workspace is your planning and execution area for the assessment. It{" "}
        <strong>never affects the maturity score</strong>. Some sections feed
        into the assessment — points of contact and artifacts can be attached to
        individual requirements under &ldquo;Workspace links&rdquo;, and an
        assigned contact and interview date are recorded per requirement. The
        rest is context you keep for yourself.
      </p>

      <Card
        as="section"
        aria-labelledby="ws-intake"
        padding="md"
        className="pkimm-workspace__section"
      >
        <h3 id="ws-intake">Intake</h3>
        <span className="pkimm-workspace__count">
          {intake.length} {intake.length === 1 ? "question" : "questions"}
        </span>
        <p className="pkimm-workspace__hint">
          Scope the organizational and operational context — it helps estimate
          effort and timeline. Assessment-level; not linked to individual
          requirements.
        </p>
        {intake.map((i) => {
          const key = `intake:${i.questionId}`;
          const summary = i.question.trim();
          return (
            <WorkspaceRecord
              key={i.questionId}
              recordKey={key}
              open={expanded.has(key)}
              onToggle={() => toggle(key)}
              summary={summary || "Untitled question"}
              muted={!summary}
              onRemove={() =>
                onWorkspaceChange(removeIntakeItem(ws, i.questionId))
              }
              removeLabel={`Remove ${summary || "untitled question"}`}
            >
              <TextField
                label="Question"
                placeholder="e.g. How many CAs are in scope?"
                hint="The context you need to scope effort and timeline."
                value={i.question}
                onChange={(e) =>
                  onWorkspaceChange(
                    updateIntakeItem(ws, i.questionId, {
                      question: e.target.value,
                    }),
                  )
                }
              />
              <TextArea
                label="Answer"
                autoGrow
                placeholder="e.g. 3 root CAs, 6 issuing CAs"
                hint="Your finding or note."
                value={i.answer}
                onChange={(e) =>
                  onWorkspaceChange(
                    updateIntakeItem(ws, i.questionId, {
                      answer: e.target.value,
                    }),
                  )
                }
              />
            </WorkspaceRecord>
          );
        })}
        <div className="pkimm-workspace__actions">
          <Button
            variant="primary"
            leftIcon={<FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
            onClick={addIntake}
          >
            Add question
          </Button>
          <Button
            variant="secondary"
            onClick={() => onWorkspaceChange(loadSuggestedIntake(ws, newId))}
          >
            Load suggested questions
          </Button>
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="ws-notes"
        padding="md"
        className="pkimm-workspace__section"
      >
        <h3 id="ws-notes">Working notes</h3>
        <p className="pkimm-workspace__hint">
          Free-form notes as you work. Assessment-level.
        </p>
        <TextArea
          aria-label="Working notes"
          autoGrow
          rows={6}
          placeholder="e.g. observations, open questions, decisions made while assessing"
          value={ws?.workingNotes ?? ""}
          onChange={(e) =>
            onWorkspaceChange(setWorkingNotes(ws, e.target.value))
          }
        />
      </Card>

      <Card
        as="section"
        aria-labelledby="ws-artifacts"
        padding="md"
        className="pkimm-workspace__section"
      >
        <h3 id="ws-artifacts">Artifacts</h3>
        <span className="pkimm-workspace__count">
          {artifacts.length} {artifacts.length === 1 ? "artifact" : "artifacts"}
        </span>
        <p className="pkimm-workspace__hint">
          Documents you reviewed as evidence — often reused across requirements.
        </p>
        <p className="pkimm-workspace__link-note">
          <FontAwesomeIcon icon={faLink} aria-hidden="true" /> Attach an
          artifact to any requirement under &ldquo;Workspace links&rdquo; on its
          card.
        </p>
        {artifacts.map((a) => {
          const key = `artifact:${a.id}`;
          const summary = a.title.trim();
          return (
            <WorkspaceRecord
              key={a.id}
              recordKey={key}
              open={expanded.has(key)}
              onToggle={() => toggle(key)}
              summary={summary || "Untitled artifact"}
              secondary={a.locator || undefined}
              muted={!summary}
              onRemove={() => onWorkspaceChange(removeArtifact(ws, a.id))}
              removeLabel={`Remove ${summary || "untitled artifact"}`}
            >
              <TextField
                label="Title"
                placeholder="e.g. Certificate Policy v2.1"
                hint="The document's name."
                value={a.title}
                onChange={(e) =>
                  onWorkspaceChange(
                    updateArtifact(ws, a.id, { title: e.target.value }),
                  )
                }
              />
              <TextField
                label="Locator"
                placeholder="e.g. URL, path, or system"
                hint="Where to find it."
                value={a.locator}
                onChange={(e) =>
                  onWorkspaceChange(
                    updateArtifact(ws, a.id, { locator: e.target.value }),
                  )
                }
              />
              <TextArea
                label="Notes"
                autoGrow
                placeholder="e.g. Covers key-ceremony procedures"
                hint="What it covers or why it's relevant."
                value={a.notes ?? ""}
                onChange={(e) =>
                  onWorkspaceChange(
                    updateArtifact(ws, a.id, { notes: e.target.value }),
                  )
                }
              />
            </WorkspaceRecord>
          );
        })}
        <div className="pkimm-workspace__actions">
          <Button
            variant="primary"
            leftIcon={<FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
            onClick={addArtifactRecord}
          >
            Add artifact
          </Button>
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="ws-pocs"
        padding="md"
        className="pkimm-workspace__section"
      >
        <h3 id="ws-pocs">Points of contact</h3>
        <span className="pkimm-workspace__count">
          {pocs.length} {pocs.length === 1 ? "contact" : "contacts"}
        </span>
        <p className="pkimm-workspace__hint">
          People to interview or ask for evidence.
        </p>
        <p className="pkimm-workspace__link-note">
          <FontAwesomeIcon icon={faLink} aria-hidden="true" /> Assign a contact
          to a requirement under &ldquo;Workspace links&rdquo;.
        </p>
        {pocs.map((p) => {
          const key = `poc:${p.id}`;
          const summary = p.name.trim();
          return (
            <WorkspaceRecord
              key={p.id}
              recordKey={key}
              open={expanded.has(key)}
              onToggle={() => toggle(key)}
              summary={summary || "Untitled contact"}
              secondary={p.role || undefined}
              muted={!summary}
              onRemove={() => onWorkspaceChange(removePoc(ws, p.id))}
              removeLabel={`Remove ${summary || "untitled contact"}`}
            >
              <TextField
                label="Name"
                placeholder="e.g. Jane Smith"
                hint="Who to contact."
                value={p.name}
                onChange={(e) =>
                  onWorkspaceChange(
                    updatePoc(ws, p.id, { name: e.target.value }),
                  )
                }
              />
              <TextField
                label="Role"
                placeholder="e.g. PKI operations lead"
                hint="Their responsibility for the PKI."
                value={p.role ?? ""}
                onChange={(e) =>
                  onWorkspaceChange(
                    updatePoc(ws, p.id, { role: e.target.value }),
                  )
                }
              />
              <TextField
                label="Contact"
                placeholder="e.g. jane@acme.com"
                hint="Email, Slack, or phone."
                value={p.contact ?? ""}
                onChange={(e) =>
                  onWorkspaceChange(
                    updatePoc(ws, p.id, { contact: e.target.value }),
                  )
                }
              />
            </WorkspaceRecord>
          );
        })}
        <div className="pkimm-workspace__actions">
          <Button
            variant="primary"
            leftIcon={<FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
            onClick={addPocRecord}
          >
            Add contact
          </Button>
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="ws-checklist"
        padding="md"
        className="pkimm-workspace__section"
      >
        <h3 id="ws-checklist">Checklist</h3>
        <p className="pkimm-workspace__hint">
          Track your process and implementation-path tasks. Assessment-level.
        </p>
        <span aria-live="polite" className="pkimm-workspace__checklist-count">
          {doneCount} of {checklist.length} done
        </span>
        <div className="pkimm-workspace__tasks">
          {checklist.map((c) => (
            <div key={c.itemId} className="pkimm-workspace__task">
              <Checkbox
                label={c.label || `Checklist item ${c.itemId}`}
                checked={c.done}
                onChange={() =>
                  onWorkspaceChange(toggleChecklistItem(ws, c.itemId))
                }
              />
              <TextField
                label={`Edit ${c.label.trim() || "checklist item"}`}
                hideLabel
                placeholder="e.g. collect CP/CPS documents"
                className={
                  c.done ? "pkimm-workspace__task-label--done" : undefined
                }
                value={c.label}
                onChange={(e) =>
                  onWorkspaceChange(
                    updateChecklistItem(ws, c.itemId, {
                      label: e.target.value,
                    }),
                  )
                }
              />
              <IconButton
                label={`Remove ${c.label.trim() || "checklist item"}`}
                variant="danger"
                size="sm"
                onClick={() =>
                  onWorkspaceChange(removeChecklistItem(ws, c.itemId))
                }
              >
                <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
              </IconButton>
            </div>
          ))}
        </div>
        <div className="pkimm-workspace__actions">
          <Button
            variant="primary"
            leftIcon={<FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
            onClick={() =>
              onWorkspaceChange(
                addChecklistItem(ws, { itemId: newId(), label: "" }),
              )
            }
          >
            Add task
          </Button>
          <Button
            variant="secondary"
            onClick={() => onWorkspaceChange(loadSuggestedChecklist(ws, newId))}
          >
            Load suggested tasks
          </Button>
        </div>
      </Card>

      {orphanedEntries.length > 0 && (
        <Card
          as="section"
          aria-labelledby="ws-orphaned"
          padding="md"
          className="pkimm-workspace__section"
        >
          <h3 id="ws-orphaned">Orphaned entries</h3>
          <p className="pkimm-workspace__hint">
            Ratings a migration couldn&apos;t map to a current requirement —
            re-home or discard them.
          </p>
          {orphanedEntries.map((e) => (
            <OrphanRow
              key={e.originalKey}
              entry={e}
              choices={requirementChoices}
              onRescue={onRescueOrphan}
              onDiscard={onDiscardOrphan}
            />
          ))}
        </Card>
      )}
    </div>
  );
};
