import { useState, useEffect, useRef, useCallback } from "react";
import { yamlParser } from "../../../utils/yamlParser";
import { decodeProgressHash } from "../../../utils/urlGenerator";
import { computeIncompatibleExtensionIds } from "../../../utils/extensionUpload";
import {
  AssessmentData,
  ProgressData,
  ExtensionData,
  SavedState,
  Assessment as SavedAssessment,
  ReferenceEntry,
  ReferencesCatalog,
} from "../../../types/types";
import LevelResult from "../../../enums/LevelResult";
import {
  LEGACY_KEY,
  detectLegacyAssessmentData,
  newEmptyAssessment,
  buildStructureSnapshot,
  LegacyAssessmentData,
} from "../../../utils/storage";
import { getStorageAdapter } from "../../../utils/storageAdapter";
import type { StorageBackend } from "../../../utils/storageAdapter";
import { normalizeAssessmentActionPlans } from "../../../utils/actionPlans";
import {
  getBundledModelYaml,
  DEFAULT_MODEL_VERSION,
  BUNDLED_REFERENCES_YAML,
} from "../../../defaults/bundledData";

const EMPTY_STATE: SavedState = {
  stateSchemaVersion: 1,
  activeId: null,
  assessments: [],
};

function buildReferencesLookup(
  baseRefs: ReferenceEntry[],
  exts: ExtensionData[],
): Map<string, ReferenceEntry> {
  const m = new Map<string, ReferenceEntry>();
  for (const ref of baseRefs) m.set(ref.id, ref);
  for (const ext of exts)
    for (const ref of ext.references ?? []) m.set(ref.id, ref);
  return m;
}

export interface InitialLoad {
  data: AssessmentData | null;
  extensionsData: ExtensionData[];
  referencesLookup: Map<string, ReferenceEntry>;
  incompatibleExtensionIds: Set<string>;
  hasLegacyData: boolean;
  setHasLegacyData: (v: boolean) => void;
  legacyPrompt: LegacyAssessmentData | null;
  setLegacyPrompt: (v: LegacyAssessmentData | null) => void;
  hiddenExtensions: Set<string>;
  setHiddenExtensions: (s: Set<string>) => void;
  forwardCompatFailure: string | null;
  refreshExtensions: () => Promise<void>;
}

export const useInitialLoad = (input: {
  src?: string;
  references?: string;
  setSavedState: React.Dispatch<React.SetStateAction<SavedState>>;
  setCurrentTab: (t: string | null) => void;
  setStorageBackend: (b: StorageBackend | null) => void;
}): InitialLoad => {
  const { src, references, setSavedState, setCurrentTab, setStorageBackend } =
    input;

  const [data, setData] = useState<AssessmentData | null>(null);
  const [extensionsData, setExtensionsData] = useState<ExtensionData[]>([]);
  const [referencesLookup, setReferencesLookup] = useState<
    Map<string, ReferenceEntry>
  >(() => new Map());
  const [legacyPrompt, setLegacyPrompt] = useState<LegacyAssessmentData | null>(
    null,
  );
  // Holds the raw saved-state JSON when its schema version is newer than this
  // widget supports; drives the ForwardCompatRefusal screen.
  const [forwardCompatFailure, setForwardCompatFailure] = useState<
    string | null
  >(null);
  const [hiddenExtensions, setHiddenExtensions] = useState<Set<string>>(
    new Set(),
  );
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [incompatibleExtensionIds, setIncompatibleExtensionIds] = useState<
    Set<string>
  >(new Set());
  const baseRefsRef = useRef<ReferenceEntry[]>([]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      let state: SavedState;
      try {
        const adapter = await getStorageAdapter();
        setStorageBackend(adapter.backend);
        const loaded = (await adapter.readSavedState()) ?? EMPTY_STATE;
        state = {
          ...loaded,
          assessments: loaded.assessments.map(normalizeAssessmentActionPlans),
        };
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
        try {
          const response = await fetch(src);
          const yamlText = await response.text();
          initialData = yamlParser(yamlText) as AssessmentData;
        } catch (error) {
          // A failed override fetch must not strand the app in an infinite
          // loading state — fall back to the bundled model.
          console.error(`Error loading model from ${src}:`, error);
          const bundled = getBundledModelYaml(DEFAULT_MODEL_VERSION);
          if (bundled) initialData = yamlParser(bundled) as AssessmentData;
        }
      } else {
        const bundled = getBundledModelYaml(DEFAULT_MODEL_VERSION);
        if (bundled) initialData = yamlParser(bundled) as AssessmentData;
      }

      const adapter2 = await getStorageAdapter();
      const initialExtensions = await adapter2.listExtensions();
      const loadedVersion = initialData?.version ?? "1.0.0";
      setExtensionsData(initialExtensions);
      setIncompatibleExtensionIds(
        computeIncompatibleExtensionIds(initialExtensions, loadedVersion),
      );

      // Build the combined references lookup: start from the main catalog
      // (referencesUrl override, else the bundled default catalog) and merge in
      // extension-local entries. Later entries with the same id win, so a
      // stored extension can shadow a main-catalog entry if it really wants to.
      let baseRefs: ReferenceEntry[] = [];
      try {
        const catalogYaml = references
          ? await (await fetch(references)).text()
          : BUNDLED_REFERENCES_YAML;
        baseRefs =
          (yamlParser(catalogYaml) as ReferencesCatalog).references ?? [];
      } catch (error) {
        console.error(`Error loading references:`, error);
      }
      baseRefsRef.current = baseRefs;
      setReferencesLookup(buildReferencesLookup(baseRefs, initialExtensions));

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
              requirementProgress: decoded.requirementProgress,
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
    };

    void load().catch((error) => console.error("Error loading data:", error));
  }, [src, references]);

  const refreshExtensions = useCallback(async () => {
    const adapter = await getStorageAdapter();
    const exts = await adapter.listExtensions();
    setExtensionsData(exts);
    setIncompatibleExtensionIds(
      computeIncompatibleExtensionIds(exts, data?.version ?? "1.0.0"),
    );
    setReferencesLookup(buildReferencesLookup(baseRefsRef.current, exts));
  }, [data]);

  return {
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
  };
};
