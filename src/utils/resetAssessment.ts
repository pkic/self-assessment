import type { Assessment, ProgressData } from "../types/types";

export interface ResetScopes {
  ratings: boolean;
  actionPlans: boolean;
  workspace: boolean;
  reportDetails: boolean;
}

export interface ResetDeps {
  /** A fresh level-0 progress map for all core + loaded-extension categories
   *  (built by the caller via its initProgress); used by the ratings scope. */
  emptyProgress: Record<string, ProgressData>;
}

export const resetAssessment = (
  a: Assessment,
  scopes: ResetScopes,
  deps: ResetDeps,
): Assessment => {
  if (
    !scopes.ratings &&
    !scopes.actionPlans &&
    !scopes.workspace &&
    !scopes.reportDetails
  ) {
    return a;
  }
  const next: Assessment = { ...a };
  if (scopes.ratings) {
    // Merge-overlay, not a full replace: `deps.emptyProgress` only seeds keys for
    // core categories + extensions loaded on this page, so loaded categories reseed
    // to level 0 here. A key absent from that seed — e.g. an extension that's
    // enabled on the assessment but not loaded on this page — is preserved as-is,
    // since a hidden extension's progress must survive untouched and reappear
    // correctly once the extension loads.
    next.progress = { ...a.progress, ...deps.emptyProgress };
    next.requirementProgress = {};
  }
  if (scopes.actionPlans) {
    next.actionPlans = undefined;
  }
  if (scopes.workspace) {
    next.workspace = undefined;
  }
  if (scopes.reportDetails) {
    next.assessmentName = "";
    next.assessorName = "";
    next.useCaseDescription = "";
    next.organizationName = undefined;
    next.assessorCompany = undefined;
    next.assessorPosition = undefined;
    next.assessmentType = undefined;
    next.startDate = undefined;
    next.targetDate = undefined;
    next.finishDate = undefined;
    next.pkiEnvironment = undefined;
  }
  return next;
};
