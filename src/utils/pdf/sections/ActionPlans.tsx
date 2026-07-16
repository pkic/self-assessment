import { Polygon, Svg, Text, View } from "@react-pdf/renderer";
import React from "react";
import { LevelPill } from "../LevelPill";
import { headerColor, styles } from "../theme";
import { SectionHeading } from "../SectionHeading";
import { isLongText } from "../Table";
import type { SectionComponent } from "./SectionContext";

const CARD_BORDER_COLOR = "#b9b8b8";
const MUTED_COLOR = "#5f6368";
const DONE_COLOR = "#1e8e3e";
const TODO_BORDER_COLOR = "#9aa0a6";

// A small right-pointing triangle drawn with an @react-pdf Svg/Polygon —
// never a `→`/`->` text glyph, which the embedded Roboto subset can silently
// mis-map in a PDF text run (see LevelPill.render.test.tsx). White, because
// it sits on the card's headerColor band.
const ProgressionArrow: React.FC = () => (
  <View style={{ marginHorizontal: 4 }}>
    <Svg width={8} height={8}>
      <Polygon points="0,0 8,4 0,8" fill="#ffffff" />
    </Svg>
  </View>
);

// A filled/empty box standing in for a checklist item's done state — never a
// `✓` glyph, for the same glyph-safety reason as the arrow above.
const TaskStatusBox: React.FC<{ done: boolean }> = ({ done }) => (
  <View
    style={{
      width: 10,
      height: 10,
      borderRadius: 2,
      marginRight: 6,
      ...(done
        ? { backgroundColor: DONE_COLOR }
        : { borderWidth: 1, borderColor: TODO_BORDER_COLOR }),
    }}
  />
);

// One consistent field-label style for every card field, matching the bold
// 8pt labels used across the report's tables (no uppercase micro-labels or
// third styling voice inside the card).
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={[styles.about_text, styles.boldText, { marginBottom: 1 }]}>
    {children}
  </Text>
);

const LabelledField: React.FC<{
  label: string;
  value: string;
  width?: string;
}> = ({ label, value, width }) => (
  <View style={width ? { width } : undefined}>
    <FieldLabel>{label}</FieldLabel>
    <Text style={styles.about_text}>{value}</Text>
  </View>
);

// Renders ctx.actionPlanRows (from buildActionPlanRows) as a set of bordered
// plan cards styled in the document's table language: square corners, the
// same border color as the shared Table, and a headerColor band with white
// bold text (matching every table header in the report) carrying the
// category name and the Current->Target LevelPill progression.
//
// The card body is built as a flat list of SMALL flow units (a label line, a
// bullet, a task row, a text paragraph) rather than tall per-field blocks:
// the header band is glued to only the FIRST unit in a wrap={false} group —
// a band alone at a page bottom with its body on the next page reads as an
// orphaned strip — and because every unit is small the glue group is bounded
// no matter how long the user's plan fields are; long paragraphs are their
// own single-column units that break across pages cleanly. No own <Page>/
// Header/Footer — ReportDocument supplies those. Gate on ctx and return null
// synchronously so ReportDocument can filter nulls.
export const ActionPlans: SectionComponent = (ctx) => {
  if (ctx.actionPlanRows.length === 0) return null;

  return (
    <View>
      <SectionHeading>Action Plans</SectionHeading>
      {ctx.actionPlanRows.flatMap((row) => {
        const doneCount = row.tasks.filter((t) => t.done).length;
        // A bare plan (only a target level set) renders the header band
        // alone — an empty padded body under the band reads as a broken
        // strip.
        const units: React.ReactNode[] = [];
        // 6pt of air before each labeled group except the very first unit.
        const groupGap = () => (units.length === 0 ? {} : { marginTop: 6 });

        // A responsibility short enough for the 50/50 row stays beside the
        // target date; a long one becomes its own label + paragraph units so
        // the two-column row never has unbounded height.
        const responsibilityLong = isLongText(row.responsibility);
        if ((row.responsibility && !responsibilityLong) || row.targetDate) {
          units.push(
            <View key="who" style={{ flexDirection: "row" }} wrap={false}>
              {row.responsibility && !responsibilityLong && (
                <LabelledField
                  label="Responsibility"
                  value={row.responsibility}
                  width="50%"
                />
              )}
              {row.targetDate && (
                <LabelledField
                  label="Target date"
                  value={row.targetDate}
                  width="50%"
                />
              )}
            </View>,
          );
        }
        // Every field label rides in the SAME unit as its text (or first list
        // item), so a label can never land at a page bottom with its content
        // relocating to the next page. A merged unit taller than a page still
        // splits with the label leading.
        if (row.responsibility && responsibilityLong) {
          units.push(
            <View key="resp" style={groupGap()}>
              <FieldLabel>Responsibility</FieldLabel>
              <Text style={styles.about_text}>{row.responsibility}</Text>
            </View>,
          );
        }
        const taskLabelStyle = (done: boolean) => [
          styles.about_text,
          done
            ? {
                textDecoration: "line-through" as const,
                color: MUTED_COLOR,
              }
            : {},
        ];
        // A short task label sits beside its status box in an ATOMIC
        // two-column row (a breakable box+text row would split at a page
        // boundary with an empty left column — the same v4.5.1 failure the
        // tables guard against). A long label drops to a single-column
        // layout — box above, full-width text below — which splits cleanly.
        const taskRow = (t: { label: string; done: boolean }, i: number) =>
          isLongText(t.label) ? (
            <View key={`task-${i}`} style={{ marginTop: 3 }}>
              <TaskStatusBox done={t.done} />
              <Text style={[...taskLabelStyle(t.done), { marginTop: 2 }]}>
                {t.label}
              </Text>
            </View>
          ) : (
            <View
              key={`task-${i}`}
              wrap={false}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginTop: 3,
              }}
            >
              <TaskStatusBox done={t.done} />
              <Text
                style={[
                  ...taskLabelStyle(t.done),
                  // Keep the label from running under the status box when
                  // it wraps to multiple lines.
                  { flex: 1 },
                ]}
              >
                {t.label}
              </Text>
            </View>
          );
        const bullet = (text: string, key: string) => (
          <Text key={key} style={styles.about_text}>
            • {text}
          </Text>
        );
        if (row.objectives.length > 0) {
          units.push(
            <View key="obj" style={groupGap()}>
              <FieldLabel>Objectives</FieldLabel>
              {bullet(row.objectives[0], "obj-0")}
            </View>,
          );
          row.objectives.slice(1).forEach((o, i) => {
            units.push(bullet(o, `obj-${i + 1}`));
          });
        }
        if (row.tasks.length > 0) {
          units.push(
            <View key="tasks" style={groupGap()}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <FieldLabel>Tasks</FieldLabel>
                <Text style={[styles.about_text, { color: MUTED_COLOR }]}>
                  {doneCount} of {row.tasks.length} done
                </Text>
              </View>
              {taskRow(row.tasks[0], 0)}
            </View>,
          );
          row.tasks.slice(1).forEach((t, i) => {
            units.push(taskRow(t, i + 1));
          });
        }
        if (row.outputs.length > 0) {
          units.push(
            <View key="out" style={groupGap()}>
              <FieldLabel>Outputs</FieldLabel>
              {bullet(row.outputs[0], "out-0")}
            </View>,
          );
          row.outputs.slice(1).forEach((o, i) => {
            units.push(bullet(o, `out-${i + 1}`));
          });
        }
        if (row.resources) {
          units.push(
            <View key="res" style={groupGap()}>
              <FieldLabel>Resources</FieldLabel>
              <Text style={styles.about_text}>{row.resources}</Text>
            </View>,
          );
        }
        if (row.comments) {
          units.push(
            <View key="com" style={groupGap()}>
              <FieldLabel>Comments</FieldLabel>
              <Text style={styles.about_text}>{row.comments}</Text>
            </View>,
          );
        }

        // The card is a flat run of SIBLING bordered pieces emitted directly
        // into the section root — never one card-level container: like the
        // Table's row-owned borders, each piece draws its own left/right edge
        // (the band the top, the last piece the bottom), so the run flows and
        // splits across pages exactly like table rows. Wrapping a card in a
        // single View is a trap in @react-pdf v4.5.1: a wrap subtree that
        // fits within one page RELOCATES wholesale instead of splitting (only
        // taller-than-page content splits), so a near-page-height card would
        // jump to the next page and strand the section heading on a
        // near-blank page.
        const sideBorders = {
          borderStyle: "solid",
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: CARD_BORDER_COLOR,
        } as const;

        const headerBand = (
          <View
            style={[
              sideBorders,
              {
                borderTopWidth: 1,
                ...(units.length === 0 ? { borderBottomWidth: 1 } : {}),
                backgroundColor: headerColor,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 6,
              },
            ]}
          >
            <Text
              style={[
                styles.about_text,
                styles.boldText,
                { fontSize: 9, color: "#ffffff" },
              ]}
            >
              {row.module} — {row.categoryName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <LevelPill level={row.currentLevel} variant="full" />
              <ProgressionArrow />
              <LevelPill level={row.targetLevel} variant="full" />
            </View>
          </View>
        );

        if (units.length === 0) {
          return [
            <View
              key={row.categoryKey}
              wrap={false}
              style={{ marginBottom: 12 }}
            >
              {headerBand}
            </View>,
          ];
        }

        return [
          <View key={row.categoryKey} wrap={false}>
            {headerBand}
            <View
              style={[
                sideBorders,
                {
                  paddingHorizontal: 8,
                  paddingTop: 8,
                  ...(units.length === 1
                    ? {
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        marginBottom: 12,
                      }
                    : {}),
                },
              ]}
            >
              {units[0]}
            </View>
          </View>,
          ...units.slice(1).map((unit, i) => {
            const isLast = i === units.length - 2;
            return (
              <View
                key={`${row.categoryKey}-u-${i}`}
                style={[
                  sideBorders,
                  { paddingHorizontal: 8 },
                  isLast
                    ? {
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        marginBottom: 12,
                      }
                    : {},
                ]}
              >
                {unit}
              </View>
            );
          }),
        ];
      })}
    </View>
  );
};
