import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExtensionData, ModuleData, ProgressData } from '../types/types';

export type AssessmentTarget = 
  | { kind: 'original' }
  | { kind: 'extension'; id: string };

interface AssessmentTargetContextType {
  target: AssessmentTarget;
  setTarget: (target: AssessmentTarget) => void;
  availableExtensions: ExtensionData[];
  enabledExtensions: string[];
  isExtensionEnabled: (id: string) => boolean;
  getModules: () => ModuleData[];
  getProgress: () => Record<string, ProgressData>;
  getActiveExtension: () => ExtensionData | null;
  getCurrentTargetName: () => string;
}

const AssessmentTargetContext = createContext<AssessmentTargetContextType | undefined>(undefined);

export const useAssessmentTarget = () => {
  const context = useContext(AssessmentTargetContext);
  if (!context) {
    throw new Error('useAssessmentTarget must be used within an AssessmentTargetProvider');
  }
  return context;
};

interface AssessmentTargetProviderProps {
  children: ReactNode;
  availableExtensions: ExtensionData[];
  coreModules: ModuleData[];
  progress: Record<string, ProgressData>;
  enabledExtensions: string[];
  onTargetChange?: (target: AssessmentTarget) => void;
}

export const AssessmentTargetProvider: React.FC<AssessmentTargetProviderProps> = ({
  children,
  availableExtensions,
  coreModules,
  progress,
  enabledExtensions,
  onTargetChange,
}) => {
  const [target, setTargetState] = useState<AssessmentTarget>({ kind: 'original' });

  const setTarget = (newTarget: AssessmentTarget) => {
    setTargetState(newTarget);
    if (onTargetChange) {
      onTargetChange(newTarget);
    }
  };

  const getModules = () => coreModules;

  const getProgress = () => progress;

  const getActiveExtension = () => {
    if (target.kind === 'extension') {
      const ext = availableExtensions.find(ext => ext.extension.id === target.id) || null;
      // Guard: if currently selected extension is disabled, fall back to Original
      if (ext && !enabledExtensions.includes(ext.extension.id)) {
        return null;
      }
      return ext;
    }
    return null;
  };

  const getCurrentTargetName = () => {
    if (target.kind === 'original') return 'Original';
    const ext = availableExtensions.find(e => e.extension.id === target.id);
    return ext?.extension.name || 'Extension';
  };

  const isExtensionEnabled = (id: string) => enabledExtensions.includes(id);

  return (
    <AssessmentTargetContext.Provider
      value={{
        target,
        setTarget,
        availableExtensions,
        enabledExtensions,
        isExtensionEnabled,
        getModules,
        getProgress,
        getActiveExtension,
        getCurrentTargetName,
      }}
    >
      {children}
    </AssessmentTargetContext.Provider>
  );
};
