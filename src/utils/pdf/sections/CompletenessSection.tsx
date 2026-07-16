import { View } from "@react-pdf/renderer";
import React from "react";
import { CompletenessRings } from "../charts/CompletenessRings";
import { SectionHeading } from "../SectionHeading";
import type { SectionComponent } from "./SectionContext";

// Assessment-completeness rings (overall + per-module) for the
// Assessment/Detailed tiers, fed from ctx.reportCompleteness. Gated on ctx
// directly — a SectionComponent must return its null-ness synchronously so
// ReportDocument can filter it out before deciding page breaks.
export const CompletenessSection: SectionComponent = (ctx) => {
  if (ctx.reportCompleteness.total === 0) return null;

  return (
    <View>
      <SectionHeading>Assessment Completeness</SectionHeading>
      <CompletenessRings
        completeness={{
          assessed: ctx.reportCompleteness.assessed,
          total: ctx.reportCompleteness.total,
          perModule: ctx.reportCompleteness.perModule.map((m) => ({
            module: m.module,
            assessed: m.assessed,
            total: m.total,
          })),
        }}
      />
    </View>
  );
};
