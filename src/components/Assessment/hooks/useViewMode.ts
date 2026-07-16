import type { ModeCaps } from "../../../utils/modes";

export type ViewMode = "self" | "full";

export interface ViewModeControl {
  view: ViewMode;
  fullAvailable: boolean;
  fullDisabledReason: string | null;
  setView: (v: ViewMode) => void;
}

/**
 * Resolves the effective Self/Full view for the active assessment. View mode
 * is orthogonal to the extension target (AssessmentTargetContext) — this
 * hook never reads or sets which module/extension is being viewed, only
 * whether the widget is in "self" or "full" assessment mode.
 */
export const useViewMode = (input: {
  caps: ModeCaps;
  lastView: ViewMode | undefined;
  dataVersion: string | undefined;
  modelVersion: string | undefined;
  persistView: (v: ViewMode) => void;
}): ViewModeControl => {
  const { caps, lastView, dataVersion, modelVersion, persistView } = input;

  const fullAvailable =
    caps.full && !!dataVersion && dataVersion === modelVersion;

  const requestedView = lastView ?? caps.defaultView;
  const view: ViewMode = fullAvailable ? requestedView : "self";

  const fullDisabledReason: string | null = fullAvailable
    ? null
    : !caps.full
      ? null
      : "Migrate to this model version to use full assessment";

  const setView = (v: ViewMode): void => {
    if (v === "full" && !fullAvailable) return;
    persistView(v);
  };

  return { view, fullAvailable, fullDisabledReason, setView };
};
