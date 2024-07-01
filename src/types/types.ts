export interface LevelData {
  number: number;
  name: string;
  description: string;
}

export interface CategoryData {
  id: string;
  weight: number;
  name: string;
  description: string;
  levels: LevelData[];
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
