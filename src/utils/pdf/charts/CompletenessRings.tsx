import { Svg, Circle, G, Text, View } from "@react-pdf/renderer";
import React from "react";
import { ringArc } from "./chartGeometry";

const R = 22,
  STROKE = 6,
  SIZE = 60,
  CX = SIZE / 2,
  CY = SIZE / 2;

const Ring: React.FC<{ label: string; assessed: number; total: number }> = ({
  label,
  assessed,
  total,
}) => {
  const fraction = total > 0 ? assessed / total : 0;
  const { arcLen, circumference } = ringArc(fraction, R);
  // Round caps only for a partial arc; a full (100%) or empty (0%) arc uses
  // butt caps so the ends meet seamlessly instead of overlapping at 12 o'clock.
  const linecap = fraction > 0 && fraction < 1 ? "round" : "butt";
  return (
    <View style={{ alignItems: "center", marginRight: 12, marginBottom: 6 }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={STROKE}
          fill="none"
        />
        {arcLen > 0 && (
          <G transform={`rotate(-90 ${CX} ${CY})`}>
            <Circle
              cx={CX}
              cy={CY}
              r={R}
              stroke="#1a73e8"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${arcLen} ${circumference}`}
              strokeLinecap={linecap}
            />
          </G>
        )}
      </Svg>
      <Text style={{ fontSize: 8, marginTop: 2, color: "#333333" }}>
        {label}: {assessed} / {total} (
        {total > 0 ? Math.round(fraction * 100) : 0}%)
      </Text>
    </View>
  );
};

export const CompletenessRings: React.FC<{
  completeness: {
    assessed: number;
    total: number;
    perModule: { module: string; assessed: number; total: number }[];
  };
}> = ({ completeness }) => (
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: 8,
    }}
  >
    <Ring
      label="Overall"
      assessed={completeness.assessed}
      total={completeness.total}
    />
    {completeness.perModule.map((m) => (
      <Ring
        key={m.module}
        label={m.module}
        assessed={m.assessed}
        total={m.total}
      />
    ))}
  </View>
);
