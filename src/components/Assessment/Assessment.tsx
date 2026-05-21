import React, { useState, useEffect, useRef } from "react";
import { Module } from "../Module/Module";
import { SpiderChart } from "../SpiderChart/SpiderChart";
import { Overview } from "../Overview/Overview";
import { UnifiedReport } from "../Report/UnifiedReport";
import { yamlParser } from "../../utils/yamlParser";
import {
  generateURL,
  decodeProgressHash,
  exportToYAML,
} from "../../utils/urlGenerator";
import { exportToPDF, exportExtensionPDF } from "../../utils/pdfGenerator";
import {
  AssessmentData,
  ProgressData,
  ConfigData,
  EmailData,
  OverviewData,
  ExtensionData,
  EnabledExtension,
  SavedState,
  Assessment as SavedAssessment,
  ReferenceEntry,
  ReferencesCatalog,
} from "../../types/types";
import LevelResult from "../../enums/LevelResult";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
  calculateExtensionMaturityLevels,
} from "../../utils/maturityCalculations";
import { AssessmentTargetProvider } from "../../contexts/AssessmentTargetContext";
import { AssessmentHeader } from "./AssessmentHeader";
import { Extensions } from "../Extensions/Extensions";
import "./Assessment.module.scss";
import { APP_VERSION } from "../../version";
import {
  STORAGE_KEY,
  LEGACY_KEY,
  readSavedState,
  writeSavedState,
  detectLegacyAssessmentData,
  readLegacyAssessmentData,
  newEmptyAssessment,
  importLegacyData,
  importYAMLFile,
  removeLegacyAssessmentData,
  buildStructureSnapshot,
  newId,
  LegacyAssessmentData,
} from "../../utils/storage";
import { reclassifyUntouchedLevelOne } from "../../utils/legacyReclassify";
import { LegacyImportPrompt } from "../LegacyImportPrompt/LegacyImportPrompt";
import { TransientAssessmentBanner } from "../TransientAssessmentBanner/TransientAssessmentBanner";
import {
  MigrationBanner,
  AxisMismatch,
} from "../MigrationBanner/MigrationBanner";
import { MigrationSummary as MigrationSummaryView } from "../MigrationSummary/MigrationSummary";
import { ForwardCompatRefusal } from "../ForwardCompatRefusal/ForwardCompatRefusal";
import { AssessmentManager } from "../AssessmentManager/AssessmentManager";
import { migrate } from "../../utils/stateMigration";
import type { MigrationSummary } from "../../types/types";

interface AssessmentProps {
  src: string | null;
  config: string | null;
  extensions: string | null;
  references: string | null;
}

const EMPTY_STATE: SavedState = {
  stateSchemaVersion: 1,
  activeId: null,
  assessments: [],
};

export const Assessment: React.FC<AssessmentProps> = ({
  src,
  config,
  extensions,
  references,
}) => {
  const defaultProgressData = {
    level: 0,
    result: LevelResult[0],
    description: "",
    applicability: true,
  };

  const version = APP_VERSION;
  const [data, setData] = useState<AssessmentData | null>(null);
  const [extensionsData, setExtensionsData] = useState<ExtensionData[]>([]);
  const [referencesLookup, setReferencesLookup] = useState<
    Map<string, ReferenceEntry>
  >(() => new Map());
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [savedState, setSavedState] = useState<SavedState>(EMPTY_STATE);
  const [legacyPrompt, setLegacyPrompt] = useState<LegacyAssessmentData | null>(
    null,
  );
  // Reserved for the forward-compat refusal screen (N.1).
  const [forwardCompatFailure, setForwardCompatFailure] = useState<
    string | null
  >(null);
  const [migrationSummary, setMigrationSummary] =
    useState<MigrationSummary | null>(null);
  const [migrationDismissedFor, setMigrationDismissedFor] = useState<
    string | null
  >(null);
  const [hiddenExtensions, setHiddenExtensions] = useState<Set<string>>(
    new Set(),
  );
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [incompatibleExtensionIds, setIncompatibleExtensionIds] = useState<
    Set<string>
  >(new Set());

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartExtensionsOverride, setChartExtensionsOverride] = useState<
    string[] | null
  >(null);
  const [chartAnimate, setChartAnimate] = useState(true);

  const activeAssessment =
    savedState.assessments.find((a) => a.id === savedState.activeId) ?? null;
  const progress = activeAssessment?.progress ?? {};
  const assessmentName = activeAssessment?.assessmentName ?? "";
  const assessorName = activeAssessment?.assessorName ?? "";
  const useCaseDescription = activeAssessment?.useCaseDescription ?? "";
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

  const updateActive = (
    patch: Partial<SavedAssessment> | ((a: SavedAssessment) => SavedAssessment),
  ): void => {
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

  useEffect(() => {
    const load = async (): Promise<void> => {
      let state: SavedState;
      try {
        state = readSavedState() ?? EMPTY_STATE;
      } catch (err) {
        setForwardCompatFailure((err as Error).message);
        return;
      }

      const hasLegacyKey = localStorage.getItem(LEGACY_KEY) !== null;
      setHasLegacyData(hasLegacyKey);

      // Detect-but-don't-import legacy data so we can surface a prompt.
      const legacyData =
        state.assessments.length === 0 ? detectLegacyAssessmentData() : null;
      if (legacyData) setLegacyPrompt(legacyData);

      let initialData: AssessmentData | null = null;
      if (src) {
        const response = await fetch(src);
        const yamlText = await response.text();
        initialData = yamlParser(yamlText) as AssessmentData;
      }

      const initialExtensions: ExtensionData[] = [];
      const incompatible = new Set<string>();
      if (extensions) {
        const extensionUrls = extensions.split(",").map((url) => url.trim());
        for (const url of extensionUrls) {
          try {
            const response = await fetch(url);
            const yamlText = await response.text();
            const extData = yamlParser(yamlText) as ExtensionData;
            const loadedVersion = initialData?.version ?? "1.0.0";
            const compat = extData.extension.compatibility;
            if (compat && !compat.includes(loadedVersion)) {
              console.warn(
                `Extension ${extData.extension.id} (v${extData.extension.version}) is not compatible with PKIMM ${loadedVersion}; toggle will be disabled.`,
              );
              incompatible.add(extData.extension.id);
            }
            initialExtensions.push(extData);
          } catch (error) {
            console.error(`Error loading extension from ${url}:`, error);
          }
        }
        setExtensionsData(initialExtensions);
        setIncompatibleExtensionIds(incompatible);
      }

      // Build the combined references lookup: start from the main catalog
      // (when referencesUrl is provided) and merge in extension-local
      // entries. Later entries with the same id win, so an extension can
      // shadow a main-catalog entry if it really wants to.
      const refMap = new Map<string, ReferenceEntry>();
      if (references) {
        try {
          const response = await fetch(references);
          const yamlText = await response.text();
          const catalog = yamlParser(yamlText) as ReferencesCatalog;
          for (const ref of catalog.references ?? []) refMap.set(ref.id, ref);
        } catch (error) {
          console.error(`Error loading references from ${references}:`, error);
        }
      }
      for (const ext of initialExtensions) {
        for (const ref of ext.references ?? []) refMap.set(ref.id, ref);
      }
      setReferencesLookup(refMap);

      const hash = globalThis.location.hash.startsWith("#")
        ? globalThis.location.hash.slice(1)
        : globalThis.location.hash;
      let transient: SavedAssessment | null = null;
      if (hash.includes("progress=")) {
        try {
          const decoded = decodeProgressHash(hash);
          if (decoded) {
            const now = new Date().toISOString();
            // URLs ship a compact progress map (just level + applicability)
            // to stay under email/messaging size limits. Re-hydrate result
            // and description from the source YAML so the PDF/report sees
            // a full ProgressData.
            const hydratedProgress: Record<string, ProgressData> = {};
            for (const [key, entry] of Object.entries(decoded.progress)) {
              const [moduleId, categoryId] = key.split(".");
              const level = entry.level ?? 0;
              const desc =
                initialData?.modules
                  .find((m) => m.id === moduleId)
                  ?.categories.find((c) => c.id === categoryId)
                  ?.levels.find((l) => l.number === level)?.description ?? "";
              hydratedProgress[key] = {
                level,
                result:
                  entry.result ??
                  (LevelResult as Record<number, string>)[level] ??
                  "Not Assessed",
                description: entry.description ?? desc,
                applicability: entry.applicability ?? true,
              };
            }
            transient = {
              id: `transient-${now}`,
              name: "Shared assessment",
              dataVersion: decoded.dataVersion,
              progress: hydratedProgress,
              enabledExtensions: decoded.enabledExtensions,
              assessmentName: decoded.assessmentName,
              assessorName: decoded.assessorName,
              useCaseDescription: decoded.useCaseDescription,
              sourceStructure: initialData
                ? buildStructureSnapshot(initialData)
                : { byKey: {} },
              meta: { createdAt: now, updatedAt: now },
            };
          }
        } catch (err) {
          setForwardCompatFailure((err as Error).message);
          return;
        }
      }

      if (transient) {
        // The transient assessment lives in-memory only until the user
        // explicitly saves it (handled by section L.3's banner).
        setSavedState({
          ...state,
          assessments: [
            ...state.assessments.filter((a) => a.id !== transient.id),
            transient,
          ],
          activeId: transient.id,
        });
        setCurrentTab("report");
      } else if (legacyData) {
        // Keep savedState empty; the user's choice in the legacy-import
        // prompt will populate it. Skip auto-create so we don't pollute the
        // assessment list with a throwaway entry the user never asked for.
        setSavedState(state);
        setCurrentTab("overview");
      } else if (state.assessments.length === 0 && initialData) {
        // No saved assessments, no shared link, no legacy data — auto-create
        // a fresh one so the widget renders the familiar single-assessment UX.
        const created = newEmptyAssessment(
          initialData.version ?? "1.0.0",
          buildStructureSnapshot(initialData),
        );
        setSavedState({
          stateSchemaVersion: 1,
          activeId: created.id,
          assessments: [created],
        });
        setCurrentTab("overview");
      } else {
        setSavedState(state);
        setCurrentTab(state.activeId ? "report" : "overview");
      }

      if (initialData) setData(initialData);

      if (config) {
        fetch(config)
          .then((response) => response.text())
          .then((yamlText) => {
            const parsedConfig = yamlParser(yamlText);
            setEmailData((parsedConfig as ConfigData).email);
            setOverviewData((parsedConfig as ConfigData).overview);
          })
          .catch((error) =>
            console.error("Error fetching YAML config:", error),
          );
      }
    };

    void load().catch((error) => console.error("Error loading data:", error));
  }, [src, config, extensions, references]);

  // Persist saved state — skip transient-only states (no assessments at all,
  // or the only one is a transient placeholder) to avoid clobbering valid
  // existing storage on initial mount.
  useEffect(() => {
    if (forwardCompatFailure) return;
    if (savedState.assessments.length === 0) return;
    const allTransient = savedState.assessments.every((a) =>
      a.id.startsWith("transient-"),
    );
    if (allTransient) return;
    writeSavedState(savedState);
  }, [savedState, forwardCompatFailure]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as SavedState;
        if (next.stateSchemaVersion > 1) return;
        setSavedState(next);
      } catch {
        // ignore malformed external writes
      }
    };
    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, []);

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

      return {
        ...prevProgress,
        [key]: {
          level,
          result: LevelResult[level] || defaultProgressData.result,
          description,
          applicability:
            prevProgress[key]?.applicability ||
            defaultProgressData.applicability,
        },
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
      [key]: {
        level: prevProgress[key]?.level || defaultProgressData.level,
        description:
          prevProgress[key]?.description || defaultProgressData.description,
        result: prevProgress[key]?.applicability
          ? LevelResult[-1]
          : LevelResult[prevProgress[key]?.level],
        applicability: !prevProgress[key]?.applicability,
      },
    }));
  };

  const handleReset = () => {
    updateActive((a) => ({
      ...a,
      progress: initProgress(data, extensionsData, []),
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      enabledExtensions: [],
    }));
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

  const handleExportPDF = async () => {
    if (chartRef.current && data) {
      setChartExtensionsOverride([]);
      setChartAnimate(false);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const overallMaturityLevel = calculateOverallMaturityLevel(
        data.modules,
        progress,
        [],
        [],
      );
      const moduleMaturityLevels = calculateModuleMaturityLevels(
        data.modules,
        progress,
        [],
        [],
      );
      const url = generateURL({
        progress,
        enabledExtensions: [],
        dataVersion: data.version ?? "1.0.0",
        stateSchemaVersion: 1,
        assessmentName,
        assessorName,
        useCaseDescription,
      });

      try {
        await exportToPDF(
          progress,
          chartRef.current,
          overallMaturityLevel,
          moduleMaturityLevels,
          data.modules,
          assessmentName,
          assessorName,
          useCaseDescription,
          url,
          version,
          collectReferencedEntries(data.modules),
        );
      } catch (error) {
        console.error("Error exporting to PDF:", error);
      } finally {
        setChartExtensionsOverride(null);
        setChartAnimate(true);
      }
    }
  };

  const handleExportExtensionPDF = async (extensionId: string) => {
    const ext = extensionsData.find((e) => e.extension.id === extensionId);
    if (!ext || !data || !chartRef.current) return;

    setChartExtensionsOverride([extensionId]);
    setChartAnimate(false);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const chartCanvas = chartRef.current.querySelector(
      "canvas",
    ) as HTMLCanvasElement;
    const chartImgData = chartCanvas.toDataURL("image/png");

    try {
      await exportExtensionPDF({
        progress,
        extension: ext,
        coreModules: data.modules,
        references: collectReferencedEntries(data.modules),
        assessmentName,
        assessorName,
        useCaseDescription,
        version,
        chartImgData,
      });
    } catch (error) {
      console.error("Error exporting extension PDF:", error);
    } finally {
      setChartExtensionsOverride(null);
      setChartAnimate(true);
    }
  };

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    setIsMenuOpen(false);
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

  const isTransient = (a: SavedAssessment | null): boolean =>
    a?.id.startsWith("transient-") ?? false;

  const computeMismatches = (): AxisMismatch[] => {
    if (!activeAssessment || !data) return [];
    const out: AxisMismatch[] = [];
    const loadedDataVersion = data.version ?? "1.0.0";
    if (activeAssessment.dataVersion !== loadedDataVersion) {
      out.push({
        kind: "model",
        label: `PKIMM ${activeAssessment.dataVersion} → ${loadedDataVersion}`,
        canKeepHidden: false,
      });
    }
    for (const e of activeAssessment.enabledExtensions) {
      if (hiddenExtensions.has(e.id)) continue;
      const loaded = extensionsData.find((x) => x.extension.id === e.id);
      if (!loaded) continue; // not loaded at all — surfaced as preserved-but-hidden in P.1
      if (loaded.extension.version !== e.version) {
        out.push({
          kind: "extension",
          label: `${loaded.extension.name} ${e.version} → ${loaded.extension.version}`,
          extensionId: e.id,
          canKeepHidden: true,
        });
      }
    }
    return out;
  };

  const mismatches = computeMismatches();
  const shouldShowMigrationBanner =
    activeAssessment !== null &&
    !isTransient(activeAssessment) &&
    mismatches.length > 0 &&
    migrationDismissedFor !== activeAssessment.id;

  const handleMigrate = () => {
    if (!activeAssessment || !data) return;
    const result = migrate(activeAssessment, data, extensionsData);
    const now = new Date().toISOString();
    const migrated: SavedAssessment = {
      ...activeAssessment,
      id: newId(),
      name: `${activeAssessment.name} (PKIMM ${data.version})`,
      dataVersion: data.version ?? "1.0.0",
      progress: result.migratedProgress,
      enabledExtensions: result.migratedEnabledExtensions,
      sourceStructure: result.newSourceStructure,
      meta: {
        createdAt: now,
        updatedAt: now,
        importedFromId: activeAssessment.id,
      },
    };
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
    const now = new Date().toISOString();
    setSavedState((prev) => ({
      ...prev,
      assessments: prev.assessments.map((a) =>
        a.id === id ? { ...a, name, meta: { ...a.meta, updatedAt: now } } : a,
      ),
    }));
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
    setSavedState((prev) => {
      const remaining = prev.assessments.filter((a) => a.id !== id);
      const activeId =
        prev.activeId === id ? (remaining[0]?.id ?? null) : prev.activeId;
      return { ...prev, assessments: remaining, activeId };
    });
  };

  const handleManagerDownload = (id: string): void => {
    const a = savedState.assessments.find((x) => x.id === id);
    if (!a) return;
    exportToYAML({
      name: a.name,
      dataVersion: a.dataVersion,
      progress: a.progress,
      enabledExtensions: a.enabledExtensions,
      assessmentName: a.assessmentName,
      assessorName: a.assessorName,
      useCaseDescription: a.useCaseDescription,
      sourceStructure: a.sourceStructure,
    });
  };

  const handleManagerUpload = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const imported = importYAMLFile(text);
      setSavedState((prev) => ({
        ...prev,
        assessments: [...prev.assessments, imported],
        activeId: imported.id,
      }));
    } catch (err) {
      console.error("Failed to import YAML:", err);
      globalThis.alert(
        `Could not import file: ${(err as Error).message || "unknown error"}`,
      );
    }
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

  const handleDownloadRawSavedState = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pkimm-sa-raw.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeepHiddenExtension = (extensionId: string) => {
    setHiddenExtensions((prev) => {
      const next = new Set(prev);
      next.add(extensionId);
      return next;
    });
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

  const moduleMaturityLevels = data
    ? calculateModuleMaturityLevels(data.modules, progress, [], [])
    : [];
  const overallChartMaturityLevel = data
    ? calculateOverallMaturityLevel(data.modules, progress, [], [])
    : 0;
  const extensionMaturityLevels = data
    ? calculateExtensionMaturityLevels(
        data.modules,
        extensionsData,
        enabledExtensions,
        progress,
      )
    : [];

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
      enabledExtensions={enabledExtensions}
    >
      <div className="pkimm-assessment-container">
        <header className="pkimm-main-header">
          <div className="pkimm-header-top">
            <div
              className={`pkimm-burger-menu ${isMenuOpen ? "active" : ""}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="bar1"></div>
              <div className="bar2"></div>
              <div className="bar3"></div>
            </div>

            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjU2IDMyNCI+Cgk8c3R5bGU+CgkJdHNwYW4geyB3aGl0ZS1zcGFjZTogcHJlIH0KCQkuc2hwMCB7IGZpbGw6IGJsYWNrIH0gCgk8L3N0eWxlPgoJPHBhdGggaWQ9Ik5hbWUiIGNsYXNzPSJzaHAwIiBkPSJNNDQxLjUgMTY1LjYzTDQ0MS41IDE3LjdMNTYwLjAyIDE3LjdDNTY4LjA0IDE3LjcgNTc1LjAzIDIwLjU4IDU4MSAyNi4zNEM1ODYuNzYgMzIuMyA1ODkuNjQgMzkuMyA1ODkuNjQgNDcuMzJMNTg5LjY0IDg2LjQxQzU4OS42NCA5NC40NCA1ODYuNzYgMTAxLjIzIDU4MSAxMDYuOTlDNTc1LjAzIDExMi45NiA1NjguMDQgMTE1Ljg0IDU2MC4wMiAxMTUuODRMNDcxLjEzIDExNi4wNUw0NzEuMTMgMTY1LjYzTDQ0MS41IDE2NS42M1pNNDc3LjkyIDg2LjIxTDU1Mi44MSA4Ni4yMUM1NTYuOTMgODYuMjEgNTU5LjE5IDg2LjAxIDU1OS40IDg1LjhDNTU5LjYgODUuNTkgNTU5LjgxIDgzLjMzIDU1OS44MSA3OS4yMUw1NTkuODEgNTQuMTFDNTU5LjgxIDUwIDU1OS42IDQ3Ljc0IDU1OS40IDQ3LjUzQzU1OS4xOSA0Ny4zMiA1NTYuOTMgNDcuMzIgNTUyLjgxIDQ3LjMyTDQ3Ny45MiA0Ny4zMkM0NzMuODEgNDcuMzIgNDcxLjc1IDQ3LjMyIDQ3MS41NCA0Ny41M0M0NzEuMzQgNDcuNzQgNDcxLjEzIDUwIDQ3MS4xMyA1NC4xMUw0NzEuMTMgNzkuMjFDNDcxLjEzIDgzLjMzIDQ3MS4zNCA4NS41OSA0NzEuNTQgODUuOEM0NzEuNzUgODYuMDEgNDczLjgxIDg2LjIxIDQ3Ny45MiA4Ni4yMVpNNjM0LjA2IDE2NS42M0w2MzQuMDYgMTcuNDlMNjYzLjg5IDE3LjQ5TDY2My44OSA3Ni43NEw2OTUuNzggNzYuNzRMNzQ1LjM3IDE3LjQ5TDc3Ni44NSAxNy40OUw3NzYuODUgMjYuOTVMNzIyLjUzIDkxLjU2TDc3Ni44NSAxNTYuMTdMNzc2Ljg1IDE2NS42M0w3NDUuMzcgMTY1LjYzTDY5NS43OCAxMDYuMzhMNjYzLjg5IDEwNi4zOEw2NjMuODkgMTY1LjYzTDYzNC4wNiAxNjUuNjNaTTgyNi42MiAxNjUuNjNMODI2LjYyIDE3LjQ5TDg1NS44NCAxNy40OUw4NTUuODQgMTY1LjYzTDgyNi42MiAxNjUuNjNaTTQ1Ny4yOCAzMDYuNTNDNDUyLjk2IDMwNi41MyA0NDkuMjIgMzA1LjAxIDQ0Ni4xOSAzMDEuODZDNDQzLjA0IDI5OC44MyA0NDEuNTIgMjk1LjA5IDQ0MS41MiAyOTAuNzdMNDQxLjUyIDIzOC4yNUM0NDEuNTIgMjMzLjkzIDQ0My4wNCAyMzAuMTkgNDQ2LjE5IDIyNy4wNEM0NDkuMjIgMjI0LjAxIDQ1Mi45NiAyMjIuNDkgNDU3LjI4IDIyMi40OUw1MjUuMzMgMjIyLjQ5TDUyNS4zMyAyMzYuNjFMNDU5LjczIDIzNi42MUM0NTcuNzQgMjM2LjYxIDQ1Ni41OCAyMzYuODUgNDU2LjIyIDIzNy4yQzQ1NS43NiAyMzcuNTUgNDU1LjUzIDIzOC43MSA0NTUuNTMgMjQwLjdMNDU1LjUzIDI4OC4zMkM0NTUuNTMgMjkwLjMxIDQ1NS43NiAyOTEuNDcgNDU2LjIyIDI5MS44MkM0NTYuNTggMjkyLjE3IDQ1Ny43NCAyOTIuNDEgNDU5LjczIDI5Mi40MUw1MjUuMzMgMjkyLjQxTDUyNS4zMyAzMDYuNTNMNDU3LjI4IDMwNi41M1pNNTYyLjIgMzA2LjUzQzU1Ny44OCAzMDYuNTMgNTU0LjI3IDMwNS4wMSA1NTEuMjMgMzAxLjg2QzU0OC4wOCAyOTguODMgNTQ2LjU2IDI5NS4yMSA1NDYuNTYgMjkwLjg5TDU0Ni41NiAyNTQuNDdDNTQ2LjU2IDI1MC4xNSA1NDguMDggMjQ2LjUzIDU1MS4yMyAyNDMuMzhDNTU0LjI3IDI0MC4zNSA1NTcuODggMjM4LjgzIDU2Mi4yIDIzOC44M0w1OTkuNjcgMjM4LjgzQzYwMy45OSAyMzguODMgNjA3LjczIDI0MC4zNSA2MTAuNzYgMjQzLjM4QzYxMy43OSAyNDYuNTMgNjE1LjMxIDI1MC4xNSA2MTUuMzEgMjU0LjQ3TDYxNS4zMSAyOTAuODlDNjE1LjMxIDI5NS4yMSA2MTMuNzkgMjk4LjgzIDYxMC43NiAzMDEuODZDNjA3LjczIDMwNS4wMSA2MDMuOTkgMzA2LjUzIDU5OS42NyAzMDYuNTNMNTYyLjIgMzA2LjUzWk01NjQuNjUgMjkyLjY0TDU5Ny4yMiAyOTIuNjRDNTk5LjIgMjkyLjY0IDYwMC4zNyAyOTIuNDEgNjAwLjg0IDI5MS45NEM2MDEuMTkgMjkxLjU5IDYwMS40MiAyOTAuNDIgNjAxLjQyIDI4OC40NEw2MDEuNDIgMjU2LjkyQzYwMS40MiAyNTQuOTQgNjAxLjE5IDI1My43NyA2MDAuODQgMjUzLjNDNjAwLjM3IDI1Mi45NSA1OTkuMiAyNTIuNzIgNTk3LjIyIDI1Mi43Mkw1NjQuNjUgMjUyLjcyQzU2Mi42NyAyNTIuNzIgNTYxLjUgMjUyLjk1IDU2MS4xNSAyNTMuM0M1NjAuNjkgMjUzLjc3IDU2MC40NSAyNTQuOTQgNTYwLjQ1IDI1Ni45Mkw1NjAuNDUgMjg4LjQ0QzU2MC40NSAyOTAuNDIgNTYwLjY5IDI5MS41OSA1NjEuMTUgMjkxLjk0QzU2MS41IDI5Mi40MSA1NjIuNjcgMjkyLjY0IDU2NC42NSAyOTIuNjRaTTYzNC43OSAzMDYuNTNMNjM0Ljc5IDIzOC44M0w2ODguMDIgMjM4LjgzQzY5Mi4zNCAyMzguODMgNjk1Ljk2IDI0MC4zNSA2OTguOTkgMjQzLjM4QzcwMi4wMyAyNDYuNTMgNzAzLjU0IDI1MC4xNSA3MDMuNTQgMjU0LjQ3TDcwMy41NCAzMDYuNTNMNjg5LjY1IDMwNi41M0w2ODkuNjUgMjU2LjkyQzY4OS42NSAyNTQuOTQgNjg5LjQyIDI1My43NyA2ODkuMDcgMjUzLjNDNjg4LjYgMjUyLjk1IDY4Ny40NCAyNTIuNzIgNjg1LjQ1IDI1Mi43Mkw2NTMgMjUyLjcyQzY1MS4wMiAyNTIuNzIgNjQ5Ljg1IDI1Mi45NSA2NDkuMzggMjUzLjNDNjQ4LjkyIDI1My43NyA2NDguNjggMjU0Ljk0IDY0OC42OCAyNTYuOTJMNjQ4LjY4IDMwNi41M0w2MzQuNzkgMzA2LjUzWk03MzkuMzcgMzA2LjUzQzczNS4wNSAzMDYuNTMgNzMxLjQzIDMwNS4wMSA3MjguNCAzMDEuODZDNzI1LjI0IDI5OC44MyA3MjMuNzMgMjk1LjIxIDcyMy43MyAyOTAuODlMNzIzLjczIDI4OC42N0w3MzcuNjIgMjg4LjY3TDczNy42MiAyODkuNDlDNzM3LjYyIDI5MC43NyA3MzcuODUgMjkxLjU5IDczOC4zMiAyOTEuOTRDNzM4LjY3IDI5Mi40MSA3MzkuNDkgMjkyLjY0IDc0MC43NyAyOTIuNjRMNzc1LjQ0IDI5Mi42NEM3NzYuNzIgMjkyLjY0IDc3Ny41NCAyOTIuNDEgNzc4LjAxIDI5MS45NEM3NzguMzUgMjkxLjU5IDc3OC41OSAyOTAuNzcgNzc4LjU5IDI4OS40OUw3NzguNTkgMjgyLjg0Qzc3OC41OSAyODEuNTUgNzc4LjM1IDI4MC43MyA3NzguMDEgMjgwLjI3Qzc3Ny41NCAyNzkuOTIgNzc2LjcyIDI3OS42OSA3NzUuNDQgMjc5LjY5TDczOS4zNyAyNzkuNjlDNzM1LjA1IDI3OS42OSA3MzEuNDMgMjc4LjE3IDcyOC40IDI3NS4wMkM3MjUuMjQgMjcxLjk4IDcyMy43MyAyNjguMzYgNzIzLjczIDI2NC4wNEw3MjMuNzMgMjU0LjQ3QzcyMy43MyAyNTAuMTUgNzI1LjI0IDI0Ni41MyA3MjguNCAyNDMuMzhDNzMxLjQzIDI0MC4zNSA3MzUuMDUgMjM4LjgzIDczOS4zNyAyMzguODNMNzc2Ljg0IDIzOC44M0M3ODEuMTYgMjM4LjgzIDc4NC44OSAyNDAuMzUgNzg4LjA0IDI0My4zOEM3OTEuMDggMjQ2LjUzIDc5Mi41OSAyNTAuMTUgNzkyLjU5IDI1NC40N0w3OTIuNTkgMjU2LjY5TDc3OC41OSAyNTYuNjlMNzc4LjU5IDI1NS44N0M3NzguNTkgMjU0LjU5IDc3OC4zNSAyNTMuNzcgNzc4LjAxIDI1My4zQzc3Ny41NCAyNTIuOTUgNzc2LjcyIDI1Mi43MiA3NzUuNDQgMjUyLjcyTDc0MC43NyAyNTIuNzJDNzM5LjQ5IDI1Mi43MiA3MzguNjcgMjUyLjk1IDczOC4zMiAyNTMuM0M3MzcuODUgMjUzLjc3IDczNy42MiAyNTQuNTkgNzM3LjYyIDI1NS44N0w3MzcuNjIgMjYyLjUyQzczNy42MiAyNjMuODEgNzM3Ljg1IDI2NC42MyA3MzguMzIgMjY0Ljk4QzczOC42NyAyNjUuNDQgNzM5LjQ5IDI2NS42OCA3NDAuNzcgMjY1LjY4TDc3Ni44NCAyNjUuNjhDNzgxLjE2IDI2NS42OCA3ODQuODkgMjY3LjE5IDc4OC4wNCAyNzAuMjNDNzkxLjA4IDI3My4zOCA3OTIuNTkgMjc3IDc5Mi41OSAyODEuMzJMNzkyLjU5IDI5MC44OUM3OTIuNTkgMjk1LjIxIDc5MS4wOCAyOTguODMgNzg4LjA0IDMwMS44NkM3ODQuODkgMzA1LjAxIDc4MS4xNiAzMDYuNTMgNzc2Ljg0IDMwNi41M0w3MzkuMzcgMzA2LjUzWk04MjguMTkgMzA2LjUzQzgyMy44NyAzMDYuNTMgODIwLjI1IDMwNS4wMSA4MTcuMjIgMzAxLjg2QzgxNC4wNiAyOTguODMgODEyLjU1IDI5NS4yMSA4MTIuNTUgMjkwLjg5TDgxMi41NSAyNTQuNDdDODEyLjU1IDI1MC4xNSA4MTQuMDYgMjQ2LjUzIDgxNy4yMiAyNDMuMzhDODIwLjI1IDI0MC4zNSA4MjMuODcgMjM4LjgzIDgyOC4xOSAyMzguODNMODY1LjY2IDIzOC44M0M4NjkuOTggMjM4LjgzIDg3My43MSAyNDAuMzUgODc2Ljc0IDI0My4zOEM4NzkuNzggMjQ2LjUzIDg4MS4zIDI1MC4xNSA4ODEuMyAyNTQuNDdMODgxLjMgMjkwLjg5Qzg4MS4zIDI5NS4yMSA4NzkuNzggMjk4LjgzIDg3Ni43NCAzMDEuODZDODczLjcxIDMwNS4wMSA4NjkuOTggMzA2LjUzIDg2NS42NiAzMDYuNTNMODI4LjE5IDMwNi41M1pNODMwLjY0IDI5Mi42NEw4NjMuMjEgMjkyLjY0Qzg2NS4xOSAyOTIuNjQgODY2LjM2IDI5Mi40MSA4NjYuODIgMjkxLjk0Qzg2Ny4xNyAyOTEuNTkgODY3LjQxIDI5MC40MiA4NjcuNDEgMjg4LjQ0TDg2Ny40MSAyNTYuOTJDODY3LjQxIDI1NC45NCA4NjcuMTcgMjUzLjc3IDg2Ni44MiAyNTMuM0M4NjYuMzYgMjUyLjk1IDg2NS4xOSAyNTIuNzIgODYzLjIxIDI1Mi43Mkw4MzAuNjQgMjUyLjcyQzgyOC42NiAyNTIuNzIgODI3LjQ5IDI1Mi45NSA4MjcuMTQgMjUzLjNDODI2LjY3IDI1My43NyA4MjYuNDQgMjU0Ljk0IDgyNi40NCAyNTYuOTJMODI2LjQ0IDI4OC40NEM4MjYuNDQgMjkwLjQyIDgyNi42NyAyOTEuNTkgODI3LjE0IDI5MS45NEM4MjcuNDkgMjkyLjQxIDgyOC42NiAyOTIuNjQgODMwLjY0IDI5Mi42NFpNOTAwLjkgMzA2LjUzTDkwMC45IDI1NC40N0M5MDAuOSAyNTAuMTUgOTAyLjQxIDI0Ni41MyA5MDUuNTcgMjQzLjM4QzkwOC42IDI0MC4zNSA5MTIuMjIgMjM4LjgzIDkxNi41NCAyMzguODNMOTU0LjI0IDIzOC44M0w5NTQuMjQgMjUyLjcyTDkxOC45OSAyNTIuNzJDOTE3LjAxIDI1Mi43MiA5MTUuODQgMjUyLjk1IDkxNS40OSAyNTMuM0M5MTUuMDIgMjUzLjc3IDkxNC43OSAyNTQuOTQgOTE0Ljc5IDI1Ni45Mkw5MTQuNzkgMzA2LjUzTDkwMC45IDMwNi41M1pNOTg2LjkxIDMwNi41M0M5ODIuNTkgMzA2LjUzIDk3OC44NiAzMDUuMDEgOTc1LjgzIDMwMS44NkM5NzIuNzkgMjk4LjgzIDk3MS4yNyAyOTUuMjEgOTcxLjI3IDI5MC44OUw5NzEuMjcgMjE3LjdMOTg1LjE2IDIxNy43TDk4NS4xNiAyMzguODNMMTAxMi4yNCAyMzguODNMMTAxMi4yNCAyNTIuNzJMOTg1LjE2IDI1Mi43Mkw5ODUuMTYgMjg4LjQ0Qzk4NS4xNiAyOTAuNDIgOTg1LjQgMjkxLjU5IDk4NS44NiAyOTEuOTRDOTg2LjIxIDI5Mi40MSA5ODcuMzggMjkyLjY0IDk4OS4zNyAyOTIuNjRMMTAxMi4yNCAyOTIuNjRMMTAxMi4yNCAzMDYuNTNMOTg2LjkxIDMwNi41M1pNMTAzMS40OSAzMDYuNTNMMTAzMS40OSAyMzguODNMMTA0NS4zOCAyMzguODNMMTA0NS4zOCAzMDYuNTNMMTAzMS40OSAzMDYuNTNaTTEwMzEuNDkgMjMwLjY2TDEwMzEuNDkgMjE2LjY1TDEwNDUuMzggMjE2LjY1TDEwNDUuMzggMjMwLjY2TDEwMzEuNDkgMjMwLjY2Wk0xMDgyLjQ5IDMwNi41M0MxMDc4LjE3IDMwNi41MyAxMDc0LjQ0IDMwNS4wMSAxMDcxLjQgMzAxLjg2QzEwNjguMzYgMjk4LjgzIDEwNjYuODUgMjk1LjIxIDEwNjYuODUgMjkwLjg5TDEwNjYuODUgMjM4LjgzTDEwODAuNzQgMjM4LjgzTDEwODAuNzQgMjg4LjQ0QzEwODAuNzQgMjkwLjQyIDEwODAuOTcgMjkxLjU5IDEwODEuNDQgMjkxLjk0QzEwODEuNzkgMjkyLjQxIDEwODIuOTYgMjkyLjY0IDEwODQuOTQgMjkyLjY0TDExMTcuNTEgMjkyLjY0QzExMTkuNDkgMjkyLjY0IDExMjAuNjYgMjkyLjQxIDExMjEuMTIgMjkxLjk0QzExMjEuNDcgMjkxLjU5IDExMjEuNzEgMjkwLjQyIDExMjEuNzEgMjg4LjQ0TDExMjEuNzEgMjM4LjgzTDExMzUuNiAyMzguODNMMTEzNS42IDI5MC44OUMxMTM1LjYgMjk1LjIxIDExMzQuMDggMjk4LjgzIDExMzEuMDUgMzAxLjg2QzExMjguMDEgMzA1LjAxIDExMjQuMjggMzA2LjUzIDExMTkuOTYgMzA2LjUzTDEwODIuNDkgMzA2LjUzWk0xMTU0Ljk3IDMwNi41M0wxMTU0Ljk3IDIzOC44M0wxMjQwLjE4IDIzOC44M0MxMjQ0LjQ5IDIzOC44MyAxMjQ4LjIzIDI0MC4zNSAxMjUxLjI2IDI0My4zOEMxMjU0LjMgMjQ2LjUzIDEyNTUuODIgMjUwLjE1IDEyNTUuODIgMjU0LjQ3TDEyNTUuODIgMzA2LjUzTDEyNDEuOTMgMzA2LjUzTDEyNDEuOTMgMjU2LjkyQzEyNDEuOTMgMjU0Ljk0IDEyNDEuNjkgMjUzLjc3IDEyNDEuMzQgMjUzLjNDMTI0MC44NyAyNTIuOTUgMTIzOS43MSAyNTIuNzIgMTIzNy43MiAyNTIuNzJMMTIxNi43MSAyNTIuNzJDMTIxNC43MyAyNTIuNzIgMTIxMy41NiAyNTIuOTUgMTIxMy4yMSAyNTMuM0MxMjEyLjc0IDI1My43NyAxMjEyLjUxIDI1NC45NCAxMjEyLjUxIDI1Ni45MkwxMjEyLjUxIDMwNi41M0wxMTk4LjM5IDMwNi41M0wxMTk4LjM5IDI1Ni45MkMxMTk4LjM5IDI1NC45NCAxMTk4LjE1IDI1My43NyAxMTk3LjggMjUzLjNDMTE5Ny40NSAyNTIuOTUgMTE5Ni4yOSAyNTIuNzIgMTE5NC4zIDI1Mi43MkwxMTczLjE4IDI1Mi43MkMxMTcxLjE5IDI1Mi43MiAxMTcwLjAyIDI1Mi45NSAxMTY5LjY3IDI1My4zQzExNjkuMjEgMjUzLjc3IDExNjguOTcgMjU0Ljk0IDExNjguOTcgMjU2LjkyTDExNjguOTcgMzA2LjUzTDExNTQuOTcgMzA2LjUzWiIgLz4KCTxnIGlkPSJFbGVtZW50Ij4KCQk8cGF0aCBpZD0iQm90dG9tIiBjbGFzcz0ic2hwMCIgZD0iTTE4NS44MiAyODkuMzRDMTc3LjQyIDMwMy44OCAxNzUuNzggMzIzLjk2IDE1Ny4wMiAzMjMuOTZDMTM4LjI1IDMyMy45NiAxMzYuNiAzMDMuODggMTI4LjIxIDI4OS4zNEMxMDAuMTEgMjgzLjcyIDc0LjkyIDI3MC4wNCA1NS4xNiAyNTAuODFMNjkuNTcgMjM3LjE5QzkyLjI2IDI1OC45NyAxMjMuMDcgMjcyLjM2IDE1Ny4wMiAyNzIuMzZDMTkwLjk2IDI3Mi4zNiAyMjEuNzcgMjU4Ljk3IDI0NC40NSAyMzcuMTlMMjU4Ljg2IDI1MC44MUMyMzkuMSAyNzAuMDQgMjEzLjkyIDI4My43MiAxODUuODIgMjg5LjM0WiIgLz4KCQk8cGF0aCBpZD0iUmlnaHQiIGNsYXNzPSJzaHAwIiBkPSJNMTk2Ljc3IDUuNTJDMjIxLjEyIDEyLjM5IDI0Mi45IDI1LjQyIDI2MC4zIDQyLjgyQzI2Mi40NyA0NSAyNjQuNTggNDcuMjQgMjY2LjYxIDQ5LjU1QzI4My40MSA0OS41NSAzMDEuNjYgNDAuOTMgMzExLjA1IDU3LjE4QzMyMC40MiA3My40MyAzMDMuODYgODQuODkgMjk1LjQ2IDk5LjQzQzMwMC40IDExNC4wOSAzMDMuMDggMTI5Ljc5IDMwMy4wOCAxNDYuMTFDMzAzLjA4IDE1OC40OCAzMDEuNTQgMTcwLjUgMjk4LjY1IDE4MS45N0wyNzkuNjQgMTc2LjNDMjgyLjAxIDE2Ni42MyAyODMuMjggMTU2LjUyIDI4My4yOCAxNDYuMTFDMjgzLjI4IDExMS4yNCAyNjkuMTQgNzkuNjcgMjQ2LjMgNTYuODNDMjMxLjQ0IDQxLjk4IDIxMi45MSAzMC44MSAxOTIuMTggMjQuODFMMTk2Ljc3IDUuNTJaIiAvPgoJCTxwYXRoIGlkPSJMZWZ0IiBjbGFzcz0ic2hwMCIgZD0iTTE4LjM3IDk5LjkxQzkuOTggODUuMzcgLTYuNTkgNzMuOTEgMi43OSA1Ny42NkMxMi4xOCA0MS40MSAzMC40MiA1MC4wMyA0Ny4yMiA1MC4wM0M0OS4yNiA0Ny43MiA1MS4zNiA0NS40OCA1My41NCA0My4zQzcwLjk0IDI1LjkgOTIuNzEgMTIuODcgMTE3LjA3IDZMMTIxLjY2IDI1LjI5QzEwMC45MyAzMS4yOSA4Mi4zOSA0Mi40NiA2Ny41NCA1Ny4zMUM0NC43IDgwLjE1IDMwLjU2IDExMS43MiAzMC41NiAxNDYuNTlDMzAuNTYgMTU3IDMxLjgzIDE2Ny4xMSAzNC4yIDE3Ni43OEwxNS4xOSAxODIuNDVDMTIuMyAxNzAuOTggMTAuNzYgMTU4Ljk2IDEwLjc2IDE0Ni41OUMxMC43NiAxMzAuMjcgMTMuNDMgMTE0LjU3IDE4LjM3IDk5LjkxWiIgLz4KCQk8cGF0aCBpZD0iVGFibGUiIGNsYXNzPSJzaHAwIiBkPSJNMjI3LjI0IDc1Ljg4QzI0NS4yMiA5My44NSAyNTYuMzMgMTE4LjY4IDI1Ni4zMyAxNDYuMTFDMjU2LjMzIDE2MC42OCAyNTMuMTkgMTc0LjUzIDI0Ny41NSAxODYuOTlMMjg4LjQ1IDIxMC42MUwyNzguNjIgMjI3LjcxTDIzNy42NyAyMDQuMDZDMjM0LjUzIDIwOC40MyAyMzEuMDQgMjEyLjU0IDIyNy4yNCAyMTYuMzRDMjA5LjI2IDIzNC4zMSAxODQuNDMgMjQ1LjQzIDE1Ny4wMiAyNDUuNDNDMTI5LjU5IDI0NS40MyAxMDQuNzYgMjM0LjMxIDg2Ljc4IDIxNi4zNEM4Mi45OSAyMTIuNTQgNzkuNSAyMDguNDMgNzYuMzYgMjA0LjA2TDM1LjQxIDIyNy43MUwyNS41OCAyMTAuNjFMNjYuNDggMTg2Ljk5QzYwLjg0IDE3NC41MyA1Ny42OSAxNjAuNjggNTcuNjkgMTQ2LjExQzU3LjY5IDExOC42OCA2OC44MSA5My44NSA4Ni43OCA3NS44OEMxMDIuNTcgNjAuMSAxMjMuNjQgNDkuNiAxNDcuMTEgNDcuMjhMMTQ3LjExIDAuMDRMMTY2LjkyIDAuMDRMMTY2LjkyIDQ3LjI4QzE5MC4zOSA0OS42IDIxMS40NiA2MC4xIDIyNy4yNCA3NS44OFpNMjEzLjIzIDg5Ljg5QzE5OC44NSA3NS41IDE3OC45NyA2Ni42IDE1Ny4wMiA2Ni42QzEzNS4wNiA2Ni42IDExNS4xOCA3NS41IDEwMC43OSA4OS44OUM4Ni40IDEwNC4yNyA3Ny41IDEyNC4xNSA3Ny41IDE0Ni4xMUM3Ny41IDE2OC4wNiA4Ni40IDE4Ny45NCAxMDAuNzkgMjAyLjMzQzExNS4xOCAyMTYuNzIgMTM1LjA2IDIyNS42MSAxNTcuMDIgMjI1LjYxQzE3OC45NyAyMjUuNjEgMTk4Ljg1IDIxNi43MiAyMTMuMjMgMjAyLjMzQzIyNy42MyAxODcuOTUgMjM2LjUzIDE2OC4wNiAyMzYuNTMgMTQ2LjExQzIzNi41MyAxMjQuMTUgMjI3LjYzIDEwNC4yNyAyMTMuMjMgODkuODlaIiAvPgoJCTxwYXRoIGlkPSJLZXlob2xlIiBjbGFzcz0ic2hwMCIgZD0iTTE0Ni4wNCAxNDEuODFMMTMyLjMxIDE5NC45NUwxODEuNzIgMTk0Ljk1TDE2Ny45OSAxNDEuODFDMTc1LjUxIDEzNy44NiAxODAuNjQgMTI5Ljk3IDE4MC42NCAxMjAuODlDMTgwLjY0IDEwNy44NSAxNzAuMDYgOTcuMjcgMTU3LjAyIDk3LjI3QzE0My45NyA5Ny4yNyAxMzMuMzkgMTA3Ljg1IDEzMy4zOSAxMjAuODlDMTMzLjM5IDEyOS45NyAxMzguNTIgMTM3Ljg2IDE0Ni4wNCAxNDEuODFaIiAvPgoJPC9nPgo8L3N2Zz4="
              alt="PKI Consortium Logo"
              className="pkimm-logo"
            />

            <div className="pkimm-header-actions">
              {savedState.assessments.length > 1 && activeAssessment && (
                <span
                  className="pkimm-active-assessment-label"
                  title={`Currently editing: ${activeAssessment.name}`}
                >
                  <span className="pkimm-active-assessment-label__caption">
                    Editing
                  </span>
                  <span className="pkimm-active-assessment-label__name">
                    {activeAssessment.name}
                  </span>
                </span>
              )}
              <span
                className="pkimm-privacy-chip"
                title="All assessment data stays in this browser. Nothing is sent anywhere."
              >
                <span aria-hidden="true">🔒</span>
                <span>Stored in this browser only</span>
              </span>
              <AssessmentHeader />
            </div>
          </div>
          {savedState.assessments.length > 1 && activeAssessment && (
            <div
              className="pkimm-active-assessment-mobile"
              title={`Currently editing: ${activeAssessment.name}`}
            >
              <span className="pkimm-active-assessment-mobile__caption">
                Editing:
              </span>
              <span className="pkimm-active-assessment-mobile__name">
                {activeAssessment.name}
              </span>
            </div>
          )}
          <nav className={`pkimm-tabs ${isMenuOpen ? "active" : ""}`}>
            <div className="pkimm-tabs__group pkimm-tabs__group--content">
              <button
                className={currentTab === "overview" ? "active" : ""}
                onClick={() => handleTabClick("overview")}
              >
                Overview
              </button>
              {data?.modules.map((module) => (
                <button
                  key={module.id}
                  className={module.id === currentTab ? "active" : ""}
                  onClick={() => handleTabClick(module.id)}
                >
                  {module.name}
                </button>
              ))}
              <button
                className={currentTab === "report" ? "active" : ""}
                onClick={() => handleTabClick("report")}
              >
                Report
              </button>
            </div>
            <div className="pkimm-tabs__group pkimm-tabs__group--meta">
              {extensionsData.length > 0 && (
                <button
                  className={currentTab === "extensions" ? "active" : ""}
                  onClick={() => handleTabClick("extensions")}
                >
                  Extensions
                </button>
              )}
              <button
                className={currentTab === "assessments" ? "active" : ""}
                onClick={() => handleTabClick("assessments")}
              >
                Assessments
              </button>
            </div>
          </nav>
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
        {hiddenEnabledExtensions.length > 0 &&
          activeAssessment &&
          !isTransient(activeAssessment) && (
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
          )}
        <div className="pkimm-content-container">
          <div className="pkimm-categories-container">
            {currentTab === "overview" && data && (
              <div>
                <Overview overviewData={overviewData} />
                {data.modules.length > 0 && (
                  <button
                    className="continue-button"
                    onClick={() => handleTabClick(data.modules[0].id)}
                  >
                    Continue to {data.modules[0].name}
                  </button>
                )}
              </div>
            )}
            {data?.modules.map(
              (module) =>
                module.id === currentTab && (
                  <div key={module.id}>
                    <Module
                      key={module.id}
                      module={module}
                      progress={progress}
                      referencesLookup={referencesLookup}
                      onLevelChange={handleLevelChange}
                      onApplicabilityChange={handleApplicabilityChange}
                      onNextSection={handleTabClick}
                    />
                  </div>
                ),
            )}
            {currentTab === "report" && data && (
              <UnifiedReport
                email={emailData}
                assessmentName={assessmentName}
                assessorName={assessorName}
                useCaseDescription={useCaseDescription}
                enabledExtensions={enabledExtensions}
                onExportPDF={(extId) =>
                  extId ? handleExportExtensionPDF(extId) : handleExportPDF()
                }
                onReset={(extId) =>
                  extId ? handleResetExtension(extId) : handleReset()
                }
                onAssessmentName={handleAssessmentName}
                onAssessorName={handleAssessorName}
                onUseCaseDescription={handleUseCaseDescription}
              />
            )}
            {currentTab === "extensions" && (
              <Extensions
                extensions={extensionsData}
                enabledExtensions={enabledExtensions}
                incompatibleExtensionIds={incompatibleExtensionIds}
                onToggleExtension={handleToggleExtension}
              />
            )}
            {currentTab === "assessments" && (
              <AssessmentManager
                state={savedState}
                loadedDataVersion={data?.version ?? "1.0.0"}
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
              />
            )}
          </div>
          <div className="pkimm-chart-container" ref={chartRef}>
            {data && (
              <SpiderChart
                modules={data.modules}
                progress={progress}
                chartLabels={chartLabels}
                extensions={extensionsData}
                enabledExtensions={chartExtensionsOverride ?? enabledExtensions}
                animate={chartAnimate}
              />
            )}
            {data && (
              <div className="pkimm-chart-progress">
                {(() => {
                  // Not Applicable categories are excluded from both
                  // numerator and denominator — they aren't part of the
                  // user's PKI scope, so they shouldn't count toward
                  // "X of Y assessed".
                  const totalCats = data.modules.reduce((acc, m) => {
                    return (
                      acc +
                      m.categories.filter((c) => {
                        const entry = progress[`${m.id}.${c.id}`];
                        return entry?.applicability !== false;
                      }).length
                    );
                  }, 0);
                  const assessedTotal = data.modules.reduce((acc, m) => {
                    return (
                      acc +
                      m.categories.filter((c) => {
                        const entry = progress[`${m.id}.${c.id}`];
                        return (
                          entry?.applicability !== false &&
                          (entry?.level ?? 0) > 0
                        );
                      }).length
                    );
                  }, 0);
                  const overallPct =
                    totalCats === 0
                      ? 0
                      : Math.round((assessedTotal / totalCats) * 100);
                  const overallLevelCls =
                    overallChartMaturityLevel > 0
                      ? `pkimm-chart-progress__row--level-${overallChartMaturityLevel}`
                      : "";
                  return (
                    <div
                      className={`pkimm-chart-progress__row pkimm-chart-progress__row--overall ${overallLevelCls}`}
                      title={`${assessedTotal} of ${totalCats} categories assessed across all modules`}
                    >
                      <div className="pkimm-chart-progress__header">
                        <span className="pkimm-chart-progress__label">
                          <span className="pkimm-chart-progress__label-text">
                            Overall
                          </span>
                        </span>
                        <span className="pkimm-chart-progress__level">
                          {LevelResult[overallChartMaturityLevel] ??
                            "Not Assessed"}{" "}
                          · {assessedTotal}/{totalCats}
                        </span>
                      </div>
                      <div className="pkimm-chart-progress__bar">
                        <div
                          className="pkimm-chart-progress__fill"
                          style={{ width: `${overallPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
                {data.modules.map((module) => {
                  const moduleLevel =
                    moduleMaturityLevels.find((m) => m.module === module.name)
                      ?.level ?? 0;
                  const total = module.categories.filter((c) => {
                    const entry = progress[`${module.id}.${c.id}`];
                    return entry?.applicability !== false;
                  }).length;
                  const assessed = module.categories.filter((c) => {
                    const entry = progress[`${module.id}.${c.id}`];
                    return (
                      entry?.applicability !== false && (entry?.level ?? 0) > 0
                    );
                  }).length;
                  const pct =
                    total === 0 ? 0 : Math.round((assessed / total) * 100);
                  const moduleLevelCls =
                    moduleLevel > 0
                      ? `pkimm-chart-progress__row--level-${moduleLevel}`
                      : "";
                  return (
                    <div
                      className={`pkimm-chart-progress__row ${moduleLevelCls}`}
                      key={module.id}
                      title={`${assessed} of ${total} categories assessed in ${module.name}`}
                    >
                      <div className="pkimm-chart-progress__header">
                        <span className="pkimm-chart-progress__label">
                          <span className="pkimm-chart-progress__label-text">
                            {module.name}
                          </span>
                        </span>
                        <span className="pkimm-chart-progress__level">
                          {LevelResult[moduleLevel] ?? "Not Assessed"} ·{" "}
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
                {extensionsData
                  .filter((ext) => enabledExtensions.includes(ext.extension.id))
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
                        const coreEntry = progress[`${moduleId}.${categoryId}`];
                        return coreEntry?.applicability !== false;
                      },
                    ).length;
                    const assessed = relCategories.filter(
                      ({ moduleId, categoryId }) => {
                        const coreEntry = progress[`${moduleId}.${categoryId}`];
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
      </div>
    </AssessmentTargetProvider>
  );
};
