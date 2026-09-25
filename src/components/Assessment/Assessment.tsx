import React, { useEffect, useRef, useState } from "react";
import { Module } from "../Module/Module";
import { SpiderChart } from "../SpiderChart/SpiderChart";
import { Overview } from "../Overview/Overview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { getNextContentTab } from "./contentTabs";
import { UnifiedReport } from "../Report/UnifiedReport";
import { EvaluationView } from "../Evaluation/EvaluationView";
import { shouldLeaveEvaluationTab } from "../Evaluation/evaluationTab";
import { ComparisonPanel } from "../Comparison/ComparisonPanel";
import {
  alignBaseline,
  buildComparison,
  buildActionPlanReconciliation,
} from "../../utils/comparison";
import { ScopeView } from "../Scope/ScopeView";
import { shouldLeaveScopeTab } from "../Scope/scopeTab";
import {
  applyBulkScope,
  applyScopeTemplate,
  captureScopeTemplate,
  setCategoryApplicability,
  type ScopeTemplate,
} from "../../utils/scopeTree";
import { WorkspaceView } from "../Workspace/WorkspaceView";
import { shouldLeaveWorkspaceTab } from "../Workspace/workspaceTab";
import {
  rescueOrphanedEntry,
  discardOrphanedEntry,
  isDefaultRequirementProgress,
} from "../../utils/workspace";
import { ActionPlansView } from "../ActionPlans/ActionPlansView";
import { shouldLeaveActionPlansTab } from "../ActionPlans/actionPlansTab";
import {
  addActionPlan,
  updateActionPlanField,
  removeActionPlan,
  addPlanListItem,
  updatePlanListItem,
  removePlanListItem,
  addPlanTask,
  togglePlanTask,
  updatePlanTaskLabel,
  removePlanTask,
  normalizeAssessmentActionPlans,
  type ActionPlanEntry,
} from "../../utils/actionPlans";
import { generateURL, downloadAssessmentYAML } from "../../utils/urlGenerator";
import { exportToPDF, exportExtensionPDF } from "../../utils/pdfGenerator";
import {
  AssessmentData,
  ProgressData,
  ExtensionData,
  EnabledExtension,
  SavedState,
  Assessment as SavedAssessment,
  ReferenceEntry,
  RequirementProgress,
  PkiEnvironment,
  Workspace,
} from "../../types/types";
import {
  applyRequirementEdit,
  clearRequirementProgressForCategory,
  type RequirementEditableField,
} from "../../utils/requirementProgress";
import {
  computeNextCategoryApplicability,
  computeNextCategoryField,
  computeNextCategoryLevel,
  computeNextCategoryNotes,
  computeNextCategoryReason,
  type CategoryEditableField,
} from "../../utils/categoryProgress";
import LevelResult from "../../enums/LevelResult";
import {
  calculateExtensionMaturityLevels,
  calculateWeightedMaturityScore,
} from "../../assessment-engine/methodologies/weightedMaturity";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import {
  computeCategoryGrainCounts,
  buildReportCompleteness,
  buildRequirementDetailRows,
  buildGapToNextLevel,
  buildActionPlanRows,
} from "../../utils/reportData";
import { AssessmentTargetProvider } from "../../contexts/AssessmentTargetContext";
import { AssessmentHeader } from "./AssessmentHeader";
import { HelpBridge, HeaderHelpButton } from "../Help/HelpBridge";
import { Extensions } from "../Extensions/Extensions";
import { useChartCapture } from "./hooks/useChartCapture";
import { useMigrationState } from "./hooks/useMigrationState";
import { useDurability } from "./hooks/useDurability";
import { useEditLock } from "./hooks/useEditLock";
import { useTabPersistence } from "./hooks/useTabPersistence";
import { useInitialLoad } from "./hooks/useInitialLoad";
import { useViewMode } from "./hooks/useViewMode";
import { useResumePosition } from "./hooks/useResumePosition";
import { parseModes } from "../../utils/modes";
import { resolveRequirementName } from "../../utils/requirementFilter";
import type { RequirementFilterState } from "../../utils/requirementFilter";
import type { SectionKey } from "../../utils/pdf/sections/registry";
import { ResumeToast } from "../ResumeToast/ResumeToast";
import "./Assessment.module.scss";
import { APP_VERSION } from "../../version";
import {
  STORAGE_KEY,
  readLegacyAssessmentData,
  newEmptyAssessment,
  importLegacyData,
  importAssessmentFile,
  removeLegacyAssessmentData,
  buildStructureSnapshot,
  newId,
} from "../../utils/storage";
import { reclassifyUntouchedLevelOne } from "../../utils/legacyReclassify";
import { parseExtensionFile } from "../../utils/extensionUpload";
import { getStorageAdapter } from "../../utils/storageAdapter";
import type { StorageBackend } from "../../utils/storageAdapter";
import { Banner, Button } from "../ui";
import { LegacyImportPrompt } from "../LegacyImportPrompt/LegacyImportPrompt";
import { TransientAssessmentBanner } from "../TransientAssessmentBanner/TransientAssessmentBanner";
import { MigrationBanner } from "../MigrationBanner/MigrationBanner";
import { MigrationSummary as MigrationSummaryView } from "../MigrationSummary/MigrationSummary";
import { ForwardCompatRefusal } from "../ForwardCompatRefusal/ForwardCompatRefusal";
import { ImportCollisionModal } from "../ImportCollisionModal/ImportCollisionModal";
import {
  parseScopeTemplateFile,
  analyzeTemplateAgainstModel,
  downloadScopeTemplate,
  type ScopeTemplateFile,
  type TemplateCompatibility,
} from "../../utils/scopeTemplateFile";
import { ScopeTemplateImportModal } from "../ScopeTemplateImportModal/ScopeTemplateImportModal";
import { ResetModal } from "../ResetModal/ResetModal";
import { resetAssessment, type ResetScopes } from "../../utils/resetAssessment";
import { AssessmentManager } from "../AssessmentManager/AssessmentManager";
import { migrate } from "../../utils/stateMigration";
import {
  mergeAssessments,
  type MergeStrategy,
} from "../../utils/mergeAssessment";
import { buildMigratedAssessment } from "./buildMigratedAssessment";
import { deriveSaveStatus } from "../../utils/saveStatus";
import { shouldNudgeExport } from "../../utils/durability";
import { SaveStatusChip } from "../SaveStatusChip/SaveStatusChip";
import { ReportGeneratingModal } from "../Report/ReportGeneratingModal/ReportGeneratingModal";
import { runPdfGeneration } from "./runPdfGeneration";
import { TabNav } from "./TabNav";

interface AssessmentProps {
  src: string | null;
  references: string | null;
  modes?: string | null;
  profile: AssessmentProfileData;
}

const EMPTY_STATE: SavedState = {
  stateSchemaVersion: 1,
  activeId: null,
  assessments: [],
};

const formatRelativeDays = (iso: string): string => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? "today" : `${days}d ago`;
};

// Deterministic date to show alongside the comparison baseline's name in the
// Detailed report's identity banner: the baseline's own finish/start date
// when it recorded one (already plain YYYY-MM-DD strings), else the day it
// was last saved (meta.updatedAt is an ISO timestamp, truncated to its date
// component) — never "now". No baseline selected → undefined.
const formatComparisonBaselineDate = (
  baseline: SavedAssessment | null,
): string | undefined => {
  if (!baseline) return undefined;
  return (
    baseline.finishDate ||
    baseline.startDate ||
    baseline.meta.updatedAt.slice(0, 10)
  );
};

export const Assessment: React.FC<AssessmentProps> = ({
  src,
  references,
  modes,
  profile,
}) => {
  const modeCaps = parseModes(modes);

  const defaultProgressData = {
    level: 0,
    result: LevelResult[0],
    description: "",
    applicability: true,
  };

  const version = APP_VERSION;
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  // Session resume: the card to scroll+focus after restoring
  // lastPosition on load. Separate from the RequirementFinder's own jump
  // state (Module.jumpKey) — this one is seeded once from storage, not from
  // user interaction with the finder.
  const [restoreScrollKey, setRestoreScrollKey] = useState<string | undefined>(
    undefined,
  );
  // Focus management: when a tab is switched via user click, move
  // focus to the tab panel so screen readers announce the new content
  // instead of leaving focus stranded on a nav button that just
  // disappeared behind other content. Session resume drives its
  // own focus target (a specific requirement card) via restoreScrollKey, so
  // that path intentionally skips this — see the guard below.
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPanelOnNextTabChange = useRef(false);

  const [savedState, setSavedState] = useState<SavedState>(EMPTY_STATE);
  const [storageBackend, setStorageBackend] = useState<StorageBackend | null>(
    null,
  );

  // Assessment file import — a same-id collision awaiting the user's
  // Replace/Keep-both/Cancel choice, and a forward-incompatible upload (a
  // file exported by a newer widget) that the ForwardCompatRefusal card
  // surfaces without touching local state.
  const [importCollision, setImportCollision] = useState<{
    existing: SavedAssessment;
    incoming: SavedAssessment;
  } | null>(null);
  const [importForwardIncompatible, setImportForwardIncompatible] = useState<{
    message: string;
    rawText: string;
    fileName: string;
  } | null>(null);

  // Scope-template import — a parsed+analyzed file awaiting the user's
  // confirmation in ScopeTemplateImportModal. Carries the modelVersion it was
  // analyzed against so the modal can never drift from the counts it shows.
  const [pendingTemplateImport, setPendingTemplateImport] = useState<{
    file: ScopeTemplateFile;
    compatibility: TemplateCompatibility;
    modelVersion: string;
  } | null>(null);

  // Transient baseline for the Evaluation tab's comparison panel — never
  // routed through updateActive, storage, or export.
  const [comparisonBaseline, setComparisonBaseline] =
    useState<SavedAssessment | null>(null);

  const {
    data,
    extensionsData,
    referencesLookup,
    incompatibleExtensionIds,
    hasLegacyData,
    setHasLegacyData,
    legacyPrompt,
    setLegacyPrompt,
    hiddenExtensions,
    setHiddenExtensions,
    forwardCompatFailure,
    refreshExtensions,
  } = useInitialLoad({
    src: src ?? undefined,
    references: references ?? undefined,
    setSavedState,
    setCurrentTab,
    setStorageBackend,
  });

  const {
    chartRef,
    chartExtensionsOverride,
    chartAnimate,
    beginCapture,
    endCapture,
  } = useChartCapture();
  // Drives ReportGeneratingModal while a PDF export (self/assessment/
  // attestation report or an extension report) is in flight.
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // Drives the Reset scope-chooser dialog for the original (non-extension)
  // target.
  const [resetOpen, setResetOpen] = useState(false);
  const [extensionUploadError, setExtensionUploadError] = useState<
    string | undefined
  >(undefined);

  const {
    isSaving,
    lastSavedAt,
    saveError,
    notify,
    markDeleted,
    unmarkDeleted,
  } = useTabPersistence({
    savedState,
    setSavedState,
    storageBackend,
    forwardCompatFailure,
  });

  const {
    persisted,
    storageEstimate,
    activeLastExportAt,
    setActiveLastExportAt,
  } = useDurability({
    activeId: savedState.activeId ?? undefined,
    lastSavedAt,
  });

  const activeAssessment =
    savedState.assessments.find((a) => a.id === savedState.activeId) ?? null;
  const progress = activeAssessment?.progress ?? {};
  const requirementProgress = activeAssessment?.requirementProgress;
  const assessmentName = activeAssessment?.assessmentName ?? "";
  const assessorName = activeAssessment?.assessorName ?? "";
  const useCaseDescription = activeAssessment?.useCaseDescription ?? "";
  // Derived reads for v2 assessment metadata, wired into the Report tab's
  // assessment-details form (UnifiedReport).
  const organizationName = activeAssessment?.organizationName ?? "";
  const assessorCompany = activeAssessment?.assessorCompany ?? "";
  const assessorPosition = activeAssessment?.assessorPosition ?? "";
  const assessmentType = activeAssessment?.assessmentType ?? "";
  const startDate = activeAssessment?.startDate ?? "";
  const targetDate = activeAssessment?.targetDate ?? "";
  const finishDate = activeAssessment?.finishDate ?? "";
  const pkiEnvironment = activeAssessment?.pkiEnvironment ?? {};
  const enabledExtensionRecords = activeAssessment?.enabledExtensions ?? [];
  // The downstream UI (Extensions, UnifiedReport, SpiderChart) still consumes
  // a `string[]` of extension ids. Storage carries id+version objects; we
  // unwrap here so the existing consumers stay untouched.
  const allEnabledIds = enabledExtensionRecords.map((e) => e.id);
  // Filter to loaded-and-compatible extensions. Hidden = present in the saved
  // assessment but not loaded on this page; preserve progress, surface a notice.
  const enabledExtensions = allEnabledIds.filter((id) =>
    extensionsData.some((x) => x.extension.id === id),
  );
  const hiddenEnabledExtensions = enabledExtensionRecords.filter(
    (e) => !extensionsData.some((x) => x.extension.id === e.id),
  );

  const {
    mismatches,
    shouldShowMigrationBanner,
    migrationSummary,
    setMigrationSummary,
    setMigrationDismissedFor,
  } = useMigrationState({
    activeAssessment: activeAssessment ?? undefined,
    data,
    extensionsData,
    hiddenExtensions,
  });

  const isTransient = (a: SavedAssessment | null): boolean =>
    a?.id.startsWith("transient-") ?? false;

  const { activeLockedByOtherTab, withRowLock } = useEditLock({
    activeId: savedState.activeId ?? undefined,
    storageBackend,
  });

  const updateActive = (
    patch: Partial<SavedAssessment> | ((a: SavedAssessment) => SavedAssessment),
  ): void => {
    if (activeLockedByOtherTab) return; // read-only: edited in another tab
    setSavedState((prev) => {
      if (!prev.activeId) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        assessments: prev.assessments.map((a) => {
          if (a.id !== prev.activeId) return a;
          const merged =
            typeof patch === "function" ? patch(a) : { ...a, ...patch };
          return { ...merged, meta: { ...merged.meta, updatedAt: now } };
        }),
      };
    });
  };

  const viewMode = useViewMode({
    caps: modeCaps,
    lastView: activeAssessment?.lastView,
    dataVersion: activeAssessment?.dataVersion,
    modelVersion: data?.version,
    persistView: (v) => updateActive((a) => ({ ...a, lastView: v })),
  });

  // Session resume: write path is a settled position (ref + local
  // ~600ms timer inside the hook) flushed through updateActive — never on
  // every focus/tab click directly, so it doesn't churn
  // useTabPersistence's own 300ms timer. Transient assessments never
  // persist lastPosition, consistent with their no-autosave rule.
  const resume = useResumePosition({
    activeAssessment,
    onSettle: (pos) => {
      if (isTransient(activeAssessment)) return;
      updateActive((a) => ({ ...a, lastPosition: pos }));
    },
    resolveName: (pos) =>
      resolveRequirementName(pos.requirementKey ?? pos.categoryKey ?? "", data),
  });

  // Restore-on-load: consume the pending position once (view + tab first,
  // then let paint settle before scrolling — a card that doesn't exist yet
  // because currentTab/view just changed this render can't be focused).
  useEffect(() => {
    const pos = resume.pendingRestore;
    if (!pos) return;
    setCurrentTab(pos.tab);
    if (pos.view === "full" || pos.view === "self") viewMode.setView(pos.view);
    const key = pos.requirementKey ?? pos.categoryKey;
    if (key) setRestoreScrollKey(key);
    resume.consumeRestore();
    // Deliberately keyed on resume.pendingRestore alone: viewMode/consumeRestore
    // are recreated every render, and this project's eslint config does not
    // enforce react-hooks/exhaustive-deps.
  }, [resume.pendingRestore]);

  // Focus management: after a user-initiated tab switch, move focus
  // to the tab panel once its new content has painted. Restore-on-load (the
  // effect above) sets currentTab too, but never sets the flag, so it keeps
  // its own more specific focus target (the restored requirement card)
  // instead of losing focus to the panel.
  useEffect(() => {
    if (!focusPanelOnNextTabChange.current) return;
    focusPanelOnNextTabChange.current = false;
    panelRef.current?.focus();
    // Deliberately keyed on currentTab alone, matching the restore effect
    // above.
  }, [currentTab]);

  // The Evaluation tab only exists in full view. If the view drops back to
  // self (user toggle, or a restored session resolving to self because full
  // isn't available) while Evaluation is active, fall back to Report rather
  // than leaving the tab stranded on hidden nav.
  useEffect(() => {
    if (shouldLeaveEvaluationTab(currentTab, viewMode.view)) {
      setCurrentTab("report");
    }
  }, [currentTab, viewMode.view]);

  // The Scope tab only exists in full view. If the view drops back to self
  // while it's active, redirect to Report rather than stranding the user on
  // a hidden nav item (mirrors the Evaluation guard above).
  useEffect(() => {
    if (shouldLeaveScopeTab(currentTab, viewMode.view)) {
      setCurrentTab("report");
    }
  }, [currentTab, viewMode.view]);

  // The Workspace tab only exists in full view. If the view drops back to
  // self while it's active, redirect to Report rather than stranding the
  // user on a hidden nav item (mirrors the Scope/Evaluation guards above).
  useEffect(() => {
    if (shouldLeaveWorkspaceTab(currentTab, viewMode.view)) {
      setCurrentTab("report");
    }
  }, [currentTab, viewMode.view]);

  // The Action plans tab only exists in full view. If the view drops back to
  // self while it's active, redirect to Report rather than stranding the
  // user on a hidden nav item (mirrors the Workspace/Scope/Evaluation guards
  // above).
  useEffect(() => {
    if (shouldLeaveActionPlansTab(currentTab, viewMode.view)) {
      setCurrentTab("report");
    }
  }, [currentTab, viewMode.view]);

  const [scopeTemplates, setScopeTemplates] = useState<ScopeTemplate[]>([]);
  const refreshScopeTemplates = React.useCallback(async () => {
    const adapter = await getStorageAdapter();
    setScopeTemplates(await adapter.listScopeTemplates());
  }, []);
  useEffect(() => {
    void refreshScopeTemplates();
  }, [refreshScopeTemplates]);

  const setProgress = (
    updater: React.SetStateAction<Record<string, ProgressData>>,
  ): void => {
    updateActive((a) => ({
      ...a,
      progress:
        typeof updater === "function"
          ? (
              updater as (
                p: Record<string, ProgressData>,
              ) => Record<string, ProgressData>
            )(a.progress)
          : updater,
    }));
  };

  const setAssessmentName = (v: string): void =>
    updateActive({ assessmentName: v });
  const setAssessorName = (v: string): void =>
    updateActive({ assessorName: v });
  const setUseCaseDescription = (v: string): void =>
    updateActive({ useCaseDescription: v });

  // v2 assessment metadata (Report tab's assessment-details form).
  // Single-layer handlers — no separate set* wrapper needed since nothing
  // else in this component reads/writes these fields yet.
  const handleOrganizationName = (v: string): void =>
    updateActive({ organizationName: v });
  const handleAssessorCompany = (v: string): void =>
    updateActive({ assessorCompany: v });
  const handleAssessorPosition = (v: "" | "internal" | "external"): void =>
    updateActive({ assessorPosition: v === "" ? undefined : v });
  const handleAssessmentType = (
    v: "" | "self" | "formal" | "third-party",
  ): void => updateActive({ assessmentType: v === "" ? undefined : v });
  const handleStartDate = (v: string): void =>
    updateActive({ startDate: v || undefined });
  const handleTargetDate = (v: string): void =>
    updateActive({ targetDate: v || undefined });
  const handleFinishDate = (v: string): void =>
    updateActive({ finishDate: v || undefined });
  const handlePkiEnvironment = (field: keyof PkiEnvironment, v: string): void =>
    updateActive((a) => ({
      ...a,
      pkiEnvironment: { ...a.pkiEnvironment, [field]: v || undefined },
    }));

  const setEnabledExtensions = (
    updater: React.SetStateAction<string[]>,
  ): void => {
    updateActive((a) => {
      const prevIds = a.enabledExtensions.map((e) => e.id);
      const nextIds =
        typeof updater === "function"
          ? (updater as (e: string[]) => string[])(prevIds)
          : updater;
      const next: EnabledExtension[] = nextIds.map((id) => {
        const existing = a.enabledExtensions.find((e) => e.id === id);
        if (existing) return existing;
        const loaded = extensionsData.find((x) => x.extension.id === id);
        return { id, version: loaded?.extension.version ?? "0.0.0" };
      });
      return { ...a, enabledExtensions: next };
    });
  };

  function makeProgressEntry(): ProgressData {
    return { ...defaultProgressData };
  }

  function initProgress(
    parsedData: AssessmentData | null,
    extensionsData: ExtensionData[] = [],
    _enabledExtensions: string[] = [],
  ): Record<string, ProgressData> {
    const initialProgress: Record<string, ProgressData> = {};

    if (parsedData) {
      for (const module of parsedData.modules) {
        for (const category of module.categories) {
          initialProgress[`${module.id}.${category.id}`] = makeProgressEntry();
        }
      }
    }

    for (const ext of extensionsData) {
      for (const module of ext.relevance.modules) {
        for (const category of module.categories) {
          const key = `${ext.extension.id}.${module.id}.${category.id}`;
          initialProgress[key] = makeProgressEntry();
        }
      }
    }

    return initialProgress;
  }

  const handleLevelChange = (
    moduleId: string,
    categoryId: string,
    level: number,
    extensionId?: string,
  ) => {
    const key = extensionId
      ? `${extensionId}.${moduleId}.${categoryId}`
      : `${moduleId}.${categoryId}`;
    setProgress((prevProgress) => {
      const prev = prevProgress[key];
      let description: string;
      if (extensionId) {
        const ext = extensionsData.find((e) => e.extension.id === extensionId);
        description =
          ext?.relevance.modules
            .find((m) => m.id === moduleId)
            ?.categories.find((c) => c.id === categoryId)
            ?.levels.find((l) => l.number === level)?.description ||
          defaultProgressData.description;
      } else {
        description =
          data?.modules
            .find((module) => module.id === moduleId)
            ?.categories.find((category) => category.id === categoryId)
            ?.levels.find((l) => l.number === level)?.description ||
          defaultProgressData.description;
      }

      const nextEntry = computeNextCategoryLevel(prev, {
        level,
        result: LevelResult[level] || defaultProgressData.result,
        description,
      });

      return {
        ...prevProgress,
        [key]: nextEntry,
      };
    });
  };

  const handleApplicabilityChange = (
    moduleId: string,
    categoryId: string,
    extensionId?: string,
  ) => {
    const key = extensionId
      ? `${extensionId}.${moduleId}.${categoryId}`
      : `${moduleId}.${categoryId}`;
    setProgress((prevProgress) => ({
      ...prevProgress,
      [key]: computeNextCategoryApplicability(prevProgress[key]),
    }));
  };

  // Writes/clears the free-text reason on a category `progress[key]` entry
  // (same key shape as handleApplicabilityChange, extensionId-prefixed when
  // present). Only meaningful while the category is out of scope, but the
  // write itself doesn't gate on that — Category only renders the field
  // when categoryProgress.applicability === false.
  const handleCategoryReason = (
    moduleId: string,
    categoryId: string,
    reason: string,
    extensionId?: string,
  ) => {
    const key = extensionId
      ? `${extensionId}.${moduleId}.${categoryId}`
      : `${moduleId}.${categoryId}`;
    setProgress((prevProgress) => ({
      ...prevProgress,
      [key]: computeNextCategoryReason(prevProgress[key], reason),
    }));
  };

  const handleCategoryNotes = (
    moduleId: string,
    categoryId: string,
    notes: string,
    extensionId?: string,
  ) => {
    const key = extensionId
      ? `${extensionId}.${moduleId}.${categoryId}`
      : `${moduleId}.${categoryId}`;
    setProgress((prevProgress) => ({
      ...prevProgress,
      [key]: computeNextCategoryNotes(prevProgress[key], notes),
    }));
  };

  const handleCategoryFieldChange = <K extends CategoryEditableField>(
    moduleId: string,
    categoryId: string,
    field: K,
    value: ProgressData[K],
    extensionId?: string,
  ) => {
    const key = extensionId
      ? `${extensionId}.${moduleId}.${categoryId}`
      : `${moduleId}.${categoryId}`;
    setProgress((prevProgress) => ({
      ...prevProgress,
      [key]: computeNextCategoryField(prevProgress[key], field, value),
    }));
  };

  // Requirement-level write path (full-assessment mode). These write ONLY
  // `assessment.requirementProgress` — thin wrappers over the pure reducers
  // in requirementProgress.ts, never touching category-level `progress`.
  const handleRequirementLevelChange = (
    moduleId: string,
    categoryId: string,
    requirementId: string,
    level: number,
  ) => {
    const key = `${moduleId}.${categoryId}.${requirementId}`;
    updateActive((a) =>
      applyRequirementEdit(a, key, {
        level,
        updatedAt: new Date().toISOString(),
      }),
    );
  };

  const handleRequirementApplicabilityChange = (
    moduleId: string,
    categoryId: string,
    requirementId: string,
  ) => {
    const key = `${moduleId}.${categoryId}.${requirementId}`;
    updateActive((a) =>
      applyRequirementEdit(a, key, {
        applicability: !(a.requirementProgress?.[key]?.applicability ?? true),
        updatedAt: new Date().toISOString(),
      }),
    );
  };

  const handleRequirementFieldChange = <K extends RequirementEditableField>(
    moduleId: string,
    categoryId: string,
    requirementId: string,
    field: K,
    value: RequirementProgress[K],
  ) => {
    const key = `${moduleId}.${categoryId}.${requirementId}`;
    updateActive((a) =>
      applyRequirementEdit(a, key, {
        [field]: value,
        updatedAt: new Date().toISOString(),
      } as Partial<RequirementProgress>),
    );
  };

  const handleClearRequirementAssessments = (
    moduleId: string,
    categoryId: string,
  ) => {
    updateActive((a) =>
      clearRequirementProgressForCategory(a, moduleId, categoryId),
    );
  };

  // Category/module writes use the existing setProgress idiom (functional
  // updater over progress -> updateActive), matching handleApplicabilityChange.
  const handleScopeSetCategory = (catKey: string, value: boolean) =>
    setProgress((prev) => ({
      ...prev,
      [catKey]: setCategoryApplicability(prev[catKey], value),
    }));

  const handleScopeSetModule = (moduleId: string, value: boolean) => {
    const catKeys = (
      data?.modules.find((m) => m.id === moduleId)?.categories ?? []
    ).map((c) => `${moduleId}.${c.id}`);
    setProgress((prev) => {
      const next = { ...prev };
      for (const k of catKeys)
        next[k] = setCategoryApplicability(prev[k], value);
      return next;
    });
  };

  // Requirement writes go through applyBulkScope (touches only requirementProgress).
  const handleScopeSetRequirement = (reqKey: string, value: boolean) =>
    updateActive((a) =>
      applyBulkScope(a, {
        requirementKeys: [reqKey],
        value,
        nowIso: new Date().toISOString(),
      }),
    );

  const handleScopeSetCategoryRequirements = (
    catKey: string,
    value: boolean,
  ) => {
    const [moduleId, categoryId] = catKey.split(".");
    const reqKeys = (
      data?.modules
        .find((m) => m.id === moduleId)
        ?.categories.find((c) => c.id === categoryId)?.requirements ?? []
    ).map((r) => `${catKey}.${r.id}`);
    updateActive((a) =>
      applyBulkScope(a, {
        requirementKeys: reqKeys,
        value,
        nowIso: new Date().toISOString(),
      }),
    );
  };

  const handleScopeCategoryReason = (catKey: string, reason: string) => {
    const [moduleId, categoryId] = catKey.split(".");
    handleCategoryReason(moduleId, categoryId, reason);
  };
  const handleScopeRequirementReason = (reqKey: string, reason: string) => {
    const [moduleId, categoryId, requirementId] = reqKey.split(".");
    handleRequirementFieldChange(
      moduleId,
      categoryId,
      requirementId,
      "applicabilityReason",
      reason,
    );
  };

  const handleSaveScopeTemplate = async (name: string) => {
    if (!data || !activeAssessment) return;
    const adapter = await getStorageAdapter();
    const now = new Date().toISOString();
    await adapter.saveScopeTemplate(
      captureScopeTemplate(
        name,
        {
          modules: data.modules,
          progress: activeAssessment.progress,
          requirementProgress: activeAssessment.requirementProgress ?? {},
        },
        now,
        newId(),
        data.version ?? "1.0.0",
      ),
    );
    await refreshScopeTemplates();
  };
  const handleApplyScopeTemplate = async (id: string) => {
    if (!data) return;
    const t = scopeTemplates.find((x) => x.id === id);
    if (!t) return;
    if (
      !window.confirm(
        "Applying this template replaces the current scope selection. Continue?",
      )
    )
      return;
    updateActive((a) =>
      applyScopeTemplate(a, t, data.modules, new Date().toISOString()),
    );
  };
  const handleDeleteScopeTemplate = async (id: string) => {
    const adapter = await getStorageAdapter();
    await adapter.deleteScopeTemplate(id);
    await refreshScopeTemplates();
  };
  const handleExportScopeTemplate = (id: string) => {
    if (!data) return;
    const t = scopeTemplates.find((x) => x.id === id);
    if (!t) return;
    downloadScopeTemplate(t, data.version ?? "1.0.0");
  };
  const handleImportScopeTemplateFile = (text: string) => {
    if (!data) return;
    const result = parseScopeTemplateFile(text);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    const modelVersion = data.version ?? "1.0.0";
    setPendingTemplateImport({
      file: result.file,
      compatibility: analyzeTemplateAgainstModel(
        result.file,
        data.modules,
        modelVersion,
      ),
      modelVersion,
    });
  };
  const handleConfirmImportScopeTemplate = async () => {
    if (!pendingTemplateImport) return;
    const { file } = pendingTemplateImport;
    setPendingTemplateImport(null);
    // Unique imported name: never collide with an existing template, even
    // across repeated imports of the same file.
    const existingNames = new Set(scopeTemplates.map((t) => t.name));
    let name = file.name;
    if (existingNames.has(name)) {
      name = `${file.name} (imported)`;
      let n = 2;
      while (existingNames.has(name)) name = `${file.name} (imported ${n++})`;
    }
    const now = new Date().toISOString();
    const adapter = await getStorageAdapter();
    await adapter.saveScopeTemplate({
      id: newId(),
      name,
      createdAt: now,
      updatedAt: now,
      outOfScopeCategoryKeys: file.outOfScopeCategoryKeys,
      outOfScopeRequirementKeys: file.outOfScopeRequirementKeys,
      dataVersion: file.dataVersion,
    });
    await refreshScopeTemplates();
  };

  const handleWorkspaceChange = (next: Workspace) =>
    updateActive((a) => ({ ...a, workspace: next }));

  const handleAddActionPlan = (key: string, targetLevel: number) =>
    updateActive((a) => ({
      ...a,
      actionPlans: addActionPlan(a.actionPlans, key, targetLevel),
    }));
  const handleUpdateActionPlanField = <K extends keyof ActionPlanEntry>(
    key: string,
    field: K,
    value: ActionPlanEntry[K],
  ) =>
    updateActive((a) => ({
      ...a,
      actionPlans: updateActionPlanField(a.actionPlans, key, field, value),
    }));
  const handleRemoveActionPlan = (key: string) =>
    updateActive((a) => ({
      ...a,
      actionPlans: removeActionPlan(a.actionPlans, key),
    }));

  const handleAddPlanListItem = (
    key: string,
    field: "objectives" | "outputs",
  ) =>
    updateActive((a) => ({
      ...a,
      actionPlans: addPlanListItem(a.actionPlans, key, field, newId),
    }));
  const handleUpdatePlanListItem = (
    key: string,
    field: "objectives" | "outputs",
    id: string,
    text: string,
  ) =>
    updateActive((a) => ({
      ...a,
      actionPlans: updatePlanListItem(a.actionPlans, key, field, id, text),
    }));
  const handleRemovePlanListItem = (
    key: string,
    field: "objectives" | "outputs",
    id: string,
  ) =>
    updateActive((a) => ({
      ...a,
      actionPlans: removePlanListItem(a.actionPlans, key, field, id),
    }));
  const handleAddPlanTask = (key: string) =>
    updateActive((a) => ({
      ...a,
      actionPlans: addPlanTask(a.actionPlans, key, newId),
    }));
  const handleTogglePlanTask = (key: string, itemId: string) =>
    updateActive((a) => ({
      ...a,
      actionPlans: togglePlanTask(a.actionPlans, key, itemId),
    }));
  const handleUpdatePlanTaskLabel = (
    key: string,
    itemId: string,
    label: string,
  ) =>
    updateActive((a) => ({
      ...a,
      actionPlans: updatePlanTaskLabel(a.actionPlans, key, itemId, label),
    }));
  const handleRemovePlanTask = (key: string, itemId: string) =>
    updateActive((a) => ({
      ...a,
      actionPlans: removePlanTask(a.actionPlans, key, itemId),
    }));

  const handleRescueOrphan = (originalKey: string, targetKey: string) =>
    updateActive((a) => rescueOrphanedEntry(a, originalKey, targetKey));

  const handleDiscardOrphan = (originalKey: string) =>
    updateActive((a) => discardOrphanedEntry(a, originalKey));

  const handleReset = () => setResetOpen(true);

  const handleResetConfirm = (scopes: ResetScopes) => {
    updateActive((a) =>
      resetAssessment(a, scopes, {
        // initProgress currently ignores its 3rd arg and reseeds ALL loaded
        // extensions' category keys to level 0, so passing the assessment's
        // enabled-extension ids is self-documenting (and stays correct if the
        // arg is ever honored) without changing behavior today.
        emptyProgress: initProgress(
          data,
          extensionsData,
          a.enabledExtensions.map((e) => e.id),
        ),
      }),
    );
    setResetOpen(false);
  };

  const handleResetExtension = (extensionId: string) => {
    const ext = extensionsData.find((e) => e.extension.id === extensionId);
    if (!ext) return;

    setProgress((prevProgress) => {
      const newProgress = { ...prevProgress };
      for (const module of ext.relevance.modules) {
        for (const category of module.categories) {
          const key = `${extensionId}.${module.id}.${category.id}`;
          newProgress[key] = makeProgressEntry();
        }
      }
      return newProgress;
    });
  };

  const handleToggleExtension = (extensionId: string) => {
    setEnabledExtensions((prev) => {
      if (prev.includes(extensionId)) {
        return prev.filter((id) => id !== extensionId);
      } else {
        return [...prev, extensionId];
      }
    });
  };

  const handleUploadExtension = async (file: File) => {
    setExtensionUploadError(undefined);
    const text = await file.text();
    const result = parseExtensionFile(text);
    if (!result.ok) {
      setExtensionUploadError(result.error);
      return;
    }
    const id = result.extension.extension.id;
    const existing = extensionsData.find((x) => x.extension.id === id);
    if (
      existing &&
      !window.confirm(
        `An extension with id "${id}" already exists (v${existing.extension.version} → v${result.extension.extension.version}). Replace it?`,
      )
    ) {
      return;
    }
    const adapter = await getStorageAdapter();
    await adapter.saveExtension(result.extension);
    await refreshExtensions();
  };

  const handleRemoveExtension = async (id: string) => {
    const adapter = await getStorageAdapter();
    await adapter.deleteExtension(id);
    await refreshExtensions();
  };

  // Collects every reference id cited by a module set, resolves through
  // the lookup, and dedupes — used by both PDF exporters to populate
  // the References appendix page.
  const collectReferencedEntries = (
    modulesToScan: AssessmentData["modules"],
  ): ReferenceEntry[] => {
    const ids = new Set<string>();
    for (const m of modulesToScan) {
      for (const c of m.categories) {
        for (const r of c.requirements ?? []) {
          if (Array.isArray(r.references)) {
            for (const id of r.references) ids.add(id);
          }
        }
      }
    }
    const out: ReferenceEntry[] = [];
    for (const id of ids) {
      const entry = referencesLookup.get(id);
      if (entry) out.push(entry);
    }
    return out;
  };

  const handleExportPDF = async (
    reportTier:
      "self" | "assessment" | "detailed" | "attestation" | "custom" = "self",
    filter?: RequirementFilterState,
    sections?: SectionKey[],
  ) => {
    if (!chartRef.current || !data) return;
    const chartElement = chartRef.current;

    await runPdfGeneration({
      setGenerating: setIsGeneratingPdf,
      beginCapture: () => beginCapture([]),
      endCapture,
      generate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const scoring = calculateWeightedMaturityScore(
          data,
          { progress, requirementProgress },
          profile.runtime.methodology,
        );
        const overallMaturityLevel = scoring.achievedLevel;
        const moduleMaturityLevels = scoring.moduleLevels;
        const url = generateURL({
          progress,
          enabledExtensions: [],
          dataVersion: data.version ?? "1.0.0",
          stateSchemaVersion: 1,
          assessmentName,
          assessorName,
          useCaseDescription,
          modules: data.modules,
          requirementProgress,
        });

        await exportToPDF({
          reportTier,
          sections,
          isTransient: isTransient(activeAssessment),
          progress,
          chartElement,
          overallMaturityLevel,
          moduleMaturityLevels,
          modules: data.modules,
          assessmentName,
          assessorName,
          useCaseDescription,
          assessmentUrl: url,
          version,
          dataVersion: data.version ?? "1.0.0",
          references: collectReferencedEntries(data.modules),
          requirementProgress,
          organizationName,
          assessorCompany,
          assessorPosition,
          assessmentType,
          startDate,
          targetDate,
          finishDate,
          pkiEnvironment,
          reportCompleteness: buildReportCompleteness(
            data.modules,
            progress,
            requirementProgress,
          ),
          workspace: activeAssessment?.workspace,
          actionPlans: activeAssessment?.actionPlans,
          comparison,
          reconciliationRows: reconciliation,
          comparisonBaselineName: comparisonBaseline?.name,
          comparisonBaselineDate:
            formatComparisonBaselineDate(comparisonBaseline),
          requirementFilter: filter,
          methodology: profile.runtime.methodology,
        });
      },
      onError: (error) => console.error("Error exporting to PDF:", error),
    });
  };

  const handleExportExtensionPDF = async (extensionId: string) => {
    const ext = extensionsData.find((e) => e.extension.id === extensionId);
    if (!ext || !data || !chartRef.current) return;
    const chartElement = chartRef.current;

    await runPdfGeneration({
      setGenerating: setIsGeneratingPdf,
      beginCapture: () => beginCapture([extensionId]),
      endCapture,
      generate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const chartCanvas = chartElement.querySelector(
          "canvas",
        ) as HTMLCanvasElement;
        const chartImgData = chartCanvas.toDataURL("image/png");

        await exportExtensionPDF({
          progress,
          extension: ext,
          coreModules: data.modules,
          references: collectReferencedEntries(data.modules),
          assessmentName,
          assessorName,
          useCaseDescription,
          version,
          dataVersion: data.version ?? "1.0.0",
          chartImgData,
          requirementProgress,
          methodology: profile.runtime.methodology,
        });
      },
      onError: (error) =>
        console.error("Error exporting extension PDF:", error),
    });
  };

  const handleTabClick = (tab: string) => {
    focusPanelOnNextTabChange.current = true;
    setCurrentTab(tab);
    resume.reportPosition({ view: viewMode.view, tab });
    const scrollQuerySelector = getComputedStyle(
      document.documentElement,
    ).getPropertyValue("--pkimm-scroll-query-selector");
    if (scrollQuerySelector === "window") {
      globalThis.scrollTo(0, 0);
    } else {
      const element = document.querySelector(scrollQuerySelector);
      if (element) {
        element.scrollTo(0, 0);
      }
    }
  };

  const handleMigrate = () => {
    if (!activeAssessment || !data) return;
    void getStorageAdapter().then((adapter) =>
      adapter.snapshotRevision(activeAssessment, "pre-migration"),
    );
    const result = migrate(activeAssessment, data, extensionsData);
    const now = new Date().toISOString();
    const migrated: SavedAssessment = buildMigratedAssessment(
      activeAssessment,
      result,
      data.version ?? "1.0.0",
      now,
      newId(),
    );
    setSavedState((prev) => ({
      ...prev,
      assessments: [...prev.assessments, migrated],
      activeId: migrated.id,
    }));
    setMigrationSummary(result.summary);
  };

  const handleStartFresh = () => {
    if (!data) return;
    const created = newEmptyAssessment(
      data.version ?? "1.0.0",
      buildStructureSnapshot(data),
    );
    setSavedState((prev) => ({
      ...prev,
      assessments: [...prev.assessments, created],
      activeId: created.id,
    }));
    if (activeAssessment) setMigrationDismissedFor(activeAssessment.id);
  };

  const handleManagerSelect = (id: string): void => {
    setSavedState((prev) => ({ ...prev, activeId: id }));
    setCurrentTab("report");
  };

  const handleManagerCreateNew = (): void => {
    if (!data) return;
    const created = newEmptyAssessment(
      data.version ?? "1.0.0",
      buildStructureSnapshot(data),
    );
    setSavedState((prev) => ({
      ...prev,
      assessments: [...prev.assessments, created],
      activeId: created.id,
    }));
    setCurrentTab("overview");
  };

  const handleManagerRename = (id: string, name: string): void => {
    void withRowLock(id, () => {
      const now = new Date().toISOString();
      setSavedState((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === id ? { ...a, name, meta: { ...a.meta, updatedAt: now } } : a,
        ),
      }));
    });
  };

  const handleManagerDuplicate = (id: string): void => {
    const src = savedState.assessments.find((a) => a.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    const copy: SavedAssessment = {
      ...src,
      id: newId(),
      name: `${src.name} (copy)`,
      meta: { createdAt: now, updatedAt: now, importedFromId: src.id },
    };
    setSavedState((prev) => ({
      ...prev,
      assessments: [...prev.assessments, copy],
      activeId: copy.id,
    }));
  };

  const handleManagerDelete = (id: string): void => {
    void withRowLock(id, () => {
      markDeleted(id);
      setSavedState((prev) => {
        const remaining = prev.assessments.filter((a) => a.id !== id);
        const activeId =
          prev.activeId === id ? (remaining[0]?.id ?? null) : prev.activeId;
        return { ...prev, assessments: remaining, activeId };
      });
    });
  };

  const recordDownload = (id: string): void => {
    const exportedAt = new Date().toISOString();
    void getStorageAdapter()
      .then((adapter) => adapter.recordExport(id, exportedAt))
      .then(() => {
        if (id === savedState.activeId) setActiveLastExportAt(exportedAt);
      });
  };

  // The single download: lossless YAML. It round-trips every field,
  // including requirementProgress and full-assessment metadata, when the
  // assessment has that content; a quick assessment omits those v2 fields, but
  // the payload still carries id/meta/exportedAt (so not byte-identical to the
  // pre-v2 shape — v1 consumers ignore the extra keys).
  const handleManagerDownload = (id: string): void => {
    const a = savedState.assessments.find((x) => x.id === id);
    if (!a) return;
    downloadAssessmentYAML(a);
    recordDownload(id);
  };

  // Same download, invoked from the Report tab's action bar for the
  // currently active assessment.
  const handleActiveDownload = (): void => {
    if (!activeAssessment) return;
    downloadAssessmentYAML(activeAssessment);
    recordDownload(activeAssessment.id);
  };

  const addImportedAssessment = (imported: SavedAssessment): void => {
    // If this id was deleted moments ago and that delete hasn't flushed to
    // storage yet, the queued deleteIds would otherwise still ride along on
    // the next debounced write and unconditionally win over this add (see
    // unmarkDeleted's doc comment in useTabPersistence).
    unmarkDeleted(imported.id);
    setSavedState((prev) => ({
      ...prev,
      assessments: [...prev.assessments, imported],
      activeId: imported.id,
    }));
  };

  const handleManagerUpload = async (file: File): Promise<void> => {
    // Clear any stale refusal banner from a previous too-new upload before
    // this attempt runs — otherwise a subsequent valid upload (or just
    // revisiting the tab) leaves the old "could not be imported" message
    // on screen indefinitely, since nothing else ever resets this state.
    setImportForwardIncompatible(null);
    let text: string;
    try {
      text = await file.text();
    } catch (err) {
      console.error("Failed to read file:", err);
      globalThis.alert(
        `Could not read file: ${(err as Error).message || "unknown error"}`,
      );
      return;
    }
    const result = importAssessmentFile(text);
    if (!result.ok) {
      if (result.forwardIncompatible) {
        // A file exported by a newer widget: keep the raw bytes available
        // for re-download rather than dropping them behind a bare alert —
        // same "your data is safe" contract as the stored-state refusal.
        setImportForwardIncompatible({
          message: result.error,
          rawText: text,
          fileName: file.name,
        });
        return;
      }
      console.error("Failed to import file:", result.error);
      globalThis.alert(`Could not import file: ${result.error}`);
      return;
    }
    const imported = normalizeAssessmentActionPlans(result.assessment);
    const existing = savedState.assessments.find((a) => a.id === imported.id);
    if (existing) {
      // v2 imports preserve assessment.id; v1/legacy imports always mint a
      // fresh one via newId(), so only a v2 re-import can land here.
      setImportCollision({ existing, incoming: imported });
      return;
    }
    // No assessment with this id is currently loaded — but its id may still
    // be tombstoned (this browser deleted an assessment with that id in the
    // past; deletions are retained for TOMBSTONE_TTL_MS to survive stale
    // cross-tab flushes). writeSavedState's tombstone guard skips any
    // incoming record whose meta.updatedAt predates the tombstone, which
    // would otherwise silently drop a perfectly legitimate re-import of an
    // old export. Bumping updatedAt to "now" — the same move Replace makes
    // against the stored-newer-wins guard — defeats that guard too, since
    // this really is a brand-new write from the user's point of view.
    addImportedAssessment({
      ...imported,
      meta: { ...imported.meta, updatedAt: new Date().toISOString() },
    });
  };

  const handleSelectStoredBaseline = (id: string): void => {
    setComparisonBaseline(
      savedState.assessments.find((a) => a.id === id) ?? null,
    );
  };

  const handleSelectFileBaseline = (text: string): void => {
    const result = importAssessmentFile(text);
    if (result.ok) {
      setComparisonBaseline(normalizeAssessmentActionPlans(result.assessment));
    } else {
      globalThis.alert(
        result.forwardIncompatible
          ? "That file was produced by a newer widget and can't be read here."
          : result.error,
      );
    }
  };

  const handleClearComparison = (): void => setComparisonBaseline(null);

  const handleImportReplace = (): void => {
    if (!importCollision) return;
    const { existing, incoming } = importCollision;
    setImportCollision(null);
    void (async () => {
      const adapter = await getStorageAdapter();
      // Snapshot the about-to-be-overwritten local copy FIRST so Replace is
      // always recoverable from History.
      await adapter.snapshotRevision(existing, "pre-import");
      // CRITICAL: bump updatedAt on the incoming record before it ever
      // reaches writeSavedState. That function's merge-on-write guard
      // (storageAdapter.ts) keeps whichever copy has the newer
      // meta.updatedAt — an imported file older than the local copy would
      // otherwise be silently dropped, defeating this explicit Replace.
      // Mirrors how restoreRevision bumps updatedAt before its own write.
      const replacement: SavedAssessment = {
        ...incoming,
        meta: { ...incoming.meta, updatedAt: new Date().toISOString() },
      };
      setSavedState((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === replacement.id ? replacement : a,
        ),
        activeId: replacement.id,
      }));
      notify();
    })();
  };

  const handleImportKeepBoth = (): void => {
    if (!importCollision) return;
    const { incoming } = importCollision;
    setImportCollision(null);
    const now = new Date().toISOString();
    const copy: SavedAssessment = {
      ...incoming,
      id: newId(),
      name: `${incoming.name} (imported)`,
      meta: { ...incoming.meta, updatedAt: now, importedFromId: incoming.id },
    };
    addImportedAssessment(copy);
  };

  const handleImportMerge = (strategy: MergeStrategy): void => {
    if (!importCollision) return;
    const { existing, incoming } = importCollision;
    setImportCollision(null);
    void (async () => {
      const adapter = await getStorageAdapter();
      // Snapshot the local copy before it's overwritten by the merge result
      // so Merge is always recoverable from History, mirroring Replace.
      await adapter.snapshotRevision(existing, "pre-merge");
      const m = mergeAssessments(existing, incoming, strategy);
      // Bump updatedAt for the same reason Replace does: the merged record
      // must win writeSavedState's stored-newer-wins guard regardless of
      // which side's updatedAt was actually more recent.
      const merged: SavedAssessment = {
        ...m,
        meta: { ...m.meta, updatedAt: new Date().toISOString() },
      };
      setSavedState((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === merged.id ? merged : a,
        ),
        activeId: merged.id,
      }));
      notify();
    })();
  };

  const handleImportCancel = (): void => setImportCollision(null);

  const handleDownloadForwardIncompatibleFile = (): void => {
    if (!importForwardIncompatible) return;
    const blob = new Blob([importForwardIncompatible.rawText], {
      type: "text/yaml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = importForwardIncompatible.fileName || "assessment.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleManagerImportLegacy = (): void => {
    // Use the unguarded read here — the Assessment Manager fires this
    // action after the user explicitly asked to import, even though
    // pkimm-sa already exists. detectLegacyAssessmentData would refuse
    // to return the payload in that case.
    const legacy = readLegacyAssessmentData();
    if (!legacy || !data) return;
    const assessment = importLegacyData(legacy);
    const { progress: reclassified } = reclassifyUntouchedLevelOne(
      assessment.progress,
      data,
    );
    assessment.progress = reclassified;
    setSavedState((prev) => ({
      ...prev,
      assessments: [...prev.assessments, assessment],
      activeId: assessment.id,
    }));
    setCurrentTab("report");
  };

  const handleManagerRemoveLegacy = (): void => {
    removeLegacyAssessmentData();
    setHasLegacyData(false);
  };

  const handleDownloadRawSavedState = (): void => {
    void (async () => {
      let raw: string;
      try {
        const adapter = await getStorageAdapter();
        raw = await adapter.dumpRaw();
      } catch {
        // Refusal raised during init/import: the offending bytes live in
        // localStorage — dump those.
        raw = localStorage.getItem(STORAGE_KEY) ?? "";
      }
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pkimm-sa-raw.json";
      a.click();
      URL.revokeObjectURL(url);
    })();
  };

  const handleKeepHiddenExtension = (extensionId: string) => {
    setHiddenExtensions(new Set(hiddenExtensions).add(extensionId));
  };

  const clearURLHash = (): void => {
    if (globalThis.history && globalThis.location.hash) {
      globalThis.history.replaceState(
        null,
        "",
        globalThis.location.pathname + globalThis.location.search,
      );
    }
  };

  const handleSaveTransient = () => {
    if (!activeAssessment || !isTransient(activeAssessment)) return;
    const now = new Date().toISOString();
    const permanent: SavedAssessment = {
      ...activeAssessment,
      id: newId(),
      meta: { ...activeAssessment.meta, updatedAt: now },
    };
    setSavedState((prev) => ({
      ...prev,
      activeId: permanent.id,
      assessments: [
        ...prev.assessments.filter((a) => !isTransient(a)),
        permanent,
      ],
    }));
    clearURLHash();
  };

  const handleDiscardTransient = () => {
    setSavedState((prev) => {
      const remaining = prev.assessments.filter((a) => !isTransient(a));
      return {
        ...prev,
        assessments: remaining,
        activeId: remaining[0]?.id ?? null,
      };
    });
    clearURLHash();
  };

  const handleLegacyImport = () => {
    if (!legacyPrompt || !data) return;
    const assessment = importLegacyData(legacyPrompt);
    const { progress: reclassifiedProgress } = reclassifyUntouchedLevelOne(
      assessment.progress,
      data,
    );
    assessment.progress = reclassifiedProgress;
    setSavedState({
      stateSchemaVersion: 1,
      activeId: assessment.id,
      assessments: [assessment],
    });
    setLegacyPrompt(null);
    setCurrentTab("report");
  };

  const handleLegacyKeepSeparate = () => {
    if (!data) return;
    const created = newEmptyAssessment(
      data.version ?? "1.0.0",
      buildStructureSnapshot(data),
    );
    setSavedState({
      stateSchemaVersion: 1,
      activeId: created.id,
      assessments: [created],
    });
    setLegacyPrompt(null);
  };

  const handleAssessmentName = (name: string) => setAssessmentName(name);
  const handleAssessorName = (name: string) => setAssessorName(name);
  const handleUseCaseDescription = (description: string) =>
    setUseCaseDescription(description);

  const chartLabels =
    data?.modules.reduce((acc, module) => {
      module.categories.forEach((category) => {
        acc.push(`${module.id}.${category.id}`);
      });
      return acc;
    }, [] as string[]) || [];

  const weightedScore = data
    ? calculateWeightedMaturityScore(
        data,
        { progress, requirementProgress },
        profile.runtime.methodology,
      )
    : null;
  const moduleMaturityLevels = weightedScore?.moduleLevels ?? [];
  const overallChartMaturityLevel = weightedScore?.achievedLevel ?? 0;
  // Unfloored counterparts of the two rollups above — same args, same
  // source numbers — so the right-rail bars can fill by fractional
  // progress toward the next level instead of jumping in whole-level
  // steps. The profile's rounding policy is applied only to the displayed
  // achieved level, while these values intentionally remain fractional.
  const moduleMaturityRaw = weightedScore?.moduleRawLevels ?? [];
  const overallMaturityRaw = weightedScore?.rawLevel ?? 0;
  const extensionMaturityLevels = data
    ? calculateExtensionMaturityLevels(
        data.modules,
        extensionsData,
        enabledExtensions,
        progress,
        requirementProgress,
        profile.runtime.methodology.parameters,
      )
    : [];

  // Category-grain completeness counts backing the right-rail "X of Y
  // assessed" figures: every applicable category counts once (assessed when
  // its effective level > 0), Not Applicable categories excluded. Requirement
  // -level completeness is a separate figure shown on the Evaluation tab.
  const categoryGrainCounts = data
    ? computeCategoryGrainCounts(data.modules, progress, requirementProgress)
    : null;

  // Flattened requirement list offered by the Workspace tab's orphaned-entry
  // rescue picker; `assessed` lets it warn before overwriting existing work.
  const requirementChoices = (data?.modules ?? []).flatMap((m) =>
    m.categories.flatMap((c) =>
      c.requirements.map((r) => {
        const key = `${m.id}.${c.id}.${r.id}`;
        return {
          key,
          label: r.description,
          assessed: !isDefaultRequirementProgress(requirementProgress?.[key]),
        };
      }),
    ),
  );

  // Per-requirement POC/artifact link options threaded down through
  // Module -> Category -> FullCategory -> RequirementCard.
  const workspaceLinks = {
    pocs: activeAssessment?.workspace?.pocs ?? [],
    artifacts: (activeAssessment?.workspace?.artifacts ?? []).map(
      ({ id, title }) => ({ id, title }),
    ),
  };

  const saveStatus = deriveSaveStatus({
    backend: storageBackend,
    isSaving,
    lastSavedAt,
    saveError,
    exportNudge: shouldNudgeExport({
      updatedAt: activeAssessment?.meta.updatedAt ?? null,
      lastExportAt: activeLastExportAt,
      persisted,
      now: new Date().toISOString(),
    }),
  });

  const alignedBaseline =
    comparisonBaseline && data
      ? alignBaseline(comparisonBaseline, data, extensionsData)
      : null;
  const comparison =
    alignedBaseline && data
      ? buildComparison({
          modules: data.modules,
          currentProgress: progress,
          currentRequirementProgress: activeAssessment?.requirementProgress,
          baselineProgress: alignedBaseline.progress,
          baselineRequirementProgress: alignedBaseline.requirementProgress,
          methodology: profile.runtime.methodology,
        })
      : null;
  const reconciliation =
    alignedBaseline && comparison
      ? buildActionPlanReconciliation(alignedBaseline.actionPlans, comparison)
      : [];
  const baselineOptions = savedState.assessments
    .filter((a) => a.id !== savedState.activeId)
    .map(({ id, name }) => ({ id, name }));

  // Drives the Custom report's disabled-checkbox + reason UI in
  // UnifiedReport — a key present here has no data right now, so its
  // checkbox is disabled and force-excluded from the exported set.
  const sectionAvailability: Partial<Record<SectionKey, string>> = {};
  if (!comparisonBaseline) {
    sectionAvailability.comparison = "No baseline selected";
  }
  if (!Object.values(pkiEnvironment).some(Boolean)) {
    sectionAvailability.pkiEnvironment = "No PKI environment entered";
  }
  if (collectReferencedEntries(data?.modules ?? []).length === 0) {
    sectionAvailability.references = "No references";
  }
  if (
    buildRequirementDetailRows({
      modules: data?.modules ?? [],
      progress,
      requirementProgress: requirementProgress ?? {},
    }).length === 0
  ) {
    sectionAvailability.requirementDetails = "No in-scope requirements";
  }
  if (
    buildGapToNextLevel({
      modules: data?.modules ?? [],
      progress,
      requirementProgress: requirementProgress ?? {},
    }).length === 0
  ) {
    sectionAvailability.gapToNext = "No gap to a next level";
  }
  if (
    buildActionPlanRows({
      modules: data?.modules ?? [],
      progress,
      requirementProgress: requirementProgress ?? {},
      actionPlans: activeAssessment?.actionPlans,
      pocs: activeAssessment?.workspace?.pocs,
    }).length === 0
  ) {
    sectionAvailability.actionPlans = "No action plans";
  }

  if (forwardCompatFailure) {
    return (
      <ForwardCompatRefusal
        message={forwardCompatFailure}
        onDownloadRaw={handleDownloadRawSavedState}
      />
    );
  }

  return (
    <AssessmentTargetProvider
      availableExtensions={extensionsData}
      coreModules={data?.modules || []}
      progress={progress}
      requirementProgress={activeAssessment?.requirementProgress ?? {}}
      enabledExtensions={enabledExtensions}
      methodology={profile.runtime.methodology}
    >
      <HelpBridge
        tab={currentTab}
        view={viewMode.view}
        moduleIds={data?.modules.map((m) => m.id) ?? []}
        moduleLabels={Object.fromEntries(
          (data?.modules ?? []).map((m) => [m.id, m.name]),
        )}
      >
        <div className="pkimm-assessment-container">
          <header className="pkimm-main-header">
            <div className="pkimm-header-top">
              <img
                src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjU2IDMyNCI+Cgk8c3R5bGU+CgkJdHNwYW4geyB3aGl0ZS1zcGFjZTogcHJlIH0KCQkuc2hwMCB7IGZpbGw6IGJsYWNrIH0gCgk8L3N0eWxlPgoJPHBhdGggaWQ9Ik5hbWUiIGNsYXNzPSJzaHAwIiBkPSJNNDQxLjUgMTY1LjYzTDQ0MS41IDE3LjdMNTYwLjAyIDE3LjdDNTY4LjA0IDE3LjcgNTc1LjAzIDIwLjU4IDU4MSAyNi4zNEM1ODYuNzYgMzIuMyA1ODkuNjQgMzkuMyA1ODkuNjQgNDcuMzJMNTg5LjY0IDg2LjQxQzU4OS42NCA5NC40NCA1ODYuNzYgMTAxLjIzIDU4MSAxMDYuOTlDNTc1LjAzIDExMi45NiA1NjguMDQgMTE1Ljg0IDU2MC4wMiAxMTUuODRMNDcxLjEzIDExNi4wNUw0NzEuMTMgMTY1LjYzTDQ0MS41IDE2NS42M1pNNDc3LjkyIDg2LjIxTDU1Mi44MSA4Ni4yMUM1NTYuOTMgODYuMjEgNTU5LjE5IDg2LjAxIDU1OS40IDg1LjhDNTU5LjYgODUuNTkgNTU5LjgxIDgzLjMzIDU1OS44MSA3OS4yMUw1NTkuODEgNTQuMTFDNTU5LjgxIDUwIDU1OS42IDQ3Ljc0IDU1OS40IDQ3LjUzQzU1OS4xOSA0Ny4zMiA1NTYuOTMgNDcuMzIgNTUyLjgxIDQ3LjMyTDQ3Ny45MiA0Ny4zMkM0NzMuODEgNDcuMzIgNDcxLjc1IDQ3LjMyIDQ3MS41NCA0Ny41M0M0NzEuMzQgNDcuNzQgNDcxLjEzIDUwIDQ3MS4xMyA1NC4xMUw0NzEuMTMgNzkuMjFDNDcxLjEzIDgzLjMzIDQ3MS4zNCA4NS41OSA0NzEuNTQgODUuOEM0NzEuNzUgODYuMDEgNDczLjgxIDg2LjIxIDQ3Ny45MiA4Ni4yMVpNNjM0LjA2IDE2NS42M0w2MzQuMDYgMTcuNDlMNjYzLjg5IDE3LjQ5TDY2My44OSA3Ni43NEw2OTUuNzggNzYuNzRMNzQ1LjM3IDE3LjQ5TDc3Ni44NSAxNy40OUw3NzYuODUgMjYuOTVMNzIyLjUzIDkxLjU2TDc3Ni44NSAxNTYuMTdMNzc2Ljg1IDE2NS42M0w3NDUuMzcgMTY1LjYzTDY5NS43OCAxMDYuMzhMNjYzLjg5IDEwNi4zOEw2NjMuODkgMTY1LjYzTDYzNC4wNiAxNjUuNjNaTTgyNi42MiAxNjUuNjNMODI2LjYyIDE3LjQ5TDg1NS44NCAxNy40OUw4NTUuODQgMTY1LjYzTDgyNi42MiAxNjUuNjNaTTQ1Ny4yOCAzMDYuNTNDNDUyLjk2IDMwNi41MyA0NDkuMjIgMzA1LjAxIDQ0Ni4xOSAzMDEuODZDNDQzLjA0IDI5OC44MyA0NDEuNTIgMjk1LjA5IDQ0MS41MiAyOTAuNzdMNDQxLjUyIDIzOC4yNUM0NDEuNTIgMjMzLjkzIDQ0My4wNCAyMzAuMTkgNDQ2LjE5IDIyNy4wNEM0NDkuMjIgMjI0LjAxIDQ1Mi45NiAyMjIuNDkgNDU3LjI4IDIyMi40OUw1MjUuMzMgMjIyLjQ5TDUyNS4zMyAyMzYuNjFMNDU5LjczIDIzNi42MUM0NTcuNzQgMjM2LjYxIDQ1Ni41OCAyMzYuODUgNDU2LjIyIDIzNy4yQzQ1NS43NiAyMzcuNTUgNDU1LjUzIDIzOC43MSA0NTUuNTMgMjQwLjdMNDU1LjUzIDI4OC4zMkM0NTUuNTMgMjkwLjMxIDQ1NS43NiAyOTEuNDcgNDU2LjIyIDI5MS44MkM0NTYuNTggMjkyLjE3IDQ1Ny43NCAyOTIuNDEgNDU5LjczIDI5Mi40MUw1MjUuMzMgMjkyLjQxTDUyNS4zMyAzMDYuNTNMNDU3LjI4IDMwNi41M1pNNTYyLjIgMzA2LjUzQzU1Ny44OCAzMDYuNTMgNTU0LjI3IDMwNS4wMSA1NTEuMjMgMzAxLjg2QzU0OC4wOCAyOTguODMgNTQ2LjU2IDI5NS4yMSA1NDYuNTYgMjkwLjg5TDU0Ni41NiAyNTQuNDdDNTQ2LjU2IDI1MC4xNSA1NDguMDggMjQ2LjUzIDU1MS4yMyAyNDMuMzhDNTU0LjI3IDI0MC4zNSA1NTcuODggMjM4LjgzIDU2Mi4yIDIzOC44M0w1OTkuNjcgMjM4LjgzQzYwMy45OSAyMzguODMgNjA3LjczIDI0MC4zNSA2MTAuNzYgMjQzLjM4QzYxMy43OSAyNDYuNTMgNjE1LjMxIDI1MC4xNSA2MTUuMzEgMjU0LjQ3TDYxNS4zMSAyOTAuODlDNjE1LjMxIDI5NS4yMSA2MTMuNzkgMjk4LjgzIDYxMC43NiAzMDEuODZDNjA3LjczIDMwNS4wMSA2MDMuOTkgMzA2LjUzIDU5OS42NyAzMDYuNTNMNTYyLjIgMzA2LjUzWk01NjQuNjUgMjkyLjY0TDU5Ny4yMiAyOTIuNjRDNTk5LjIgMjkyLjY0IDYwMC4zNyAyOTIuNDEgNjAwLjg0IDI5MS45NEM2MDEuMTkgMjkxLjU5IDYwMS40MiAyOTAuNDIgNjAxLjQyIDI4OC40NEw2MDEuNDIgMjU2LjkyQzYwMS40MiAyNTQuOTQgNjAxLjE5IDI1My43NyA2MDAuODQgMjUzLjNDNjAwLjM3IDI1Mi45NSA1OTkuMiAyNTIuNzIgNTk3LjIyIDI1Mi43Mkw1NjQuNjUgMjUyLjcyQzU2Mi42NyAyNTIuNzIgNTYxLjUgMjUyLjk1IDU2MS4xNSAyNTMuM0M1NjAuNjkgMjUzLjc3IDU2MC40NSAyNTQuOTQgNTYwLjQ1IDI1Ni45Mkw1NjAuNDUgMjg4LjQ0QzU2MC40NSAyOTAuNDIgNTYwLjY5IDI5MS41OSA1NjEuMTUgMjkxLjk0QzU2MS41IDI5Mi40MSA1NjIuNjcgMjkyLjY0IDU2NC42NSAyOTIuNjRaTTYzNC43OSAzMDYuNTNMNjM0Ljc5IDIzOC44M0w2ODguMDIgMjM4LjgzQzY5Mi4zNCAyMzguODMgNjk1Ljk2IDI0MC4zNSA2OTguOTkgMjQzLjM4QzcwMi4wMyAyNDYuNTMgNzAzLjU0IDI1MC4xNSA3MDMuNTQgMjU0LjQ3TDcwMy41NCAzMDYuNTNMNjg5LjY1IDMwNi41M0w2ODkuNjUgMjU2LjkyQzY4OS42NSAyNTQuOTQgNjg5LjQyIDI1My43NyA2ODkuMDcgMjUzLjNDNjg4LjYgMjUyLjk1IDY4Ny40NCAyNTIuNzIgNjg1LjQ1IDI1Mi43Mkw2NTMgMjUyLjcyQzY1MS4wMiAyNTIuNzIgNjQ5Ljg1IDI1Mi45NSA2NDkuMzggMjUzLjNDNjQ4LjkyIDI1My43NyA2NDguNjggMjU0Ljk0IDY0OC42OCAyNTYuOTJMNjQ4LjY4IDMwNi41M0w2MzQuNzkgMzA2LjUzWk03MzkuMzcgMzA2LjUzQzczNS4wNSAzMDYuNTMgNzMxLjQzIDMwNS4wMSA3MjguNCAzMDEuODZDNzI1LjI0IDI5OC44MyA3MjMuNzMgMjk1LjIxIDcyMy43MyAyOTAuODlMNzIzLjczIDI4OC42N0w3MzcuNjIgMjg4LjY3TDczNy42MiAyODkuNDlDNzM3LjYyIDI5MC43NyA3MzcuODUgMjkxLjU5IDczOC4zMiAyOTEuOTRDNzM4LjY3IDI5Mi40MSA3MzkuNDkgMjkyLjY0IDc0MC43NyAyOTIuNjRMNzc1LjQ0IDI5Mi42NEM3NzYuNzIgMjkyLjY0IDc3Ny41NCAyOTIuNDEgNzc4LjAxIDI5MS45NEM3NzguMzUgMjkxLjU5IDc3OC41OSAyOTAuNzcgNzc4LjU5IDI4OS40OUw3NzguNTkgMjgyLjg0Qzc3OC41OSAyODEuNTUgNzc4LjM1IDI4MC43MyA3NzguMDEgMjgwLjI3Qzc3Ny41NCAyNzkuOTIgNzc2LjcyIDI3OS42OSA3NzUuNDQgMjc5LjY5TDczOS4zNyAyNzkuNjlDNzM1LjA1IDI3OS42OSA3MzEuNDMgMjc4LjE3IDcyOC40IDI3NS4wMkM3MjUuMjQgMjcxLjk4IDcyMy43MyAyNjguMzYgNzIzLjczIDI2NC4wNEw3MjMuNzMgMjU0LjQ3QzcyMy43MyAyNTAuMTUgNzI1LjI0IDI0Ni41MyA3MjguNCAyNDMuMzhDNzMxLjQzIDI0MC4zNSA3MzUuMDUgMjM4LjgzIDczOS4zNyAyMzguODNMNzc2Ljg0IDIzOC44M0M3ODEuMTYgMjM4LjgzIDc4NC44OSAyNDAuMzUgNzg4LjA0IDI0My4zOEM3OTEuMDggMjQ2LjUzIDc5Mi41OSAyNTAuMTUgNzkyLjU5IDI1NC40N0w3OTIuNTkgMjU2LjY5TDc3OC41OSAyNTYuNjlMNzc4LjU5IDI1NS44N0M3NzguNTkgMjU0LjU5IDc3OC4zNSAyNTMuNzcgNzc4LjAxIDI1My4zQzc3Ny41NCAyNTIuOTUgNzc2LjcyIDI1Mi43MiA3NzUuNDQgMjUyLjcyTDc0MC43NyAyNTIuNzJDNzM5LjQ5IDI1Mi43MiA3MzguNjcgMjUyLjk1IDczOC4zMiAyNTMuM0M3MzcuODUgMjUzLjc3IDczNy42MiAyNTQuNTkgNzM3LjYyIDI1NS44N0w3MzcuNjIgMjYyLjUyQzczNy42MiAyNjMuODEgNzM3Ljg1IDI2NC42MyA3MzguMzIgMjY0Ljk4QzczOC42NyAyNjUuNDQgNzM5LjQ5IDI2NS42OCA3NDAuNzcgMjY1LjY4TDc3Ni44NCAyNjUuNjhDNzgxLjE2IDI2NS42OCA3ODQuODkgMjY3LjE5IDc4OC4wNCAyNzAuMjNDNzkxLjA4IDI3My4zOCA3OTIuNTkgMjc3IDc5Mi41OSAyODEuMzJMNzkyLjU5IDI5MC44OUM3OTIuNTkgMjk1LjIxIDc5MS4wOCAyOTguODMgNzg4LjA0IDMwMS44NkM3ODQuODkgMzA1LjAxIDc4MS4xNiAzMDYuNTMgNzc2Ljg0IDMwNi41M0w3MzkuMzcgMzA2LjUzWk04MjguMTkgMzA2LjUzQzgyMy44NyAzMDYuNTMgODIwLjI1IDMwNS4wMSA4MTcuMjIgMzAxLjg2QzgxNC4wNiAyOTguODMgODEyLjU1IDI5NS4yMSA4MTIuNTUgMjkwLjg5TDgxMi41NSAyNTQuNDdDODEyLjU1IDI1MC4xNSA4MTQuMDYgMjQ2LjUzIDgxNy4yMiAyNDMuMzhDODIwLjI1IDI0MC4zNSA4MjMuODcgMjM4LjgzIDgyOC4xOSAyMzguODNMODY1LjY2IDIzOC44M0M4NjkuOTggMjM4LjgzIDg3My43MSAyNDAuMzUgODc2Ljc0IDI0My4zOEM4NzkuNzggMjQ2LjUzIDg4MS4zIDI1MC4xNSA4ODEuMyAyNTQuNDdMODgxLjMgMjkwLjg5Qzg4MS4zIDI5NS4yMSA4NzkuNzggMjk4LjgzIDg3Ni43NCAzMDEuODZDODczLjcxIDMwNS4wMSA4NjkuOTggMzA2LjUzIDg2NS42NiAzMDYuNTNMODI4LjE5IDMwNi41M1pNODMwLjY0IDI5Mi42NEw4NjMuMjEgMjkyLjY0Qzg2NS4xOSAyOTIuNjQgODY2LjM2IDI5Mi40MSA4NjYuODIgMjkxLjk0Qzg2Ny4xNyAyOTEuNTkgODY3LjQxIDI5MC40MiA4NjcuNDEgMjg4LjQ0TDg2Ny40MSAyNTYuOTJDODY3LjQxIDI1NC45NCA4NjcuMTcgMjUzLjc3IDg2Ni44MiAyNTMuM0M4NjYuMzYgMjUyLjk1IDg2NS4xOSAyNTIuNzIgODYzLjIxIDI1Mi43Mkw4MzAuNjQgMjUyLjcyQzgyOC42NiAyNTIuNzIgODI3LjQ5IDI1Mi45NSA4MjcuMTQgMjUzLjNDODI2LjY3IDI1My43NyA4MjYuNDQgMjU0Ljk0IDgyNi40NCAyNTYuOTJMODI2LjQ0IDI4OC40NEM4MjYuNDQgMjkwLjQyIDgyNi42NyAyOTEuNTkgODI3LjE0IDI5MS45NEM4MjcuNDkgMjkyLjQxIDgyOC42NiAyOTIuNjQgODMwLjY0IDI5Mi42NFpNOTAwLjkgMzA2LjUzTDkwMC45IDI1NC40N0M5MDAuOSAyNTAuMTUgOTAyLjQxIDI0Ni41MyA5MDUuNTcgMjQzLjM4QzkwOC42IDI0MC4zNSA5MTIuMjIgMjM4LjgzIDkxNi41NCAyMzguODNMOTU0LjI0IDIzOC44M0w5NTQuMjQgMjUyLjcyTDkxOC45OSAyNTIuNzJDOTE3LjAxIDI1Mi43MiA5MTUuODQgMjUyLjk1IDkxNS40OSAyNTMuM0M5MTUuMDIgMjUzLjc3IDkxNC43OSAyNTQuOTQgOTE0Ljc5IDI1Ni45Mkw5MTQuNzkgMzA2LjUzTDkwMC45IDMwNi41M1pNOTg2LjkxIDMwNi41M0M5ODIuNTkgMzA2LjUzIDk3OC44NiAzMDUuMDEgOTc1LjgzIDMwMS44NkM5NzIuNzkgMjk4LjgzIDk3MS4yNyAyOTUuMjEgOTcxLjI3IDI5MC44OUw5NzEuMjcgMjE3LjdMOTg1LjE2IDIxNy43TDk4NS4xNiAyMzguODNMMTAxMi4yNCAyMzguODNMMTAxMi4yNCAyNTIuNzJMOTg1LjE2IDI1Mi43Mkw5ODUuMTYgMjg4LjQ0Qzk4NS4xNiAyOTAuNDIgOTg1LjQgMjkxLjU5IDk4NS44NiAyOTEuOTRDOTg2LjIxIDI5Mi40MSA5ODcuMzggMjkyLjY0IDk4OS4zNyAyOTIuNjRMMTAxMi4yNCAyOTIuNjRMMTAxMi4yNCAzMDYuNTNMOTg2LjkxIDMwNi41M1pNMTAzMS40OSAzMDYuNTNMMTAzMS40OSAyMzguODNMMTA0NS4zOCAyMzguODNMMTA0NS4zOCAzMDYuNTNMMTAzMS40OSAzMDYuNTNaTTEwMzEuNDkgMjMwLjY2TDEwMzEuNDkgMjE2LjY1TDEwNDUuMzggMjE2LjY1TDEwNDUuMzggMjMwLjY2TDEwMzEuNDkgMjMwLjY2Wk0xMDgyLjQ5IDMwNi41M0MxMDc4LjE3IDMwNi41MyAxMDc0LjQ0IDMwNS4wMSAxMDcxLjQgMzAxLjg2QzEwNjguMzYgMjk4LjgzIDEwNjYuODUgMjk1LjIxIDEwNjYuODUgMjkwLjg5TDEwNjYuODUgMjM4LjgzTDEwODAuNzQgMjM4LjgzTDEwODAuNzQgMjg4LjQ0QzEwODAuNzQgMjkwLjQyIDEwODAuOTcgMjkxLjU5IDEwODEuNDQgMjkxLjk0QzEwODEuNzkgMjkyLjQxIDEwODIuOTYgMjkyLjY0IDEwODQuOTQgMjkyLjY0TDExMTcuNTEgMjkyLjY0QzExMTkuNDkgMjkyLjY0IDExMjAuNjYgMjkyLjQxIDExMjEuMTIgMjkxLjk0QzExMjEuNDcgMjkxLjU5IDExMjEuNzEgMjkwLjQyIDExMjEuNzEgMjg4LjQ0TDExMjEuNzEgMjM4LjgzTDExMzUuNiAyMzguODNMMTEzNS42IDI5MC44OUMxMTM1LjYgMjk1LjIxIDExMzQuMDggMjk4LjgzIDExMzEuMDUgMzAxLjg2QzExMjguMDEgMzA1LjAxIDExMjQuMjggMzA2LjUzIDExMTkuOTYgMzA2LjUzTDEwODIuNDkgMzA2LjUzWk0xMTU0Ljk3IDMwNi41M0wxMTU0Ljk3IDIzOC44M0wxMjQwLjE4IDIzOC44M0MxMjQ0LjQ5IDIzOC44MyAxMjQ4LjIzIDI0MC4zNSAxMjUxLjI2IDI0My4zOEMxMjU0LjMgMjQ2LjUzIDEyNTUuODIgMjUwLjE1IDEyNTUuODIgMjU0LjQ3TDEyNTUuODIgMzA2LjUzTDEyNDEuOTMgMzA2LjUzTDEyNDEuOTMgMjU2LjkyQzEyNDEuOTMgMjU0Ljk0IDEyNDEuNjkgMjUzLjc3IDEyNDEuMzQgMjUzLjNDMTI0MC44NyAyNTIuOTUgMTIzOS43MSAyNTIuNzIgMTIzNy43MiAyNTIuNzJMMTIxNi43MSAyNTIuNzJDMTIxNC43MyAyNTIuNzIgMTIxMy41NiAyNTIuOTUgMTIxMy4yMSAyNTMuM0MxMjEyLjc0IDI1My43NyAxMjEyLjUxIDI1NC45NCAxMjEyLjUxIDI1Ni45MkwxMjEyLjUxIDMwNi41M0wxMTk4LjM5IDMwNi41M0wxMTk4LjM5IDI1Ni45MkMxMTk4LjM5IDI1NC45NCAxMTk4LjE1IDI1My43NyAxMTk3LjggMjUzLjNDMTE5Ny40NSAyNTIuOTUgMTE5Ni4yOSAyNTIuNzIgMTE5NC4zIDI1Mi43MkwxMTczLjE4IDI1Mi43MkMxMTcxLjE5IDI1Mi43MiAxMTcwLjAyIDI1Mi45NSAxMTY5LjY3IDI1My4zQzExNjkuMjEgMjUzLjc3IDExNjguOTcgMjU0Ljk0IDExNjguOTcgMjU2LjkyTDExNjguOTcgMzA2LjUzTDExNTQuOTcgMzA2LjUzWiIgLz4KCTxnIGlkPSJFbGVtZW50Ij4KCQk8cGF0aCBpZD0iQm90dG9tIiBjbGFzcz0ic2hwMCIgZD0iTTE4NS44MiAyODkuMzRDMTc3LjQyIDMwMy44OCAxNzUuNzggMzIzLjk2IDE1Ny4wMiAzMjMuOTZDMTM4LjI1IDMyMy45NiAxMzYuNiAzMDMuODggMTI4LjIxIDI4OS4zNEMxMDAuMTEgMjgzLjcyIDc0LjkyIDI3MC4wNCA1NS4xNiAyNTAuODFMNjkuNTcgMjM3LjE5QzkyLjI2IDI1OC45NyAxMjMuMDcgMjcyLjM2IDE1Ny4wMiAyNzIuMzZDMTkwLjk2IDI3Mi4zNiAyMjEuNzcgMjU4Ljk3IDI0NC40NSAyMzcuMTlMMjU4Ljg2IDI1MC44MUMyMzkuMSAyNzAuMDQgMjEzLjkyIDI4My43MiAxODUuODIgMjg5LjM0WiIgLz4KCQk8cGF0aCBpZD0iUmlnaHQiIGNsYXNzPSJzaHAwIiBkPSJNMTk2Ljc3IDUuNTJDMjIxLjEyIDEyLjM5IDI0Mi45IDI1LjQyIDI2MC4zIDQyLjgyQzI2Mi40NyA0NSAyNjQuNTggNDcuMjQgMjY2LjYxIDQ5LjU1QzI4My40MSA0OS41NSAzMDEuNjYgNDAuOTMgMzExLjA1IDU3LjE4QzMyMC40MiA3My40MyAzMDMuODYgODQuODkgMjk1LjQ2IDk5LjQzQzMwMC40IDExNC4wOSAzMDMuMDggMTI5Ljc5IDMwMy4wOCAxNDYuMTFDMzAzLjA4IDE1OC40OCAzMDEuNTQgMTcwLjUgMjk4LjY1IDE4MS45N0wyNzkuNjQgMTc2LjNDMjgyLjAxIDE2Ni42MyAyODMuMjggMTU2LjUyIDI4My4yOCAxNDYuMTFDMjgzLjI4IDExMS4yNCAyNjkuMTQgNzkuNjcgMjQ2LjMgNTYuODNDMjMxLjQ0IDQxLjk4IDIxMi45MSAzMC44MSAxOTIuMTggMjQuODFMMTk2Ljc3IDUuNTJaIiAvPgoJCTxwYXRoIGlkPSJMZWZ0IiBjbGFzcz0ic2hwMCIgZD0iTTE4LjM3IDk5LjkxQzkuOTggODUuMzcgLTYuNTkgNzMuOTEgMi43OSA1Ny42NkMxMi4xOCA0MS40MSAzMC40MiA1MC4wMyA0Ny4yMiA1MC4wM0M0OS4yNiA0Ny43MiA1MS4zNiA0NS40OCA1My41NCA0My4zQzcwLjk0IDI1LjkgOTIuNzEgMTIuODcgMTE3LjA3IDZMMTIxLjY2IDI1LjI5QzEwMC45MyAzMS4yOSA4Mi4zOSA0Mi40NiA2Ny41NCA1Ny4zMUM0NC43IDgwLjE1IDMwLjU2IDExMS43MiAzMC41NiAxNDYuNTlDMzAuNTYgMTU3IDMxLjgzIDE2Ny4xMSAzNC4yIDE3Ni43OEwxNS4xOSAxODIuNDVDMTIuMyAxNzAuOTggMTAuNzYgMTU4Ljk2IDEwLjc2IDE0Ni41OUMxMC43NiAxMzAuMjcgMTMuNDMgMTE0LjU3IDE4LjM3IDk5LjkxWiIgLz4KCQk8cGF0aCBpZD0iVGFibGUiIGNsYXNzPSJzaHAwIiBkPSJNMjI3LjI0IDc1Ljg4QzI0NS4yMiA5My44NSAyNTYuMzMgMTE4LjY4IDI1Ni4zMyAxNDYuMTFDMjU2LjMzIDE2MC42OCAyNTMuMTkgMTc0LjUzIDI0Ny41NSAxODYuOTlMMjg4LjQ1IDIxMC42MUwyNzguNjIgMjI3LjcxTDIzNy42NyAyMDQuMDZDMjM0LjUzIDIwOC40MyAyMzEuMDQgMjEyLjU0IDIyNy4yNCAyMTYuMzRDMjA5LjI2IDIzNC4zMSAxODQuNDMgMjQ1LjQzIDE1Ny4wMiAyNDUuNDNDMTI5LjU5IDI0NS40MyAxMDQuNzYgMjM0LjMxIDg2Ljc4IDIxNi4zNEM4Mi45OSAyMTIuNTQgNzkuNSAyMDguNDMgNzYuMzYgMjA0LjA2TDM1LjQxIDIyNy43MUwyNS41OCAyMTAuNjFMNjYuNDggMTg2Ljk5QzYwLjg0IDE3NC41MyA1Ny42OSAxNjAuNjggNTcuNjkgMTQ2LjExQzU3LjY5IDExOC42OCA2OC44MSA5My44NSA4Ni43OCA3NS44OEMxMDIuNTcgNjAuMSAxMjMuNjQgNDkuNiAxNDcuMTEgNDcuMjhMMTQ3LjExIDAuMDRMMTY2LjkyIDAuMDRMMTY2LjkyIDQ3LjI4QzE5MC4zOSA0OS42IDIxMS40NiA2MC4xIDIyNy4yNCA3NS44OFpNMjEzLjIzIDg5Ljg5QzE5OC44NSA3NS41IDE3OC45NyA2Ni42IDE1Ny4wMiA2Ni42QzEzNS4wNiA2Ni42IDExNS4xOCA3NS41IDEwMC43OSA4OS44OUM4Ni40IDEwNC4yNyA3Ny41IDEyNC4xNSA3Ny41IDE0Ni4xMUM3Ny41IDE2OC4wNiA4Ni40IDE4Ny45NCAxMDAuNzkgMjAyLjMzQzExNS4xOCAyMTYuNzIgMTM1LjA2IDIyNS42MSAxNTcuMDIgMjI1LjYxQzE3OC45NyAyMjUuNjEgMTk4Ljg1IDIxNi43MiAyMTMuMjMgMjAyLjMzQzIyNy42MyAxODcuOTUgMjM2LjUzIDE2OC4wNiAyMzYuNTMgMTQ2LjExQzIzNi41MyAxMjQuMTUgMjI3LjYzIDEwNC4yNyAyMTMuMjMgODkuODlaIiAvPgoJCTxwYXRoIGlkPSJLZXlob2xlIiBjbGFzcz0ic2hwMCIgZD0iTTE0Ni4wNCAxNDEuODFMMTMyLjMxIDE5NC45NUwxODEuNzIgMTk0Ljk1TDE2Ny45OSAxNDEuODFDMTc1LjUxIDEzNy44NiAxODAuNjQgMTI5Ljk3IDE4MC42NCAxMjAuODlDMTgwLjY0IDEwNy44NSAxNzAuMDYgOTcuMjcgMTU3LjAyIDk3LjI3QzE0My45NyA5Ny4yNyAxMzMuMzkgMTA3Ljg1IDEzMy4zOSAxMjAuODlDMTMzLjM5IDEyOS45NyAxMzguNTIgMTM3Ljg2IDE0Ni4wNCAxNDEuODFaIiAvPgoJPC9nPgo8L3N2Zz4="
                alt="PKI Consortium Logo"
                className="pkimm-logo"
              />

              <div className="pkimm-header-actions">
                {savedState.assessments.length > 1 && activeAssessment && (
                  <span
                    className="pkimm-editing-chip"
                    title={`Currently editing: ${activeAssessment.name}`}
                  >
                    <span className="pkimm-editing-chip__caption">Editing</span>
                    <span className="pkimm-editing-chip__name">
                      {activeAssessment.name}
                    </span>
                  </span>
                )}
                {modeCaps.full && (
                  <div
                    className="pkimm-view-mode-switch"
                    role="tablist"
                    aria-label="Assessment view mode"
                  >
                    <button
                      type="button"
                      role="tab"
                      className={
                        viewMode.view === "self"
                          ? "pkimm-view-mode-switch__option active"
                          : "pkimm-view-mode-switch__option"
                      }
                      aria-pressed={viewMode.view === "self"}
                      title="Self assessment"
                      onClick={() => viewMode.setView("self")}
                    >
                      Self
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={
                        viewMode.view === "full"
                          ? "pkimm-view-mode-switch__option active"
                          : "pkimm-view-mode-switch__option"
                      }
                      aria-pressed={viewMode.view === "full"}
                      disabled={!viewMode.fullAvailable}
                      title={viewMode.fullDisabledReason ?? "Full assessment"}
                      onClick={() => viewMode.setView("full")}
                    >
                      Full
                    </button>
                  </div>
                )}
                <span
                  className="pkimm-privacy-chip"
                  title="Stored in this browser only. All assessment data stays in this browser. Nothing is sent anywhere."
                  aria-label="Stored in this browser only. All assessment data stays in this browser. Nothing is sent anywhere."
                >
                  <span aria-hidden="true">🔒</span>
                </span>
                <SaveStatusChip
                  status={saveStatus}
                  lastExportLabel={
                    activeLastExportAt
                      ? `Exported ${formatRelativeDays(activeLastExportAt)}`
                      : null
                  }
                  onExport={() =>
                    activeAssessment &&
                    handleManagerDownload(activeAssessment.id)
                  }
                />
                {activeLockedByOtherTab && (
                  <span
                    className="pkimm-tab-lock-chip"
                    role="status"
                    title="This assessment is being edited in another tab. Close it there to make changes here."
                    aria-label="Read-only — this assessment is being edited in another tab. Close it there to make changes here."
                  >
                    Read-only
                  </span>
                )}
                <HeaderHelpButton />
                <AssessmentHeader />
              </div>
            </div>
            <TabNav
              modules={data?.modules ?? []}
              currentTab={currentTab}
              fullMode={viewMode.view === "full"}
              onSelect={handleTabClick}
            />
          </header>
          {legacyPrompt && data && (
            <LegacyImportPrompt
              count={Object.keys(legacyPrompt.progress ?? {}).length}
              onImport={handleLegacyImport}
              onKeepSeparate={handleLegacyKeepSeparate}
            />
          )}
          {isTransient(activeAssessment) && (
            <TransientAssessmentBanner
              name={activeAssessment?.assessmentName ?? ""}
              onSave={handleSaveTransient}
              onDiscard={handleDiscardTransient}
            />
          )}
          {shouldShowMigrationBanner && activeAssessment && (
            <MigrationBanner
              sourceName={
                activeAssessment.name ||
                activeAssessment.assessmentName ||
                "this assessment"
              }
              mismatches={mismatches}
              onMigrate={handleMigrate}
              onStartFresh={handleStartFresh}
              onKeepHidden={handleKeepHiddenExtension}
            />
          )}
          {migrationSummary && (
            <MigrationSummaryView
              summary={migrationSummary}
              onClose={() => setMigrationSummary(null)}
            />
          )}
          {importCollision && (
            <ImportCollisionModal
              existing={importCollision.existing}
              incoming={importCollision.incoming}
              canMerge={
                importCollision.existing.dataVersion ===
                importCollision.incoming.dataVersion
              }
              onReplace={handleImportReplace}
              onKeepBoth={handleImportKeepBoth}
              onCancel={handleImportCancel}
              onMerge={handleImportMerge}
            />
          )}
          {pendingTemplateImport && (
            <ScopeTemplateImportModal
              file={pendingTemplateImport.file}
              compatibility={pendingTemplateImport.compatibility}
              modelVersion={pendingTemplateImport.modelVersion}
              onConfirm={handleConfirmImportScopeTemplate}
              onClose={() => setPendingTemplateImport(null)}
            />
          )}
          <ReportGeneratingModal open={isGeneratingPdf} />
          <ResetModal
            open={resetOpen}
            onClose={() => setResetOpen(false)}
            onConfirm={handleResetConfirm}
            fullMode={viewMode.view === "full"}
          />
          {hiddenEnabledExtensions.length > 0 &&
            activeAssessment &&
            !isTransient(activeAssessment) && (
              <Banner tone="info" className="pkimm-hidden-ext-notice__margin">
                <div className="pkimm-hidden-ext-notice">
                  {hiddenEnabledExtensions.length === 1
                    ? "An extension referenced by this assessment is not loaded on this page. Its progress is preserved and will reappear when the page loads it."
                    : "Some extensions referenced by this assessment are not loaded on this page. Their progress is preserved and will reappear when the page loads them."}
                  <details>
                    <summary>Details</summary>
                    <ul>
                      {hiddenEnabledExtensions.map((e) => (
                        <li key={e.id}>
                          {e.id} (v{e.version})
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </Banner>
            )}
          <div className="pkimm-content-container">
            <div
              className="pkimm-categories-container"
              ref={panelRef}
              tabIndex={-1}
            >
              {currentTab === "overview" && data && (
                <Overview view={viewMode.view} />
              )}
              {data?.modules.map(
                (module) =>
                  module.id === currentTab && (
                    <div key={module.id}>
                      <Module
                        key={module.id}
                        module={module}
                        view={viewMode.view}
                        progress={progress}
                        referencesLookup={referencesLookup}
                        onLevelChange={handleLevelChange}
                        onApplicabilityChange={handleApplicabilityChange}
                        onCategoryReason={handleCategoryReason}
                        onCategoryNotes={handleCategoryNotes}
                        onCategoryFieldChange={handleCategoryFieldChange}
                        requirementProgress={
                          activeAssessment?.requirementProgress
                        }
                        workspaceLinks={workspaceLinks}
                        onRequirementLevelChange={handleRequirementLevelChange}
                        onRequirementApplicabilityChange={
                          handleRequirementApplicabilityChange
                        }
                        onRequirementFieldChange={handleRequirementFieldChange}
                        onClearRequirementAssessments={
                          handleClearRequirementAssessments
                        }
                        externalScrollToKey={
                          module.id === currentTab
                            ? restoreScrollKey
                            : undefined
                        }
                        onExternalScrollConsumed={() =>
                          setRestoreScrollKey(undefined)
                        }
                        onCardFocus={(requirementKey) =>
                          resume.reportPosition({
                            view: viewMode.view,
                            tab: module.id,
                            categoryKey: requirementKey
                              .split(".")
                              .slice(0, 2)
                              .join("."),
                            requirementKey,
                          })
                        }
                      />
                    </div>
                  ),
              )}
              {currentTab === "scope" && data && (
                <ScopeView
                  templates={scopeTemplates}
                  onSetCategory={handleScopeSetCategory}
                  onSetRequirement={handleScopeSetRequirement}
                  onSetModule={handleScopeSetModule}
                  onSetCategoryRequirements={handleScopeSetCategoryRequirements}
                  onCategoryReason={handleScopeCategoryReason}
                  onRequirementReason={handleScopeRequirementReason}
                  onSaveTemplate={handleSaveScopeTemplate}
                  onApplyTemplate={handleApplyScopeTemplate}
                  onDeleteTemplate={handleDeleteScopeTemplate}
                  onExportTemplate={handleExportScopeTemplate}
                  onImportTemplateFile={handleImportScopeTemplateFile}
                />
              )}
              {currentTab === "workspace" && data && (
                <WorkspaceView
                  workspace={activeAssessment?.workspace}
                  requirementChoices={requirementChoices}
                  onWorkspaceChange={handleWorkspaceChange}
                  onRescueOrphan={handleRescueOrphan}
                  onDiscardOrphan={handleDiscardOrphan}
                />
              )}
              {currentTab === "action-plans" && data && (
                <ActionPlansView
                  actionPlans={activeAssessment?.actionPlans}
                  pocs={activeAssessment?.workspace?.pocs ?? []}
                  onAddPlan={handleAddActionPlan}
                  onUpdatePlanField={handleUpdateActionPlanField}
                  onRemovePlan={handleRemoveActionPlan}
                  onAddListItem={handleAddPlanListItem}
                  onUpdateListItem={handleUpdatePlanListItem}
                  onRemoveListItem={handleRemovePlanListItem}
                  onAddTask={handleAddPlanTask}
                  onToggleTask={handleTogglePlanTask}
                  onUpdateTaskLabel={handleUpdatePlanTaskLabel}
                  onRemoveTask={handleRemovePlanTask}
                />
              )}
              {currentTab === "evaluation" && data && (
                <>
                  <EvaluationView />
                  <ComparisonPanel
                    baselineOptions={baselineOptions}
                    activeBaselineLabel={comparisonBaseline?.name ?? null}
                    comparison={comparison}
                    reconciliation={reconciliation}
                    unmappedNames={alignedBaseline?.unmappedNames ?? []}
                    aligned={alignedBaseline?.aligned ?? false}
                    onSelectStored={handleSelectStoredBaseline}
                    onSelectFile={handleSelectFileBaseline}
                    onClear={handleClearComparison}
                  />
                </>
              )}
              {currentTab === "report" && data && (
                <UnifiedReport
                  onDownload={handleActiveDownload}
                  dataVersion={data.version ?? "1.0.0"}
                  assessmentName={assessmentName}
                  assessorName={assessorName}
                  useCaseDescription={useCaseDescription}
                  enabledExtensions={enabledExtensions}
                  onExportPDF={(tier, extId, filter, sections) =>
                    extId
                      ? handleExportExtensionPDF(extId)
                      : handleExportPDF(tier, filter, sections)
                  }
                  sectionAvailability={sectionAvailability}
                  isTransient={isTransient(activeAssessment)}
                  isFullView={viewMode.view === "full"}
                  onReset={(extId) =>
                    extId ? handleResetExtension(extId) : handleReset()
                  }
                  onAssessmentName={handleAssessmentName}
                  onAssessorName={handleAssessorName}
                  onUseCaseDescription={handleUseCaseDescription}
                  organizationName={organizationName}
                  assessorCompany={assessorCompany}
                  assessorPosition={assessorPosition}
                  assessmentType={assessmentType}
                  startDate={startDate}
                  targetDate={targetDate}
                  finishDate={finishDate}
                  pkiEnvironment={pkiEnvironment}
                  onOrganizationName={handleOrganizationName}
                  onAssessorCompany={handleAssessorCompany}
                  onAssessorPosition={handleAssessorPosition}
                  onAssessmentType={handleAssessmentType}
                  onStartDate={handleStartDate}
                  onTargetDate={handleTargetDate}
                  onFinishDate={handleFinishDate}
                  onPkiEnvironment={handlePkiEnvironment}
                />
              )}
              {currentTab === "extensions" && (
                <Extensions
                  extensions={extensionsData}
                  enabledExtensions={enabledExtensions}
                  incompatibleExtensionIds={incompatibleExtensionIds}
                  onToggleExtension={handleToggleExtension}
                  onUploadExtension={handleUploadExtension}
                  onRemoveExtension={handleRemoveExtension}
                  uploadError={extensionUploadError}
                />
              )}
              {currentTab === "assessments" && (
                <>
                  {importForwardIncompatible && (
                    <ForwardCompatRefusal
                      message={`This file could not be imported: ${importForwardIncompatible.message}`}
                      onDownloadRaw={handleDownloadForwardIncompatibleFile}
                      downloadLabel="Download the uploaded file"
                    />
                  )}
                  <AssessmentManager
                    state={savedState}
                    loadedDataVersion={data?.version ?? "1.0.0"}
                    data={data}
                    extensionsData={extensionsData}
                    methodology={profile.runtime.methodology}
                    onSelect={handleManagerSelect}
                    onCreateNew={handleManagerCreateNew}
                    onRename={handleManagerRename}
                    onDuplicate={handleManagerDuplicate}
                    onDelete={handleManagerDelete}
                    onDownload={handleManagerDownload}
                    onUpload={handleManagerUpload}
                    hasLegacyData={hasLegacyData}
                    onImportLegacy={
                      hasLegacyData ? handleManagerImportLegacy : undefined
                    }
                    onRemoveLegacy={
                      hasLegacyData ? handleManagerRemoveLegacy : undefined
                    }
                    storageEstimate={storageEstimate}
                    onListRevisions={async (id) =>
                      (await getStorageAdapter()).listRevisions(id)
                    }
                    onRestoreRevision={(revId, assessmentId) =>
                      withRowLock(assessmentId, async () => {
                        const adapter = await getStorageAdapter();
                        const restored = normalizeAssessmentActionPlans(
                          await adapter.restoreRevision(revId),
                        );
                        setSavedState((prev) => ({
                          ...prev,
                          assessments: prev.assessments.map((a) =>
                            a.id === restored.id ? restored : a,
                          ),
                        }));
                        notify();
                      })
                    }
                  />
                </>
              )}
              {data &&
                (() => {
                  const next = getNextContentTab(
                    currentTab,
                    data.modules,
                    viewMode.view === "full",
                  );
                  return next ? (
                    <div className="pkimm-continue-cta">
                      <Button
                        variant="primary"
                        leftIcon={
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            aria-hidden="true"
                          />
                        }
                        onClick={() => handleTabClick(next.id)}
                      >
                        Continue to {next.label}
                      </Button>
                    </div>
                  ) : null;
                })()}
            </div>
            <div className="pkimm-chart-container" ref={chartRef}>
              {data && (
                <SpiderChart
                  modules={data.modules}
                  progress={progress}
                  chartLabels={chartLabels}
                  extensions={extensionsData}
                  enabledExtensions={
                    chartExtensionsOverride ?? enabledExtensions
                  }
                  animate={chartAnimate}
                  requirementProgress={activeAssessment?.requirementProgress}
                  baselineProgress={
                    chartExtensionsOverride === null
                      ? alignedBaseline?.progress
                      : undefined
                  }
                  baselineRequirementProgress={
                    chartExtensionsOverride === null
                      ? alignedBaseline?.requirementProgress
                      : undefined
                  }
                  methodology={profile.runtime.methodology}
                />
              )}
              {data && (
                <div className="pkimm-chart-progress" aria-live="polite">
                  {(() => {
                    // Not Applicable categories are excluded from both
                    // numerator and denominator — they aren't part of the
                    // user's PKI scope, so they shouldn't count toward
                    // "X of Y assessed". Counts are category grain (each
                    // applicable category once) and agree with the Scope
                    // Coverage "categories in scope" figure.
                    const totalCats = categoryGrainCounts?.total ?? 0;
                    const assessedTotal = categoryGrainCounts?.assessed ?? 0;
                    // Bar fill = fractional maturity toward the next level
                    // (not completeness — the "X/Y assessed" text below still
                    // carries that signal). floorLevel always matches
                    // overallChartMaturityLevel; fillPct is the fractional
                    // remainder scaled to a percentage.
                    const raw = overallMaturityRaw;
                    const floorLevel = Math.floor(raw);
                    const fillPct = (raw - floorLevel) * 100;
                    const overallLevelCls =
                      overallChartMaturityLevel > 0
                        ? `pkimm-chart-progress__row--level-${overallChartMaturityLevel}`
                        : "";
                    const maturityLabel =
                      floorLevel >= 5 ||
                      floorLevel === 0 ||
                      Math.round(fillPct) === 0
                        ? (LevelResult[floorLevel] ?? "Not Assessed")
                        : `${LevelResult[floorLevel]} · ${Math.round(fillPct)}% → L${floorLevel + 1}`;
                    return (
                      <div
                        className={`pkimm-chart-progress__row pkimm-chart-progress__row--overall ${overallLevelCls}`}
                        title={`maturity ${raw.toFixed(2)} · ${assessedTotal} of ${totalCats} categories assessed across all modules`}
                      >
                        <div className="pkimm-chart-progress__header">
                          <span className="pkimm-chart-progress__label">
                            <span className="pkimm-chart-progress__label-text">
                              Overall
                            </span>
                          </span>
                          <span className="pkimm-chart-progress__level">
                            {maturityLabel}
                          </span>
                          <span className="pkimm-chart-progress__count">
                            {assessedTotal}/{totalCats}
                          </span>
                        </div>
                        <div className="pkimm-chart-progress__bar">
                          <div
                            className="pkimm-chart-progress__fill"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  {data.modules.map((module) => {
                    const moduleLevel =
                      moduleMaturityLevels.find((m) => m.module === module.name)
                        ?.level ?? 0;
                    const moduleCounts = categoryGrainCounts?.perModule.find(
                      (m) => m.moduleId === module.id,
                    );
                    const total = moduleCounts?.total ?? 0;
                    const assessed = moduleCounts?.assessed ?? 0;
                    // Same fractional-maturity fill as the overall row above.
                    const raw =
                      moduleMaturityRaw.find((m) => m.module === module.name)
                        ?.raw ?? 0;
                    const floorLevel = Math.floor(raw);
                    const fillPct = (raw - floorLevel) * 100;
                    const moduleLevelCls =
                      moduleLevel > 0
                        ? `pkimm-chart-progress__row--level-${moduleLevel}`
                        : "";
                    const maturityLabel =
                      floorLevel >= 5 ||
                      floorLevel === 0 ||
                      Math.round(fillPct) === 0
                        ? (LevelResult[floorLevel] ?? "Not Assessed")
                        : `${LevelResult[floorLevel]} · ${Math.round(fillPct)}% → L${floorLevel + 1}`;
                    return (
                      <div
                        className={`pkimm-chart-progress__row ${moduleLevelCls}`}
                        key={module.id}
                        title={`maturity ${raw.toFixed(2)} · ${assessed} of ${total} categories assessed in ${module.name}`}
                      >
                        <div className="pkimm-chart-progress__header">
                          <span className="pkimm-chart-progress__label">
                            <span className="pkimm-chart-progress__label-text">
                              {module.name}
                            </span>
                          </span>
                          <span className="pkimm-chart-progress__level">
                            {maturityLabel}
                          </span>
                          <span className="pkimm-chart-progress__count">
                            {assessed}/{total}
                          </span>
                        </div>
                        <div className="pkimm-chart-progress__bar">
                          <div
                            className="pkimm-chart-progress__fill"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {extensionsData
                    .filter((ext) =>
                      enabledExtensions.includes(ext.extension.id),
                    )
                    .map((ext) => {
                      const extLevel =
                        extensionMaturityLevels.find(
                          (e) => e.id === ext.extension.id,
                        )?.level ?? 0;
                      // Total = categories the extension declares relevance for
                      // whose underlying core category is applicable.
                      const relCategories = ext.relevance.modules.flatMap((m) =>
                        m.categories.map((c) => ({
                          moduleId: m.id,
                          categoryId: c.id,
                        })),
                      );
                      const total = relCategories.filter(
                        ({ moduleId, categoryId }) => {
                          const coreEntry =
                            progress[`${moduleId}.${categoryId}`];
                          return coreEntry?.applicability !== false;
                        },
                      ).length;
                      const assessed = relCategories.filter(
                        ({ moduleId, categoryId }) => {
                          const coreEntry =
                            progress[`${moduleId}.${categoryId}`];
                          const extEntry =
                            progress[
                              `${ext.extension.id}.${moduleId}.${categoryId}`
                            ];
                          return (
                            coreEntry?.applicability !== false &&
                            (extEntry?.level ?? 0) > 0
                          );
                        },
                      ).length;
                      const pct =
                        total === 0 ? 0 : Math.round((assessed / total) * 100);
                      const extLevelCls =
                        extLevel > 0
                          ? `pkimm-chart-progress__row--level-${extLevel}`
                          : "";
                      return (
                        <div
                          className={`pkimm-chart-progress__row pkimm-chart-progress__row--extension ${extLevelCls}`}
                          key={`ext-${ext.extension.id}`}
                          title={`${assessed} of ${total} relevance categories assessed for ${ext.extension.name}`}
                        >
                          <div className="pkimm-chart-progress__header">
                            <span className="pkimm-chart-progress__label">
                              <span className="pkimm-chart-progress__label-text">
                                {ext.extension.name}
                              </span>
                              <span className="pkimm-chart-progress__tag">
                                ext
                              </span>
                            </span>
                            <span className="pkimm-chart-progress__level">
                              {LevelResult[extLevel] ?? "Not Assessed"} ·{" "}
                              {assessed}/{total}
                            </span>
                          </div>
                          <div className="pkimm-chart-progress__bar">
                            <div
                              className="pkimm-chart-progress__fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
              <div className="pkimm-version">Version: {APP_VERSION}</div>
            </div>
          </div>
          {resume.toastMessage && (
            <ResumeToast
              message={resume.toastMessage}
              onDismiss={resume.dismissToast}
            />
          )}
        </div>
      </HelpBridge>
    </AssessmentTargetProvider>
  );
};
