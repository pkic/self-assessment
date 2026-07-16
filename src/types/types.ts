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
  /** Free-text reason captured when applicability === false (out of scope). */
  applicabilityReason?: string;
  /** Free-text notes captured in self-assessment mode; exported in YAML and the self PDF. */
  notes?: string;
  /** Free-text evidence captured at category grain (extension full view). */
  evidence?: string;
  /** Workspace links at category grain (extension full view); mirror RequirementProgress. */
  pocId?: string;
  interviewDate?: string;
  artifactIds?: string[];
}

/** Per-requirement assessment state (full-assessment mode). Key in
 *  Assessment.requirementProgress is `${moduleId}.${categoryId}.${requirementId}`,
 *  a separate map from category-level `progress` to avoid colliding with
 *  extension-scoped category keys `${extId}.${moduleId}.${categoryId}`. */
export interface RequirementProgress {
  level: number; // 0 = Not Assessed, 1–5
  applicability: boolean; // requirement-level N/A when false
  applicabilityReason?: string; // prompted (non-blocking) when applicability === false
  notes: string; // rationale / notes
  evidence: string; // text / links only
  completed?: boolean; // workflow marker; no effect on scoring, counters, or gating
  flagged?: boolean; // "revisit this"
  flagNote?: string;
  pocId?: string; // references Workspace.pocs[]
  interviewDate?: string; // ISO date
  artifactIds?: string[]; // references Workspace.artifacts[]
  related?: string[]; // assessor-authored cross-links (requirement keys)
  assessorReview?: { status: "agreed" | "adjusted"; note?: string };
  updatedAt?: string; // per-entry timestamp; enables scoped merge later
}

export interface PkiEnvironment {
  components?: string;
  outOfScopeConsiderations?: string;
  highLevelDesign?: string;
  pointsOfInteraction?: string;
}

export interface Workspace {
  intake?: { questionId: string; question: string; answer: string }[];
  intakeCatalogVersion?: string;
  workingNotes?: string;
  artifacts?: { id: string; title: string; locator: string; notes?: string }[];
  pocs?: { id: string; name: string; role?: string; contact?: string }[];
  checklist?: {
    itemId: string;
    label: string;
    done: boolean;
    group?: string;
    notes?: string;
    custom?: boolean;
  }[];
  orphanedEntries?: {
    originalKey: string;
    requirementName?: string;
    payload: RequirementProgress;
  }[];
}

export interface ActionPlans {
  categories?: Record<
    string,
    {
      targetLevel: number;
      objectives?: { id: string; text: string }[];
      responsibility?: string;
      responsiblePocId?: string;
      targetDate?: string;
      resources?: string;
      outputs?: { id: string; text: string }[];
      tasks?: { itemId: string; label: string; done: boolean }[];
      comments?: string;
    }
  >;
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
  // Full-assessment fields (all optional; absent on a quick assessment).
  requirementProgress?: Record<string, RequirementProgress>;
  organizationName?: string;
  assessorPosition?: "internal" | "external";
  assessorCompany?: string;
  assessmentType?: "self" | "formal" | "third-party";
  startDate?: string;
  targetDate?: string;
  finishDate?: string;
  pkiEnvironment?: PkiEnvironment;
  workspace?: Workspace;
  actionPlans?: ActionPlans;
  lastView?: "self" | "full";
  lastPosition?: {
    view: string;
    tab: string;
    categoryKey?: string;
    requirementKey?: string;
  };
  sourceStructure: StructureSnapshot;
  meta: {
    createdAt: string;
    updatedAt: string;
    importedFromId?: string;
  };
}

/** Top-level localStorage shape stored under key `pkimm-sa`. */
export interface SavedState {
  stateSchemaVersion: 1 | 2;
  activeId: string | null;
  assessments: Assessment[];
}

export interface MigrationSummary {
  mapped: number;
  addedInTarget: string[];
  unmappedFromSource: string[];
  reclassifiedLevel1ToZero: number;
  requirementsMapped?: number;
  requirementsUnmapped?: number;
  actionPlansRemapped?: number;
}

export interface MigrationResult {
  migratedProgress: Record<string, ProgressData>;
  migratedRequirementProgress?: Record<string, RequirementProgress>;
  migratedActionPlans?: ActionPlans;
  orphanedEntries?: Workspace["orphanedEntries"];
  migratedEnabledExtensions: EnabledExtension[];
  newSourceStructure: StructureSnapshot;
  summary: MigrationSummary;
}
