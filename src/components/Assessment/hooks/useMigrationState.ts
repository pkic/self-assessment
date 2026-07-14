import { useState } from "react";
import {
  Assessment as SavedAssessment,
  AssessmentData,
  ExtensionData,
  MigrationSummary,
} from "../../../types/types";
import { AxisMismatch } from "../../MigrationBanner/MigrationBanner";

export interface MigrationState {
  mismatches: AxisMismatch[];
  shouldShowMigrationBanner: boolean;
  migrationSummary: MigrationSummary | null;
  setMigrationSummary: (s: MigrationSummary | null) => void;
  migrationDismissedFor: string | null;
  setMigrationDismissedFor: (id: string | null) => void;
}

const isTransient = (a: SavedAssessment | null | undefined): boolean =>
  a?.id.startsWith("transient-") ?? false;

export const useMigrationState = (input: {
  activeAssessment: SavedAssessment | undefined;
  data: AssessmentData | null;
  extensionsData: ExtensionData[];
  hiddenExtensions: Set<string>;
}): MigrationState => {
  const { activeAssessment, data, extensionsData, hiddenExtensions } = input;

  const [migrationSummary, setMigrationSummary] =
    useState<MigrationSummary | null>(null);
  const [migrationDismissedFor, setMigrationDismissedFor] = useState<
    string | null
  >(null);

  const computeMismatches = (): AxisMismatch[] => {
    if (!activeAssessment || !data) return [];
    const out: AxisMismatch[] = [];
    const loadedDataVersion = data.version ?? "1.0.0";
    if (activeAssessment.dataVersion !== loadedDataVersion) {
      out.push({
        kind: "model",
        label: `PKIMM ${activeAssessment.dataVersion} → ${loadedDataVersion}`,
        canKeepHidden: false,
      });
    }
    for (const e of activeAssessment.enabledExtensions) {
      if (hiddenExtensions.has(e.id)) continue;
      const loaded = extensionsData.find((x) => x.extension.id === e.id);
      if (!loaded) continue; // not loaded at all — surfaced as preserved-but-hidden in P.1
      if (loaded.extension.version !== e.version) {
        out.push({
          kind: "extension",
          label: `${loaded.extension.name} ${e.version} → ${loaded.extension.version}`,
          extensionId: e.id,
          canKeepHidden: true,
        });
      }
    }
    return out;
  };

  const mismatches = computeMismatches();
  const shouldShowMigrationBanner =
    activeAssessment !== null &&
    activeAssessment !== undefined &&
    !isTransient(activeAssessment) &&
    mismatches.length > 0 &&
    migrationDismissedFor !== activeAssessment.id;

  return {
    mismatches,
    shouldShowMigrationBanner,
    migrationSummary,
    setMigrationSummary,
    migrationDismissedFor,
    setMigrationDismissedFor,
  };
};
