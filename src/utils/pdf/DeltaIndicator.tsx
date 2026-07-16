import { Polygon, Svg, Text, View } from "@react-pdf/renderer";
import React from "react";
import type { Delta } from "../comparison";
import { cssVar } from "./theme";

export const UP_COLOR = cssVar("--pkimm-success-fg", "#1e8e3e");
export const DOWN_COLOR = cssVar("--pkimm-danger-fg", "#d93025");
const MUTED_COLOR = "#5f6368";

// A colored up/down triangle drawn with an @react-pdf Svg/Polygon — never a
// `▲`/`▼`/`→` glyph in a <Text> run, which the embedded Roboto subset can
// silently mis-map (see LevelPill.render.test.tsx). Exported so a legend can
// draw the same shape/color without a rating attached to it. The margin
// lives on a wrapping View (never a `style` prop on `Svg` itself), matching
// ActionPlans.tsx's ProgressionArrow — @react-pdf/renderer's Svg node lays
// out differently when styled directly next to plain-Text siblings.
export const DeltaTriangle: React.FC<{
  direction: "up" | "down";
  color: string;
}> = ({ direction, color }) => (
  <View style={{ marginRight: 3 }}>
    <Svg width={8} height={8}>
      <Polygon
        points={direction === "up" ? "4,0 8,8 0,8" : "0,0 8,0 4,8"}
        fill={color}
      />
    </Svg>
  </View>
);

// Renders a comparison Delta as a colored SVG triangle + a signed number/
// label <Text> — never a `▲`/`▼`/`→`/`✓`/`−` glyph, which the embedded
// Roboto subset can silently mis-map in a PDF text run. A `-1` on either side
// is Not Applicable, which has no meaningful up/down direction to draw.
export const DeltaIndicator: React.FC<{ d: Delta }> = ({ d }) => {
  if (d.current === -1 || d.baseline === -1) {
    const label = d.baseline === -1 && d.current >= 0 ? "— new" : "n/a";
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 8, color: MUTED_COLOR }}>{label}</Text>
      </View>
    );
  }

  if (d.direction === "same") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 8, color: MUTED_COLOR }}>— no change</Text>
      </View>
    );
  }

  const up = d.direction === "up";
  const color = up ? UP_COLOR : DOWN_COLOR;
  // `delta` is already negative on the down side, and template-literal
  // interpolation of a negative number uses the plain ASCII hyphen (`-`),
  // never the `−` minus-sign glyph the forbidden-glyph check guards against.
  const label = up ? `+${d.delta}` : `${d.delta}`;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <DeltaTriangle direction={up ? "up" : "down"} color={color} />
      <Text style={{ fontSize: 8, fontWeight: "bold", color }}>{label}</Text>
    </View>
  );
};
