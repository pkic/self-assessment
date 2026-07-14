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
    }),
    [
      target,
      availableExtensions,
      enabledExtensions,
      coreModules,
      progress,
      requirementProgress,
    ],
  );

  return (
    <AssessmentTargetContext.Provider value={value}>
      {children}
    </AssessmentTargetContext.Provider>
  );
};
