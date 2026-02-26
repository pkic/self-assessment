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
  references: string;
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
  floorScore?: number;
  weightedScoreEnabled?: boolean;
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
  references: string;
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
  extension: ExtensionInfo;
  relevance: {
    modules: ExtensionModuleData[];
  };
  overlays?: {
    modules: ExtensionModuleOverlay[];
  };
}
