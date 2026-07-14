import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { styles, SUBHEADING_RESERVE } from "../theme";
import { Table, TableRow, TableCell, TableColumn } from "../Table";
import { LevelPill } from "../LevelPill";
import { SectionHeading } from "../SectionHeading";
import {
  DeltaIndicator,
  DeltaTriangle,
  UP_COLOR,
  DOWN_COLOR,
} from "../DeltaIndicator";
import type { SectionComponent } from "./SectionContext";

const MUTED_COLOR = "#5f6368";
const BANNER_BG = "#e8f0fe";
const BANNER_BORDER = "#c6dafc";

const MODULE_DELTA_COLUMNS: TableColumn[] = [
  { width: "40%", label: "Module" },
  { width: "30%", label: "Baseline / Current" },
  { width: "30%", label: "Change" },
];

const CATEGORY_DELTA_COLUMNS: TableColumn[] = [
  { width: "40%", label: "Category" },
  { width: "30%", label: "Baseline / Current" },
  { width: "30%", label: "Change" },
];

const RECONCILIATION_COLUMNS: TableColumn[] = [
  { width: "40%", label: "Category" },
  { width: "20%", label: "Target" },
  { width: "20%", label: "Achieved" },
  { width: "20%", label: "Status" },
];

// A baseline level pill, a plain "/" separator (never a `→` glyph — the
// embedded Roboto subset can silently mis-map arrows in a text run), and the
// current level pill — shared by the hero row (full labels, it has the room)
// and every delta table's Baseline / Current column (compact numbers; the
// pill colors and the Change column carry the meaning in the tight cell).
const LevelPair: React.FC<{
  baseline: number;
  current: number;
  variant?: "full" | "number";
}> = ({ baseline, current, variant = "number" }) => (
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <LevelPill level={baseline} variant={variant} />
    <Text style={{ fontSize: 8, color: MUTED_COLOR, marginHorizontal: 3 }}>
      /
    </Text>
    <LevelPill level={current} variant={variant} />
  </View>
);

const LegendItem: React.FC<{
  direction?: "up" | "down";
  label: string;
  color: string;
}> = ({ direction, label, color }) => (
  <View style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}>
    {direction && <DeltaTriangle direction={direction} color={color} />}
    <Text style={{ fontSize: 8, color }}>{label}</Text>
  </View>
);

// Comparison to a prior baseline assessment, for the Detailed tier only —
// renders only when a baseline was actually selected on the Evaluation tab
// (ctx.comparison), a transient, view-layer-only concept (comparison.ts)
// that never touches scoring/schema/storage. Renders a baseline-identity
// banner (WHICH baseline this is being compared against — without it the
// comparison is meaningless), an overall hero with a legend, then module/
// category delta tables and the action-plan reconciliation table — via the
// shared Table primitive, with every change rendered as a colored SVG
// triangle (DeltaIndicator), never a `▲`/`▼`/`→` text glyph.
// Gated on ctx directly.
export const ComparisonToBaseline: SectionComponent = (ctx) => {
  const { comparison } = ctx;
  if (!comparison) return null;

  return (
    <View>
      <SectionHeading>Comparison to Baseline</SectionHeading>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          backgroundColor: BANNER_BG,
          borderWidth: 1,
          borderColor: BANNER_BORDER,
          borderRadius: 4,
          padding: 8,
          marginTop: 8,
        }}
      >
        <Text style={styles.about_text}>
          Comparing against baseline:{" "}
          {ctx.comparisonBaselineName ?? "(unnamed)"}
          {ctx.comparisonBaselineDate
            ? ` · assessed ${ctx.comparisonBaselineDate}`
            : ""}
          {" · overall was "}
        </Text>
        <LevelPill level={comparison.overall.baseline} variant="full" />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          marginBottom: 4,
        }}
      >
        <LevelPair
          baseline={comparison.overall.baseline}
          current={comparison.overall.current}
          variant="full"
        />
        <View style={{ marginLeft: 12 }}>
          <DeltaIndicator d={comparison.overall} />
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 4 }}>
        <LegendItem direction="up" label="Improved" color={UP_COLOR} />
        <LegendItem direction="down" label="Declined" color={DOWN_COLOR} />
        <LegendItem label="— no change" color={MUTED_COLOR} />
      </View>

      {comparison.modules.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <SectionHeading
            style={[styles.about_text, styles.boldText]}
            reserve={SUBHEADING_RESERVE}
          >
            By module
          </SectionHeading>
          <Table header columns={MODULE_DELTA_COLUMNS}>
            {comparison.modules.map((m) => (
              <TableRow key={m.moduleId}>
                <TableCell width={MODULE_DELTA_COLUMNS[0].width}>
                  {m.module}
                </TableCell>
                <TableCell width={MODULE_DELTA_COLUMNS[1].width} plain>
                  <LevelPair baseline={m.d.baseline} current={m.d.current} />
                </TableCell>
                <TableCell width={MODULE_DELTA_COLUMNS[2].width} plain>
                  <DeltaIndicator d={m.d} />
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </View>
      )}

      {comparison.categories.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <SectionHeading
            style={[styles.about_text, styles.boldText]}
            reserve={SUBHEADING_RESERVE}
          >
            By category
          </SectionHeading>
          <Table header columns={CATEGORY_DELTA_COLUMNS}>
            {comparison.categories.map((c) => (
              <TableRow key={c.key}>
                <TableCell width={CATEGORY_DELTA_COLUMNS[0].width}>
                  {c.categoryName}
                </TableCell>
                <TableCell width={CATEGORY_DELTA_COLUMNS[1].width} plain>
                  <LevelPair baseline={c.d.baseline} current={c.d.current} />
                </TableCell>
                <TableCell width={CATEGORY_DELTA_COLUMNS[2].width} plain>
                  <DeltaIndicator d={c.d} />
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </View>
      )}

      {ctx.reconciliationRows.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <SectionHeading
            style={[styles.about_text, styles.boldText]}
            reserve={SUBHEADING_RESERVE}
          >
            Action plan reconciliation
          </SectionHeading>
          <Table header columns={RECONCILIATION_COLUMNS}>
            {ctx.reconciliationRows.map((r) => (
              <TableRow key={r.key}>
                <TableCell width={RECONCILIATION_COLUMNS[0].width}>
                  {r.categoryName}
                </TableCell>
                <TableCell width={RECONCILIATION_COLUMNS[1].width} plain>
                  <LevelPill level={r.targetLevel} variant="number" />
                </TableCell>
                <TableCell width={RECONCILIATION_COLUMNS[2].width} plain>
                  <LevelPill level={r.achieved} variant="number" />
                </TableCell>
                <TableCell width={RECONCILIATION_COLUMNS[3].width}>
                  {r.status}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </View>
      )}
    </View>
  );
};
