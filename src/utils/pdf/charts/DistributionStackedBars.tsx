import { Text, View } from "@react-pdf/renderer";
import React from "react";
import type { LevelDistribution } from "../../reportData";
import { getColorForLevel } from "../theme";
import {
  stackSegments,
  distSegmentColor,
  DistSegmentKey,
} from "./chartGeometry";

const levelColor = (n: number) => getColorForLevel(n).background;

// Text color readable on a given segment fill: level segments reuse the
// contrast color getColorForLevel already defines; the light "N/A" grey takes
// dark text, the darker "Not assessed" grey takes white.
const segmentTextColor = (key: DistSegmentKey): string => {
  if (key === "na") return "#333333";
  if (key === "not-assessed") return "#ffffff";
  return getColorForLevel(Number(key.slice(1))).text;
};

const LEGEND_KEYS = [
  "na",
  "not-assessed",
  "l1",
  "l2",
  "l3",
  "l4",
  "l5",
] as const;

const legendLabel = (k: DistSegmentKey): string =>
  k === "na" ? "N/A" : k === "not-assessed" ? "Not assessed" : `L${k.slice(1)}`;

// One labeled bar per module: each colored segment carries its COUNT (when
// wide enough to hold it) and the row ends with the module's total, so the
// chart is readable on its own rather than a bare strip of colors. The exact
// per-category numbers still live in the LevelDistributionTable below it.
export const DistributionStackedBars: React.FC<{
  distribution: LevelDistribution;
}> = ({ distribution }) => (
  <View style={{ marginTop: 8, marginBottom: 8 }}>
    {distribution.groups.map((g) => {
      const segs = stackSegments(g.subtotal, levelColor);
      const total =
        g.subtotal.notApplicable +
        g.subtotal.notAssessed +
        g.subtotal.levels.reduce((a, b) => a + b, 0);
      return (
        <View
          key={g.moduleId}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
          wrap={false}
        >
          <Text style={{ width: 100, fontSize: 9 }}>{g.module}</Text>
          <View
            style={{
              flex: 1,
              height: 16,
              flexDirection: "row",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {segs.length === 0 ? (
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.08)" }} />
            ) : (
              segs.map((s) => (
                <View
                  key={s.key}
                  style={{
                    width: `${s.pct}%`,
                    backgroundColor: s.color,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {s.pct >= 5 && (
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: "bold",
                        color: segmentTextColor(s.key),
                      }}
                    >
                      {s.count}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
          <Text style={{ width: 30, fontSize: 9, textAlign: "right" }}>
            {total}
          </Text>
        </View>
      );
    })}
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: 6,
      }}
    >
      {LEGEND_KEYS.map((k) => (
        <View
          key={k}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              marginRight: 4,
              backgroundColor: distSegmentColor(k, levelColor),
            }}
          />
          <Text style={{ fontSize: 8, color: "#333333" }}>
            {legendLabel(k)}
          </Text>
        </View>
      ))}
    </View>
  </View>
);
