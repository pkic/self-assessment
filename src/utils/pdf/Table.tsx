import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { headerColor, styles } from "./theme";

export interface TableColumn {
  width: string;
  label?: string;
}

const BORDER_COLOR = "#b9b8b8";

// Borders live on the ROWS, never on an outer container. A container border
// leaves an empty bordered sliver behind when the table breaks across pages
// exactly at a row boundary (the "table overflowed with only a border"
// artifact); with row-owned borders every page fragment is a stack of
// fully-bordered rows and nothing else can render. Each row draws its own
// left/right/bottom edge; the table's first row (the header when shown)
// additionally draws the top edge, so an unbroken table looks identical to
// the old container-border rendering — single 1px lines everywhere.
const rowBorders = {
  borderStyle: "solid",
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderColor: BORDER_COLOR,
} as const;

// Injected by Table onto its first row when no header is shown — never set
// by callers directly.
interface InjectedRowProps {
  isFirst?: boolean;
}

// The length above which user-entered free text must NOT render inside a
// narrow table column. A multi-column row is always atomic (see TableRow) —
// so a cell holding unbounded text would make the whole row unbounded, and an
// atomic row taller than a page overflows instead of moving. Callers compare
// their user-text fields against this and, when long, emit a compact atomic
// meta row followed by a TableTextRow carrying the full text.
export const LONG_TEXT_CHARS = 280;

export const isLongText = (...parts: (string | undefined)[]): boolean =>
  parts.some((p) => (p?.length ?? 0) > LONG_TEXT_CHARS);

// Multi-column rows are ALWAYS atomic (no wrap prop): when @react-pdf v4.5.1
// splits a flex-row across a page boundary, the continuation fragment renders
// its left cells empty and can slice pill Views mid-row — the "wrong values
// and columns" artifact. A row that doesn't fit the remaining space moves to
// the next page whole. Unbounded user text therefore never belongs in a cell
// — pair the row with a TableTextRow instead (see LONG_TEXT_CHARS above).
export const TableRow: React.FC<
  {
    children: React.ReactNode;
    zebra?: boolean;
  } & InjectedRowProps
> = ({ children, zebra = false, isFirst = false }) => (
  <View
    style={[
      { flexDirection: "row" },
      rowBorders,
      isFirst ? { borderTopWidth: 1 } : {},
      zebra ? styles.greyBackground : {},
    ]}
    wrap={false}
  >
    {children}
  </View>
);

// The one breakable table row: a single full-width text cell, used for
// unbounded user text (long notes/evidence/reasons/values) directly under its
// atomic meta row. Because it has exactly one column, a page-boundary split
// cannot misalign anything — the text simply flows on, with the row's
// left/right borders continuing on the next page. `label` renders as a bold
// inline lead ("Notes: …"). Emit it as an array sibling of its meta row
// (never inside a Fragment — Table inspects its direct children).
export const TableTextRow: React.FC<
  {
    children: string;
    label?: string;
    zebra?: boolean;
  } & InjectedRowProps
> = ({ children, label, zebra = false, isFirst = false }) => (
  <View
    style={[
      rowBorders,
      isFirst ? { borderTopWidth: 1 } : {},
      zebra ? styles.greyBackground : {},
      { paddingHorizontal: 6, paddingVertical: 3 },
    ]}
  >
    <Text style={styles.tableCell}>
      {label ? <Text style={styles.boldText}>{label}: </Text> : null}
      {children}
    </Text>
  </View>
);

export const TableCell: React.FC<{
  width: string;
  children: React.ReactNode;
  bold?: boolean;
  header?: boolean;
  plain?: boolean;
}> = ({ width, children, bold = false, header = false, plain = false }) =>
  plain ? (
    <View style={[styles.tableCol, { width }]}>{children}</View>
  ) : (
    <View style={[styles.tableCol, { width }]}>
      <Text
        style={[
          styles.tableCell,
          bold || header ? styles.boldText : {},
          header ? { color: "#ffffff" } : {},
        ]}
      >
        {children}
      </Text>
    </View>
  );

export const Table: React.FC<{
  columns: TableColumn[];
  children: React.ReactNode;
  header?: boolean;
  // Optional lead-in content (a category/sub-section heading) glued into the
  // same atomic group as the header and first row, so a heading can never
  // strand at a page bottom with its table on the next page.
  leadIn?: React.ReactNode;
}> = ({ columns, children, header = false, leadIn }) => {
  const rows = React.Children.toArray(children);
  const showHeader = header && columns.some((c) => c.label);

  const headerRow = showHeader ? (
    <View
      style={[
        { flexDirection: "row", backgroundColor: headerColor },
        rowBorders,
        { borderTopWidth: 1 },
      ]}
      wrap={false}
    >
      {columns.map((c, idx) => (
        <TableCell key={idx} width={c.width} header>
          {c.label}
        </TableCell>
      ))}
    </View>
  ) : null;

  // Without a header, the first row draws the table's top edge itself.
  const body = rows.map((row, idx) => {
    if (!React.isValidElement(row)) return row;
    if (idx === 0 && !showHeader) {
      return React.cloneElement(row as React.ReactElement<InjectedRowProps>, {
        isFirst: true,
      });
    }
    return row;
  });

  // Keep the lead-in + header glued to the first row when that row is atomic,
  // so neither can strand alone at a page bottom. A TableTextRow first row is
  // excluded: its height is unbounded, and a wrap={false} group taller than
  // the page overflows instead of moving to the next one. (By convention a
  // TableTextRow never leads a table — it always follows its meta row.)
  const firstRowAtomic =
    body.length > 0 &&
    React.isValidElement(body[0]) &&
    body[0].type !== TableTextRow;

  if ((headerRow || leadIn) && firstRowAtomic) {
    return (
      <View>
        <View wrap={false}>
          {leadIn}
          {headerRow}
          {body[0]}
        </View>
        {body.slice(1)}
      </View>
    );
  }

  return (
    <View>
      {leadIn}
      {headerRow}
      {body}
    </View>
  );
};
