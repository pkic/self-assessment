import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import {
  buildScopeTree,
  type ScopeCatNode,
  type ScopeModuleNode,
  type ScopeReqNode,
} from "../../utils/scopeTree";
import type { ScopeTemplate } from "../../utils/scopeTree";
import { buildScopeCoverage } from "../../utils/reportData";
import { Button, Card, IconButton, Select, StatusPill, TextArea } from "../ui";
import type { StatusPillTone } from "../ui";
import { useHelp } from "../Help/HelpProvider";
import "./Scope.module.scss";

export interface ScopeViewProps {
  templates: ScopeTemplate[];
  onSetCategory: (catKey: string, value: boolean) => void;
  onSetRequirement: (reqKey: string, value: boolean) => void;
  onSetModule: (moduleId: string, value: boolean) => void;
  onSetCategoryRequirements: (catKey: string, value: boolean) => void;
  onCategoryReason: (catKey: string, reason: string) => void;
  onRequirementReason: (reqKey: string, reason: string) => void;
  onSaveTemplate: (name: string) => void;
  onApplyTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onExportTemplate: (id: string) => void;
  onImportTemplateFile: (text: string) => void;
}

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <span
    className={`pkimm-scope__chevron${open ? " pkimm-scope__chevron--open" : ""}`}
    aria-hidden="true"
  >
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M4 2l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

const ExcludedMark: React.FC = () => (
  <span className="pkimm-scope__pill-icon" aria-hidden="true">
    <svg width="11" height="11" viewBox="0 0 12 12">
      <circle
        cx="6"
        cy="6"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 6h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

const catStatus = (
  c: ScopeCatNode,
): { tone: StatusPillTone; label: string } => {
  if (c.state === "out") return { tone: "neutral", label: "Excluded" };
  if (c.state === "mixed")
    return {
      tone: "warning",
      label: `Partial · ${c.inScopeCount} of ${c.totalCount}`,
    };
  return { tone: "success", label: "In scope" };
};

const moduleStatus = (
  m: ScopeModuleNode,
): { tone: StatusPillTone; label: string } => {
  if (m.state === "out") return { tone: "neutral", label: "Excluded" };
  if (m.state === "mixed") return { tone: "warning", label: "Partial" };
  return { tone: "success", label: "In scope" };
};

const toggleSet = (set: Set<string>, key: string): Set<string> => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

export const ScopeView: React.FC<ScopeViewProps> = ({
  templates,
  onSetCategory,
  onSetRequirement,
  onSetModule,
  onSetCategoryRequirements,
  onCategoryReason,
  onRequirementReason,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  onExportTemplate,
  onImportTemplateFile,
}) => {
  const { getModules, getProgress, getRequirementProgress } =
    useAssessmentTarget();
  const { openHelp } = useHelp();
  const modules = getModules();
  const progress = getProgress();
  const requirementProgress = getRequirementProgress();
  const tree = React.useMemo(
    () => buildScopeTree({ modules, progress, requirementProgress }),
    [modules, progress, requirementProgress],
  );
  const coverage = React.useMemo(
    () => buildScopeCoverage({ modules, progress, requirementProgress }),
    [modules, progress, requirementProgress],
  );
  const [selectedTemplate, setSelectedTemplate] = React.useState("");
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(
    () => new Set(modules.map((m) => m.id)),
  );
  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(
    () => new Set(),
  );

  const expandAll = () => {
    setExpandedModules(new Set(modules.map((m) => m.id)));
    setExpandedCats(
      new Set(
        tree.modules.flatMap((m) =>
          m.categories.filter((c) => c.totalCount > 0).map((c) => c.key),
        ),
      ),
    );
  };
  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedCats(new Set());
  };

  const renderReq = (c: ScopeCatNode, r: ScopeReqNode) => (
    <div key={r.key} className="pkimm-scope__req">
      <div className="pkimm-scope__req-row">
        <span
          className={`pkimm-scope__name${r.inScope ? "" : " pkimm-scope__name--excluded"}`}
        >
          {r.description}
        </span>
        <StatusPill
          tone={r.inScope ? "success" : "neutral"}
          disabled={c.explicitOut}
          className="pkimm-scope__pill"
          onClick={() => onSetRequirement(r.key, !r.inScope)}
        >
          {!r.inScope && <ExcludedMark />}
          {r.inScope ? "In scope" : "Excluded"}
          <span className="pkimm-visually-hidden"> — {r.description}</span>
        </StatusPill>
      </div>
      {!r.inScope && !c.explicitOut && (
        <TextArea
          className="pkimm-scope__reason"
          aria-label={`Reason ${r.description} not applicable`}
          placeholder="e.g. no external CAs are operated, so this does not apply"
          value={r.reason}
          onChange={(e) => onRequirementReason(r.key, e.target.value)}
        />
      )}
    </div>
  );

  const renderCat = (c: ScopeCatNode) => {
    const { tone, label } = catStatus(c);
    const open = expandedCats.has(c.key);
    const hasReqs = c.totalCount > 0;
    return (
      <div key={c.key} className="pkimm-scope__cat">
        <div className="pkimm-scope__cat-header">
          {hasReqs ? (
            <button
              type="button"
              className="pkimm-scope__disclosure"
              aria-expanded={open}
              onClick={() => setExpandedCats((prev) => toggleSet(prev, c.key))}
            >
              <Chevron open={open} />
              <span
                className={`pkimm-scope__name${c.state === "out" ? " pkimm-scope__name--excluded" : ""}`}
              >
                {c.name}
              </span>
            </button>
          ) : (
            <span
              className={`pkimm-scope__name pkimm-scope__name--static${c.state === "out" ? " pkimm-scope__name--excluded" : ""}`}
            >
              {c.name}
            </span>
          )}
          <StatusPill
            tone={tone}
            className="pkimm-scope__pill"
            onClick={() => onSetCategory(c.key, c.explicitOut)}
          >
            {tone === "neutral" && <ExcludedMark />}
            {label}
            <span className="pkimm-visually-hidden">
              {" — "}
              {c.name}, activate to {c.explicitOut ? "include" : "exclude"}
            </span>
          </StatusPill>
        </div>
        {c.state === "out" && !c.explicitOut && (
          <p className="pkimm-scope__derived">
            Not applicable — all requirements excluded.
          </p>
        )}
        {c.explicitOut && (
          <TextArea
            className="pkimm-scope__reason"
            aria-label={`Reason ${c.name} not applicable`}
            placeholder="e.g. no external CAs are operated, so this does not apply"
            value={c.reason}
            onChange={(e) => onCategoryReason(c.key, e.target.value)}
          />
        )}
        {open && hasReqs && (
          <div className="pkimm-scope__req-list">
            <div className="pkimm-scope__bulk">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSetCategoryRequirements(c.key, true)}
              >
                All req in
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSetCategoryRequirements(c.key, false)}
              >
                All req out
              </Button>
            </div>
            {c.requirements.map((r) => renderReq(c, r))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pkimm-scope">
      <p className="pkimm-scope__intro">
        Choose which categories and requirements apply to this assessment.
        Out-of-scope items are excluded from scoring.
      </p>

      <div className="pkimm-scope__summary-row">
        <div className="pkimm-scope__summary-group">
          <div className="pkimm-scope__summary" aria-live="polite">
            {coverage.categoriesInScope} of {coverage.categoriesTotal}{" "}
            categories, {coverage.requirementsInScope} of{" "}
            {coverage.requirementsTotal} requirements in scope
          </div>
          <IconButton
            label="Help with scope"
            size="sm"
            variant="ghost"
            onClick={() => openHelp(undefined)}
          >
            <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
          </IconButton>
        </div>
        {tree.modules.length > 0 && (
          <div className="pkimm-scope__expandall">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse all
            </Button>
          </div>
        )}
      </div>

      <div className="pkimm-scope__toolbar">
        <Select
          label="Scope template"
          fieldClassName="pkimm-scope__template-field"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="">Select a template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Button
          variant="primary"
          disabled={!selectedTemplate}
          onClick={() => onApplyTemplate(selectedTemplate)}
        >
          Apply
        </Button>
        <Button
          variant="danger"
          disabled={!selectedTemplate}
          onClick={() => onDeleteTemplate(selectedTemplate)}
        >
          Delete
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const name = window.prompt("Template name");
            if (name) onSaveTemplate(name);
          }}
        >
          Save current scope as…
        </Button>
        <Button
          variant="secondary"
          disabled={!selectedTemplate}
          onClick={() => onExportTemplate(selectedTemplate)}
        >
          Export
        </Button>
        <label className="pkimm-scope__import">
          <span className="pkimm-visually-hidden">Import scope template</span>
          <input
            type="file"
            accept=".yaml,.yml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => onImportTemplateFile(text));
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {tree.modules.length === 0 ? (
        <p className="pkimm-scope__empty">
          No modules loaded for this assessment.
        </p>
      ) : (
        tree.modules.map((m) => {
          const modNameId = `scope-mod-${m.moduleId}`;
          const open = expandedModules.has(m.moduleId);
          const { tone, label } = moduleStatus(m);
          const catsInScope = m.categories.filter(
            (c) => c.state !== "out",
          ).length;
          return (
            <Card
              key={m.moduleId}
              as="section"
              aria-labelledby={modNameId}
              padding="none"
              className="pkimm-scope__module"
            >
              <div className="pkimm-scope__module-header">
                <button
                  type="button"
                  className="pkimm-scope__disclosure"
                  aria-expanded={open}
                  onClick={() =>
                    setExpandedModules((prev) => toggleSet(prev, m.moduleId))
                  }
                >
                  <Chevron open={open} />
                  <strong
                    id={modNameId}
                    className={`pkimm-scope__name${m.state === "out" ? " pkimm-scope__name--excluded" : ""}`}
                  >
                    {m.moduleId} — {m.module}
                  </strong>
                </button>
                <span className="pkimm-scope__coverage">
                  {catsInScope} of {m.categories.length} categories in scope
                </span>
                <StatusPill
                  tone={tone}
                  className="pkimm-scope__pill"
                  onClick={() => onSetModule(m.moduleId, m.state !== "in")}
                >
                  {tone === "neutral" && <ExcludedMark />}
                  {label}
                  <span className="pkimm-visually-hidden">
                    {" — "}
                    {m.moduleId} {m.module}, activate to{" "}
                    {m.state === "in" ? "exclude" : "include"}
                  </span>
                </StatusPill>
              </div>
              {open && (
                <div className="pkimm-scope__cats">
                  {m.categories.map((c) => renderCat(c))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};
