import { Text, View } from "@react-pdf/renderer";
import React from "react";
import type {
  CategoryOverlayDetails,
  OverlayOperation,
} from "../../assessment-engine/methodologies/weightedMaturity";
import { overlayBadgeColors } from "./theme";

const overlayBadgeLabel = (op: OverlayOperation, value: number): string => {
  if (op === "override") return `= ${value}`;
  if (op === "multiplier") return `× ${value}`;
  return value >= 0 ? `+ ${value}` : `${value}`;
};

const formatOverlayWeight = (n: number): string =>
  Number.isInteger(n) ? n.toString() : n.toFixed(2);

export const OverlayBadge: React.FC<{
  operation: OverlayOperation;
  value: number;
}> = ({ operation, value }) => {
  const colors = overlayBadgeColors[operation];
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: 5,
        paddingVertical: 1,
        minWidth: 32,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 7, color: colors.fg, fontWeight: 600 }}>
        {overlayBadgeLabel(operation, value)}
      </Text>
    </View>
  );
};

export const OverlayWeights: React.FC<{ base: number; effective: number }> = ({
  base,
  effective,
}) => (
  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
    <Text
      style={{ fontSize: 8, color: "#888", textDecoration: "line-through" }}
    >
      {formatOverlayWeight(base)}
    </Text>
    {/* ASCII arrow: the Roboto subset we register doesn't include U+2192,
        so use plain hyphen+gt which the font has. */}
    <Text style={{ fontSize: 8, color: "#888" }}>{"->"}</Text>
    <Text style={{ fontSize: 8, color: "#222", fontWeight: 600 }}>
      {formatOverlayWeight(effective)}
    </Text>
  </View>
);

// Single-line overlay layout: label | weights | badge, columns aligned via
// fixed widths on the right two so all rows in the cell stack neatly.
export const OverlayCell: React.FC<{ details: CategoryOverlayDetails }> = ({
  details,
}) => (
  <View>
    {details.category && (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 1,
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#dadce0",
            borderRadius: 3,
            paddingHorizontal: 4,
            paddingVertical: 1,
            backgroundColor: "#f8f9fa",
            flex: 1,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontSize: 6, color: "#666", fontWeight: 700 }}>
            CATEGORY
          </Text>
        </View>
        <View style={{ width: 55 }}>
          <OverlayWeights
            base={details.category.base}
            effective={details.category.effective}
          />
        </View>
        <OverlayBadge
          operation={details.category.operation}
          value={details.category.value}
        />
      </View>
    )}
    {details.requirements.map((req) => (
      <View
        key={req.id}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 1,
        }}
      >
        <Text style={{ flex: 1, fontSize: 7, color: "#222" }}>
          {req.description}
        </Text>
        <View style={{ width: 55 }}>
          <OverlayWeights base={req.base} effective={req.effective} />
        </View>
        <OverlayBadge operation={req.operation} value={req.value} />
      </View>
    ))}
  </View>
);
