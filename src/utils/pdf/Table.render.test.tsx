import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import {
  Table,
  TableRow,
  TableTextRow,
  TableCell,
  isLongText,
  LONG_TEXT_CHARS,
} from "./Table";
import { renderPdfText } from "../../test-utils/pdfText";

// renderPdfText warms the font pipeline once internally, so no per-file
// warm-up is needed here.
const wrap = (children: React.ReactNode) =>
  renderPdfText(
    <Document>
      <Page>{children}</Page>
    </Document>,
  );

describe("Table primitive", () => {
  it("renders header + all rows incl. the last with intact text", async () => {
    const txt = await wrap(
      <Table
        header
        columns={[
          { width: "50%", label: "Field" },
          { width: "50%", label: "Value" },
        ]}
      >
        <TableRow>
          <TableCell width="50%">Alpha</TableCell>
          <TableCell width="50%">1</TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="50%">Omega</TableCell>
          <TableCell width="50%">9</TableCell>
        </TableRow>
      </Table>,
    );
    expect(txt).toContain("Field");
    expect(txt).toContain("Alpha");
    expect(txt).toContain("Omega"); // last row present
  });

  it("renders a meta row + full-width TableTextRow pair for long text", async () => {
    const long = "Lorem ipsum dolor sit amet. ".repeat(120);
    const txt = await wrap(
      <Table columns={[{ width: "30%" }, { width: "70%" }]}>
        <TableRow>
          <TableCell width="100%" bold>
            Big
          </TableCell>
        </TableRow>
        <TableTextRow label="Value">{long}</TableTextRow>
      </Table>,
    );
    expect(txt).toContain("Big");
    expect(txt).toContain("Value");
    expect(txt.length).toBeGreaterThan(1000);
  });

  it("glues a leadIn heading into the header group", async () => {
    const txt = await wrap(
      <Table
        header
        columns={[{ width: "60%", label: "Item" }, { width: "40%" }]}
        leadIn={<Text>Category heading</Text>}
      >
        <TableRow>
          <TableCell width="60%">Row one</TableCell>
          <TableCell width="40%">x</TableCell>
        </TableRow>
      </Table>,
    );
    expect(txt).toContain("Category heading");
    expect(txt).toContain("Row one");
  });

  it("isLongText trips only past LONG_TEXT_CHARS", () => {
    expect(isLongText("short")).toBe(false);
    expect(isLongText(undefined, "")).toBe(false);
    expect(isLongText("x".repeat(LONG_TEXT_CHARS))).toBe(false);
    expect(isLongText("x".repeat(LONG_TEXT_CHARS + 1))).toBe(true);
    expect(isLongText("short", "x".repeat(LONG_TEXT_CHARS + 1))).toBe(true);
  });
});
