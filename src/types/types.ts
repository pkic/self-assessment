export interface LevelData {
  number: number;
  name: string;
  description: string;
}

export interface RequirementData {
  id: string;
  weight: number;
  description: string;
  guidance: string;
  assessment: string;
  /** 1.0.0 stored references as a markdown block; 2.0.0 stores an array
   *  of reference catalog ids resolved against the references catalog. */
  references: string | string[];
}

export interface CategoryData {
  id: string;
  weight: number;
  name: string;
  description: string;
  levels: LevelData[];
  requirements: RequirementData[];
}

export interface ModuleData {
  id: string;
  name: string;
  description: string;
  categories: CategoryData[];
}

export interface AssessmentData {
  schemaVersion?: string;
  version?: string;
  modules: ModuleData[];
}

export interface ProgressData {
  level: number;
  result: string;
  description: string;
  applicability: boolean;
}

export interface EmailData {
  enabled: boolean;
  subject: string;
  body: string;
}

export interface OverviewData {
  data: string;
}

export interface ConfigData {
  email: EmailData;
  overview: OverviewData;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  documentation?: string;
  compatibility?: string[];
  floorScore?: boolean;
}

export interface ExtensionLevelData {
  number: number;
  name: string;
  description: string;
}

export interface ExtensionCategoryData {
  id: string;
  weight: number;
  guidance: string;
  assessment: string;
  references: string | string[];
  levels: ExtensionLevelData[];
}

export interface ExtensionModuleData {
  id: string;
  categories: ExtensionCategoryData[];
}

export interface ExtensionRequirementOverlay {
  id: string;
  type: "multiplier" | "addition" | "override";
  multiplier?: number;
  addition?: number;
  override?: number;
  rationale: string;
}

export interface ExtensionCategoryOverlay {
  id: string;
  type?: "multiplier" | "addition" | "override";
  multiplier?: number;
  addition?: number;
  override?: number;
  rationale?: string;
  requirements?: ExtensionRequirementOverlay[];
}

export interface ExtensionModuleOverlay {
  id: string;
  categories: ExtensionCategoryOverlay[];
}

export interface ExtensionData {
  schemaVersion?: string;
  extension: ExtensionInfo;
  relevance: {
    modules: ExtensionModuleData[];
  };
  overlays?: {
    modules: ExtensionModuleOverlay[];
  };
  /** Extension-local references catalog — entries referenced only by this
   *  extension. Merged with the main pkimm-references.yaml at runtime. */
  references?: ReferenceEntry[];
}

// --- 2.0.0 storage model ----------------------------------------------------

export interface ReferenceEntry {
  id: string;
  title: string;
  url?: string;
  authority?: string;
  regions?: string[];
}

export interface ReferencesCatalog {
  schemaVersion: string;
  version: string;
  references: ReferenceEntry[];
}

export interface EnabledExtension {
  id: string;
  version: string;
}

/** Snapshot of category/requirement names at authoring time. The migration
 *  engine reads this to map progress keys across data versions without
 *  re-fetching the source YAML. */
export interface StructureSnapshot {
  byKey: Record<
    string,
    { moduleId: string; categoryName: string; requirementName?: string }
  >;
  extensionScopes?: Record<
    string,
    {
      extensionId: string;
      extensionVersion: string;
      moduleId: string;
      categoryName: string;
      requirementName?: string;
    }
  >;
}

/** One assessment in the user's list. */
export interface Assessment {
  id: string;
  name: string;
  dataVersion: string;
  progress: Record<string, ProgressData>;
  enabledExtensions: EnabledExtension[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  sourceStructure: StructureSnapshot;
  meta: {
    createdAt: string;
    updatedAt: string;
    importedFromId?: string;
  };
}

/** Top-level localStorage shape stored under key `pkimm-sa`. */
export interface SavedState {
  stateSchemaVersion: 1;
  activeId: string | null;
  assessments: Assessment[];
}

export interface MigrationSummary {
  mapped: number;
  addedInTarget: string[];
  unmappedFromSource: string[];
  reclassifiedLevel1ToZero: number;
}

export interface MigrationResult {
  migratedProgress: Record<string, ProgressData>;
  migratedEnabledExtensions: EnabledExtension[];
  newSourceStructure: StructureSnapshot;
  summary: MigrationSummary;
}
