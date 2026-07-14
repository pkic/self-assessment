import { Text, View } from "@react-pdf/renderer";
import React from "react";
import LevelResult from "../../enums/LevelResult";
import { getColorForLevel } from "./theme";

export const LevelPill: React.FC<{
  level: number;
  variant?: "full" | "number";
}> = ({ level, variant = "full" }) => {
  const neutral = level <= 0; // 0 = Not Assessed, -1 = Not Applicable
  const c = getColorForLevel(level);
  const bg = neutral ? "#eceff1" : c.background;
  const fg = neutral ? "#5f6368" : c.text;
  // LevelResult[n] is already "N - Name" (e.g. "2 - Foundational"); 0/-1 are word-only.
  const label =
    variant === "number" && level > 0 ? String(level) : LevelResult[level];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: 8,
        paddingVertical: 2,
        paddingHorizontal: 6,
      }}
    >
      <Text style={{ fontSize: 8, fontWeight: "bold", color: fg }}>
        {label}
      </Text>
    </View>
  );
};
