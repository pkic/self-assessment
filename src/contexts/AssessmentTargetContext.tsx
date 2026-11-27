import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  ExtensionData,
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../types/types";
import type { AssessmentProfileData } from "../assessment-engine/types";

const DEFAULT_METHODOLOGY: AssessmentProfileData["runtime"]["methodology"] = {
  strategy: "weighted-average",
  version: "1.0.0",
  parameters: {
    minimumLevel: 0,
    maximumLevel: 5,
    rounding: "floor",
  },
};

export type AssessmentTarget =
  { kind: "original" } | { kind: "extension"; id: string };

interface AssessmentTargetContextType {
  target: AssessmentTarget;
  setTarget: (target: AssessmentTarget) => void;
  availableExtensions: ExtensionData[];
  enabledExtensions: string[];
  isExtensionEnabled: (id: string) => boolean;
  getModules: () => ModuleData[];
  getProgress: () => Record<string, ProgressData>;
  getRequirementProgress: () => Record<string, RequirementProgress>;
  getActiveExtension: () => ExtensionData | null;
  getCurrentTargetName: () => string;
  methodology: AssessmentProfileData["runtime"]["methodology"];
}

const AssessmentTargetContext = createContext<
  AssessmentTargetContextType | undefined
>(undefined);

export const useAssessmentTarget = () => {
  const context = useContext(AssessmentTargetContext);
  if (!context) {
    throw new Error(
      "useAssessmentTarget must be used within an AssessmentTargetProvider",
    );
  }
  return context;
};

interface AssessmentTargetProviderProps {
  children: ReactNode;
  availableExtensions: ExtensionData[];
  coreModules: ModuleData[];
  progress: Record<string, ProgressData>;
  requirementProgress: Record<string, RequirementProgress>;
  enabledExtensions: string[];
  methodology?: AssessmentProfileData["runtime"]["methodology"];
}

export const AssessmentTargetProvider: React.FC<
  AssessmentTargetProviderProps
> = ({
  children,
  availableExtensions,
  coreModules,
  progress,
  requirementProgress,
  enabledExtensions,
  methodology = DEFAULT_METHODOLOGY,
}) => {
  const [target, setTarget] = useState<AssessmentTarget>({ kind: "original" });

  const value = useMemo<AssessmentTargetContextType>(
    () => ({
      target,
      setTarget,
      availableExtensions,
      enabledExtensions,
      isExtensionEnabled: (id: string) => enabledExtensions.includes(id),
      getModules: () => coreModules,
      getProgress: () => progress,
      getRequirementProgress: () => requirementProgress,
      getActiveExtension: () => {
        if (target.kind === "extension") {
          const ext =
            availableExtensions.find((ext) => ext.extension.id === target.id) ||
            null;
          // Guard: if currently selected extension is disabled, fall back to Original
          if (ext && !enabledExtensions.includes(ext.extension.id)) {
            return null;
          }
          return ext;
        }
        return null;
      },
      getCurrentTargetName: () => {
        if (target.kind === "original") return "Original";
        const ext = availableExtensions.find(
          (e) => e.extension.id === target.id,
        );
        return ext?.extension.name || "Extension";
      },
      methodology,
    }),
    [
      target,
      availableExtensions,
      enabledExtensions,
      coreModules,
      progress,
      requirementProgress,
      methodology,
    ],
  );

  return (
    <AssessmentTargetContext.Provider value={value}>
      {children}
    </AssessmentTargetContext.Provider>
  );
};
