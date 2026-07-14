import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faChevronRight,
  faPlus,
  faTrash,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import type { ActionPlans, CategoryData } from "../../types/types";
import type { ActionPlanEntry } from "../../utils/actionPlans";
import { calculateEffectiveCategoryLevel } from "../../utils/effectiveLevel";
import { buildGapToNextLevel, type GapToNextRow } from "../../utils/reportData";
import LevelResult from "../../enums/LevelResult";
import {
  Button,
  Card,
  Checkbox,
  IconButton,
  LevelBadge,
  Select,
  TextArea,
  TextField,
} from "../ui";
import "./ActionPlans.module.scss";

export interface ActionPlansViewProps {
  actionPlans: ActionPlans | undefined;
  pocs: { id: string; name: string; role?: string }[];
  onAddPlan: (categoryKey: string, targetLevel: number) => void;
  onUpdatePlanField: <K extends keyof ActionPlanEntry>(
    categoryKey: string,
    field: K,
    value: ActionPlanEntry[K],
  ) => void;
  onRemovePlan: (categoryKey: string) => void;
  onAddListItem: (categoryKey: string, field: "objectives" | "outputs") => void;
  onUpdateListItem: (
    categoryKey: string,
    field: "objectives" | "outputs",
    id: string,
    text: string,
  ) => void;
  onRemoveListItem: (
    categoryKey: string,
    field: "objectives" | "outputs",
    id: string,
  ) => void;
  onAddTask: (categoryKey: string) => void;
  onToggleTask: (categoryKey: string, itemId: string) => void;
  onUpdateTaskLabel: (
    categoryKey: string,
    itemId: string,
    label: string,
  ) => void;
  onRemoveTask: (categoryKey: string, itemId: string) => void;
}

const LIST_COPY: Record<
  "objectives" | "outputs",
  {
    title: string;
    label: string;
    placeholder: string;
    hint: string;
    addLabel: string;
  }
> = {
  objectives: {
    title: "Objectives",
    label: "Objective",
    placeholder: "Formalize key lifecycle with documented ceremonies",
    hint: "A concrete outcome at the target level — add one per objective.",
    addLabel: "Add objective",
  },
  outputs: {
    title: "Outputs",
    label: "Output",
    placeholder: "A key-ceremony runbook",
    hint: "A deliverable this plan produces — add one per output.",
    addLabel: "Add output",
  },
};

interface PlanListProps {
  field: "objectives" | "outputs";
  items: { id: string; text: string }[];
  categoryName: string;
  onAdd: () => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

const PlanList: React.FC<PlanListProps> = ({
  field,
  items,
  categoryName,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const copy = LIST_COPY[field];
  return (
    <div className="pkimm-action-plans__list-section">
      <span className="pkimm-action-plans__list-title">{copy.title}</span>
      <span className="pkimm-action-plans__list-hint">{copy.hint}</span>
      {items.map((item, idx) => (
        <div key={item.id} className="pkimm-action-plans__list-row">
          <TextField
            label={`${copy.label} ${idx + 1} for ${categoryName}`}
            hideLabel
            placeholder={copy.placeholder}
            value={item.text}
            onChange={(e) => onUpdate(item.id, e.target.value)}
          />
          <IconButton
            label={`Remove ${item.text.trim() || copy.label.toLowerCase()}`}
            variant="danger"
            size="sm"
            onClick={() => onRemove(item.id)}
          >
            <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        className="pkimm-action-plans__add-pill"
        onClick={onAdd}
      >
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {copy.addLabel}
      </button>
    </div>
  );
};

interface TaskListProps {
  categoryName: string;
  tasks: { itemId: string; label: string; done: boolean }[];
  onAdd: () => void;
  onToggle: (itemId: string) => void;
  onUpdateLabel: (itemId: string, label: string) => void;
  onRemove: (itemId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  categoryName,
  tasks,
  onAdd,
  onToggle,
  onUpdateLabel,
  onRemove,
}) => {
  const doneCount = tasks.filter((t) => t.done).length;
  return (
    <div className="pkimm-action-plans__list-section">
      <span className="pkimm-action-plans__list-title">Tasks</span>
      <span className="pkimm-action-plans__list-hint">
        A step toward the target.
      </span>
      {tasks.length > 0 && (
        <span aria-live="polite" className="pkimm-action-plans__task-count">
          {doneCount} of {tasks.length} done
        </span>
      )}
      {tasks.map((t) => (
        <div key={t.itemId} className="pkimm-action-plans__task-row">
          <Checkbox
            label={t.label || `Task for ${categoryName}`}
            checked={t.done}
            onChange={() => onToggle(t.itemId)}
          />
          <TextField
            label={`Edit ${t.label.trim() || "task"} for ${categoryName}`}
            hideLabel
            placeholder="Inventory all HSMs"
            className={
              t.done ? "pkimm-action-plans__task-label--done" : undefined
            }
            value={t.label}
            onChange={(e) => onUpdateLabel(t.itemId, e.target.value)}
          />
          <IconButton
            label={`Remove ${t.label.trim() || "task"}`}
            variant="danger"
            size="sm"
            onClick={() => onRemove(t.itemId)}
          >
            <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        className="pkimm-action-plans__add-pill"
        onClick={onAdd}
      >
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        Add task
      </button>
    </div>
  );
};

const CUSTOM_RESPONSIBILITY = "__custom__";

interface ResponsibilityFieldProps {
  entry: ActionPlanEntry;
  categoryName: string;
  pocs: { id: string; name: string; role?: string }[];
  onUpdateField: <K extends keyof ActionPlanEntry>(
    field: K,
    value: ActionPlanEntry[K],
  ) => void;
}

// Picking a POC always sets responsiblePocId AND clears the free-text
// responsibility; choosing Custom clears responsiblePocId; choosing none
// clears both. A deleted POC therefore falls back to "unassigned," never to
// stale free text. `customMode` tracks the user's chosen mode independent of
// whether the free-text field has been typed into yet (an empty custom field
// must still show as "Custom…", not silently revert to "— none —").
const ResponsibilityField: React.FC<ResponsibilityFieldProps> = ({
  entry,
  categoryName,
  pocs,
  onUpdateField,
}) => {
  const [customMode, setCustomMode] = React.useState(
    !entry.responsiblePocId && !!entry.responsibility,
  );

  const selectValue = entry.responsiblePocId
    ? entry.responsiblePocId
    : customMode
      ? CUSTOM_RESPONSIBILITY
      : "";

  const showCustomField =
    pocs.length === 0 ||
    selectValue === CUSTOM_RESPONSIBILITY ||
    (!entry.responsiblePocId && !!entry.responsibility);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === CUSTOM_RESPONSIBILITY) {
      setCustomMode(true);
      onUpdateField("responsiblePocId", undefined);
      return;
    }
    setCustomMode(false);
    onUpdateField("responsiblePocId", value || undefined);
    onUpdateField("responsibility", undefined);
  };

  return (
    <div className="pkimm-action-plans__responsibility">
      {pocs.length > 0 && (
        <Select
          label="Responsibility"
          aria-label={`Responsibility for ${categoryName}`}
          fieldClassName="pkimm-action-plans__responsibility-field"
          value={selectValue}
          onChange={handleChange}
        >
          <option value="">— none —</option>
          {pocs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.role ? ` (${p.role})` : ""}
            </option>
          ))}
          <option value={CUSTOM_RESPONSIBILITY}>Custom…</option>
        </Select>
      )}
      {showCustomField && (
        <TextField
          label={
            pocs.length > 0
              ? `Custom responsibility for ${categoryName}`
              : "Responsibility"
          }
          aria-label={
            pocs.length > 0 ? undefined : `Responsibility for ${categoryName}`
          }
          hideLabel={pocs.length > 0}
          placeholder="Security architecture team"
          hint="Who or what is responsible, if not a listed contact."
          value={entry.responsibility ?? ""}
          onChange={(e) => onUpdateField("responsibility", e.target.value)}
        />
      )}
    </div>
  );
};

// Resolve a plan's responsible party for read-only display, matching
// ResponsibilityField's precedence: a set responsiblePocId wins (resolving to
// the POC name, or nothing when it no longer matches a contact — a deleted
// POC reads as unassigned, never as stale free text); free text is used only
// when no responsiblePocId is set.
const resolveResponsibleName = (
  entry: ActionPlanEntry,
  pocs: { id: string; name: string; role?: string }[],
): string | undefined => {
  if (entry.responsiblePocId) {
    return pocs.find((p) => p.id === entry.responsiblePocId)?.name;
  }
  return entry.responsibility?.trim() || undefined;
};

interface PlanCardProps {
  categoryKey: string;
  categoryName: string;
  currentLevel: number;
  entry: ActionPlanEntry;
  gap?: GapToNextRow;
  pocs: { id: string; name: string; role?: string }[];
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdatePlanField: ActionPlansViewProps["onUpdatePlanField"];
  onAddListItem: ActionPlansViewProps["onAddListItem"];
  onUpdateListItem: ActionPlansViewProps["onUpdateListItem"];
  onRemoveListItem: ActionPlansViewProps["onRemoveListItem"];
  onAddTask: ActionPlansViewProps["onAddTask"];
  onToggleTask: ActionPlansViewProps["onToggleTask"];
  onUpdateTaskLabel: ActionPlansViewProps["onUpdateTaskLabel"];
  onRemoveTask: ActionPlansViewProps["onRemoveTask"];
}

const PlanCard: React.FC<PlanCardProps> = ({
  categoryKey,
  categoryName,
  currentLevel,
  entry,
  gap,
  pocs,
  open,
  onToggle,
  onRemove,
  onUpdatePlanField,
  onAddListItem,
  onUpdateListItem,
  onRemoveListItem,
  onAddTask,
  onToggleTask,
  onUpdateTaskLabel,
  onRemoveTask,
}) => {
  const bodyId = `action-plan-body-${categoryKey}`;
  const tasks = entry.tasks ?? [];
  const doneCount = tasks.filter((t) => t.done).length;
  const summaryHint =
    tasks.length > 0
      ? `${doneCount} of ${tasks.length} tasks`
      : gap
        ? `To reach ${gap.nextLevelName || LevelResult[gap.nextLevel]}`
        : "No tasks yet";
  const responsibleName = resolveResponsibleName(entry, pocs);

  const updateField = <K extends keyof ActionPlanEntry>(
    field: K,
    value: ActionPlanEntry[K],
  ) => onUpdatePlanField(categoryKey, field, value);

  return (
    <Card className="pkimm-action-plans__card" data-plan-id={categoryKey}>
      <div className="pkimm-action-plans__card-header">
        <button
          type="button"
          className="pkimm-action-plans__disclosure"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <FontAwesomeIcon
            icon={faChevronRight}
            className={`pkimm-action-plans__chevron${
              open ? " pkimm-action-plans__chevron--open" : ""
            }`}
            aria-hidden="true"
          />
          <span className="pkimm-action-plans__card-main">
            <span className="pkimm-action-plans__card-row">
              <span className="pkimm-action-plans__card-name">
                {categoryName}
              </span>
              <span className="pkimm-action-plans__card-badges">
                <LevelBadge level={currentLevel} />
                <span
                  className="pkimm-action-plans__badge-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
                <LevelBadge level={entry.targetLevel} />
              </span>
              <span className="pkimm-action-plans__card-hint">
                {summaryHint}
              </span>
            </span>
            {(entry.targetDate || responsibleName) && (
              <span className="pkimm-action-plans__meta">
                {entry.targetDate && (
                  <span className="pkimm-action-plans__meta-item">
                    <FontAwesomeIcon icon={faCalendar} aria-hidden="true" />
                    {entry.targetDate}
                  </span>
                )}
                {responsibleName && (
                  <span className="pkimm-action-plans__meta-item">
                    <FontAwesomeIcon icon={faUser} aria-hidden="true" />
                    {responsibleName}
                  </span>
                )}
              </span>
            )}
          </span>
        </button>
        <IconButton
          label={`Remove plan for ${categoryName}`}
          variant="danger"
          size="sm"
          onClick={onRemove}
        >
          <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
        </IconButton>
      </div>
      <div id={bodyId}>
        {open && (
          <div className="pkimm-action-plans__body">
            <div className="pkimm-action-plans__progression">
              <span className="pkimm-action-plans__progression-group">
                <span className="pkimm-action-plans__step-caption">
                  Current
                </span>
                <LevelBadge level={currentLevel} />
              </span>
              <span className="pkimm-action-plans__arrow" aria-hidden="true">
                →
              </span>
              <span className="pkimm-action-plans__progression-group">
                <span className="pkimm-action-plans__step-caption">Target</span>
                <Select
                  label={`Target level for ${categoryName}`}
                  hideLabel
                  fieldClassName="pkimm-action-plans__target-field"
                  value={entry.targetLevel}
                  onChange={(e) =>
                    updateField("targetLevel", Number(e.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {LevelResult[n]}
                    </option>
                  ))}
                </Select>
              </span>
            </div>

            {gap && (
              <div className="pkimm-action-plans__gap">
                <h4 className="pkimm-action-plans__gap-title">
                  To reach {gap.nextLevelName || LevelResult[gap.nextLevel]}
                </h4>
                {gap.nextLevelCriteria && <p>{gap.nextLevelCriteria}</p>}
                {gap.limitingRequirements.length > 0 && (
                  <p>
                    Limiting:{" "}
                    {gap.limitingRequirements
                      .map((r) => r.description)
                      .join("; ")}
                  </p>
                )}
              </div>
            )}

            <PlanList
              field="objectives"
              items={entry.objectives ?? []}
              categoryName={categoryName}
              onAdd={() => onAddListItem(categoryKey, "objectives")}
              onUpdate={(id, text) =>
                onUpdateListItem(categoryKey, "objectives", id, text)
              }
              onRemove={(id) => onRemoveListItem(categoryKey, "objectives", id)}
            />

            <div className="pkimm-action-plans__two-col">
              <ResponsibilityField
                entry={entry}
                categoryName={categoryName}
                pocs={pocs}
                onUpdateField={updateField}
              />
              <TextField
                type="date"
                label="Target date"
                hint="When this plan should be complete."
                fieldClassName="pkimm-action-plans__date-field"
                value={entry.targetDate ?? ""}
                onChange={(e) =>
                  updateField("targetDate", e.target.value || undefined)
                }
              />
            </div>

            <PlanList
              field="outputs"
              items={entry.outputs ?? []}
              categoryName={categoryName}
              onAdd={() => onAddListItem(categoryKey, "outputs")}
              onUpdate={(id, text) =>
                onUpdateListItem(categoryKey, "outputs", id, text)
              }
              onRemove={(id) => onRemoveListItem(categoryKey, "outputs", id)}
            />

            <TaskList
              categoryName={categoryName}
              tasks={tasks}
              onAdd={() => onAddTask(categoryKey)}
              onToggle={(itemId) => onToggleTask(categoryKey, itemId)}
              onUpdateLabel={(itemId, label) =>
                onUpdateTaskLabel(categoryKey, itemId, label)
              }
              onRemove={(itemId) => onRemoveTask(categoryKey, itemId)}
            />

            <TextArea
              label="Resources"
              autoGrow
              placeholder="Two PKI engineers, HSM vendor support, a change window"
              hint="People, budget, or tooling needed to deliver this plan."
              value={entry.resources ?? ""}
              onChange={(e) => updateField("resources", e.target.value)}
            />
            <TextArea
              label="Comments"
              autoGrow
              placeholder="Blocked on procurement for new HSMs"
              hint="Dependencies, risks, or notes for this plan."
              value={entry.comments ?? ""}
              onChange={(e) => updateField("comments", e.target.value)}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

const toggleSet = (set: Set<string>, key: string): Set<string> => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

export const ActionPlansView: React.FC<ActionPlansViewProps> = ({
  actionPlans,
  pocs,
  onAddPlan,
  onUpdatePlanField,
  onRemovePlan,
  onAddListItem,
  onUpdateListItem,
  onRemoveListItem,
  onAddTask,
  onToggleTask,
  onUpdateTaskLabel,
  onRemoveTask,
}) => {
  const { getModules, getProgress, getRequirementProgress } =
    useAssessmentTarget();
  const modules = getModules();
  const progress = getProgress();
  const requirementProgress = getRequirementProgress();
  const planned = actionPlans?.categories ?? {};
  const plannedKeys = Object.keys(planned);

  const [picked, setPicked] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [pendingFocusKey, setPendingFocusKey] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!pendingFocusKey) return;
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-plan-id="${pendingFocusKey}"] input, [data-plan-id="${pendingFocusKey}"] textarea, [data-plan-id="${pendingFocusKey}"] select`,
    );
    el?.focus();
    setPendingFocusKey(null);
  }, [pendingFocusKey]);

  // Resolve every category once: key -> { moduleId, category, currentDisplay }.
  const catByKey = new Map<
    string,
    { moduleId: string; category: CategoryData; currentDisplay: number }
  >();
  for (const m of modules) {
    for (const c of m.categories) {
      const currentDisplay = calculateEffectiveCategoryLevel(
        m.id,
        c,
        progress,
        requirementProgress,
      ).display;
      catByKey.set(`${m.id}.${c.id}`, {
        moduleId: m.id,
        category: c,
        currentDisplay,
      });
    }
  }
  // In-scope (display !== -1, i.e. not explicit/derived N/A) AND not already planned.
  const pickable = [...catByKey.entries()].filter(
    ([key, v]) => v.currentDisplay !== -1 && !planned[key],
  );

  const gapByKey = new Map<string, GapToNextRow>();
  for (const g of buildGapToNextLevel({
    modules,
    progress,
    requirementProgress,
  }))
    gapByKey.set(g.categoryKey, g);

  const toggle = (key: string) => setExpanded((prev) => toggleSet(prev, key));

  const expandAndReveal = (key: string) => {
    setExpanded((prev) => new Set(prev).add(key));
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-plan-id="${key}"]`,
    );
    el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const allExpanded =
    plannedKeys.length > 0 && plannedKeys.every((k) => expanded.has(k));
  const toggleExpandAll = () =>
    setExpanded(allExpanded ? new Set() : new Set(plannedKeys));

  const handleAddPlan = () => {
    const v = catByKey.get(picked);
    if (!v) return;
    const target = Math.min(Math.max(v.currentDisplay, 0) + 1, 5);
    onAddPlan(picked, target);
    setExpanded((prev) => new Set(prev).add(picked));
    setPendingFocusKey(picked);
    setPicked("");
  };

  return (
    <div className="pkimm-action-plans" ref={rootRef}>
      <p className="pkimm-action-plans__intro">
        Plan how you&apos;ll raise categories to a target level. Optional — it
        doesn&apos;t affect the score.
      </p>
      {plannedKeys.length === 0 && (
        <p className="pkimm-action-plans__empty">
          No action plans yet. Add a remediation plan for a category to set a
          target level and record objectives, responsibility, a target date, and
          tasks.
        </p>
      )}

      {pickable.length > 0 && (
        <div className="pkimm-action-plans__add-row">
          <Select
            label="Add a plan for:"
            aria-label="Add a plan for"
            fieldClassName="pkimm-action-plans__add-field"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
          >
            <option value="">Select a category…</option>
            {pickable.map(([key, v]) => (
              <option key={key} value={key}>
                {v.category.name}
              </option>
            ))}
          </Select>
          <Button variant="primary" disabled={!picked} onClick={handleAddPlan}>
            Add plan
          </Button>
        </div>
      )}

      {pickable.length === 0 && plannedKeys.length > 0 && (
        <p className="pkimm-action-plans__empty">
          All in-scope categories already have an action plan.
        </p>
      )}

      {plannedKeys.length > 0 && (
        <div className="pkimm-action-plans__overview">
          <div className="pkimm-action-plans__pills">
            {plannedKeys.map((key) => {
              const meta = catByKey.get(key);
              const entry = planned[key];
              const name = meta?.category.name ?? key;
              const currentName = LevelResult[meta?.currentDisplay ?? 0];
              const targetName = LevelResult[entry.targetLevel];
              return (
                <button
                  key={key}
                  type="button"
                  className="pkimm-action-plans__pill"
                  onClick={() => expandAndReveal(key)}
                >
                  {name} · {currentName}→{targetName}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={toggleExpandAll}>
            {allExpanded ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      )}

      {plannedKeys.map((key) => {
        const entry = planned[key];
        const meta = catByKey.get(key);
        const gap = gapByKey.get(key);
        const currentLevel = meta?.currentDisplay ?? 0;
        return (
          <PlanCard
            key={key}
            categoryKey={key}
            categoryName={meta?.category.name ?? key}
            currentLevel={currentLevel}
            entry={entry}
            gap={gap}
            pocs={pocs}
            open={expanded.has(key)}
            onToggle={() => toggle(key)}
            onRemove={() => onRemovePlan(key)}
            onUpdatePlanField={onUpdatePlanField}
            onAddListItem={onAddListItem}
            onUpdateListItem={onUpdateListItem}
            onRemoveListItem={onRemoveListItem}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onUpdateTaskLabel={onUpdateTaskLabel}
            onRemoveTask={onRemoveTask}
          />
        );
      })}
    </div>
  );
};
