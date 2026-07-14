import { Image, Text, View } from "@react-pdf/renderer";
import React from "react";
import { DistributionStackedBars } from "../charts/DistributionStackedBars";
import { LevelDistributionTable } from "../LevelDistributionTable";
import { SectionHeading } from "../SectionHeading";
import { styles } from "../theme";
import type { SectionComponent } from "./SectionContext";

// The maturity-overview block for the Assessment/Detailed tiers: the radar
// cover PNG (when captured) plus the level-distribution stacked bars and
// table. Gated on ctx.distribution directly (not a sub-component's internal
// null) — a SectionComponent must return its null-ness synchronously so
// ReportDocument can filter it out before deciding page breaks.
export const MaturityCharts: SectionComponent = (ctx) => {
  if (ctx.distribution.groups.length === 0) return null;

  const grainNoun =
    ctx.distribution.grain === "requirement" ? "requirements" : "categories";
  const applicable = ctx.distribution.total.totalApplicable;
  const notAssessed = ctx.distribution.total.notAssessed;

  return (
    <View>
      {/* This section is in PAGE_BREAK_BEFORE, so it ALWAYS starts at the top
          of its own page and the heading/image/caption never need to relocate
          mid-flow. That matters: the radar Image must NOT sit inside a
          wrap={false} group — in @react-pdf v4.5.1 a non-wrapping view that
          contains an Image and has to move to the next page corrupts the
          layout of everything after it (following content collapses to zero
          height and a blank page appears). The image keeps an EXPLICIT height
          so its box is known at layout time (a width-only image defers sizing
          to image decode and can overflow the reserved bottom padding), and
          objectFit:"contain" preserves the captured chart's aspect ratio. */}
      <SectionHeading>Maturity level distribution</SectionHeading>
      {ctx.chartImgData.length > 0 && (
        <Image
          src={ctx.chartImgData}
          style={{
            width: 300,
            height: 220,
            objectFit: "contain",
            alignSelf: "center",
          }}
        />
      )}
      <Text style={[styles.about_text, { marginBottom: 4 }]}>
        How the {applicable} in-scope {grainNoun} are distributed across the
        maturity levels, per module
        {notAssessed > 0 ? ` (${notAssessed} not assessed yet). ` : ". "}
        Each bar segment shows the number of {grainNoun} at that level; the
        exact per-category numbers follow in the table below.
      </Text>
      <DistributionStackedBars distribution={ctx.distribution} />
      <LevelDistributionTable distribution={ctx.distribution} />
    </View>
  );
};
