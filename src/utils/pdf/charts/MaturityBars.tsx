import { Text, View } from "@react-pdf/renderer";
import React from "react";
import LevelResult from "../../../enums/LevelResult";
import { getColorForLevel } from "../theme";

export const MaturityBars: React.FC<{
  moduleMaturityLevels: { module: string; level: number }[];
}> = ({ moduleMaturityLevels }) => (
  <View style={{ marginTop: 8 }}>
    {moduleMaturityLevels.map(({ module, level }) => (
      <View
        key={module}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
        <Text style={{ width: "28%", fontSize: 9 }}>{module}</Text>
        <View
          style={{
            width: "52%",
            height: 10,
            backgroundColor: "rgba(0,0,0,0.08)",
            borderRadius: 2,
          }}
        >
          <View
            style={{
              width: `${(Math.max(0, level) / 5) * 100}%`,
              height: 10,
              backgroundColor: getColorForLevel(level).background,
              borderRadius: 2,
            }}
          />
        </View>
        <Text
          style={{
            width: "20%",
            fontSize: 9,
            textAlign: "right",
            color: "#333333",
          }}
        >
          {LevelResult[level]}
        </Text>
      </View>
    ))}
  </View>
);
