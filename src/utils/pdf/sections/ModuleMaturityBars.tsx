import React from "react";
import { View } from "@react-pdf/renderer";
import { MaturityBars } from "../charts/MaturityBars";
import { SectionHeading } from "../SectionHeading";
import type { SectionComponent } from "./SectionContext";

// Per-module maturity as horizontal bars — the same chart every pre-registry
// tier document (Core/Assessment/Attestation/Detailed) renders. Renders
// nothing when there are no modules to show, matching every other section's
// null-when-empty convention.
export const ModuleMaturityBars: SectionComponent = (ctx) => {
  if (ctx.moduleMaturityLevels.length === 0) return null;

  return (
    <View>
      <SectionHeading>Module maturity</SectionHeading>
      <MaturityBars moduleMaturityLevels={ctx.moduleMaturityLevels} />
    </View>
  );
};
