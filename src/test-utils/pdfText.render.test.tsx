import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { renderPdfPageItems, renderPdfText } from "./pdfText";

describe("pdfText helper", () => {
  it("breaks lines on a baseline change and prefixes each page with a blank line", async () => {
    const text = await renderPdfText(
      <Document>
        <Page>
          <Text>Alpha</Text>
          <Text>Beta</Text>
        </Page>
        <Page>
          <Text>Gamma</Text>
        </Page>
      </Document>,
    );
    expect(text).toBe("\n\nAlpha\nBeta\n\nGamma");
  });

  it("returns each page's positioned text runs, with the origin at the bottom-left", async () => {
    const pages = await renderPdfPageItems(
      <Document>
        <Page>
          <Text>Alpha</Text>
          <Text>Beta</Text>
        </Page>
        <Page>
          <Text>Gamma</Text>
        </Page>
      </Document>,
    );
    expect(pages.map((p) => p.map((i) => i.str))).toEqual([
      ["Alpha", "Beta"],
      ["Gamma"],
    ]);
    expect(pages[0][0].y).toBeGreaterThan(pages[0][1].y); // Alpha sits above Beta
  });

  it("joins runs that share a baseline", async () => {
    const doc = (
      <Document>
        <Page>
          <Text>
            Al<Text style={{ fontWeight: "bold" }}>pha</Text>
          </Text>
        </Page>
      </Document>
    );
    // The font change keeps these as two runs on one baseline.
    const [items] = await renderPdfPageItems(doc);
    expect(items.map((i) => i.str)).toEqual(["Al", "pha"]);
    expect(items[0].y).toBe(items[1].y);
    expect(await renderPdfText(doc)).toBe("\n\nAlpha");
  });

  it("separates runs on one baseline that have a gap between them with a space", async () => {
    const doc = (
      <Document>
        <Page>
          <View style={{ flexDirection: "row" }}>
            <Text>Field</Text>
            <Text style={{ marginLeft: 20 }}>Value</Text>
          </View>
        </Page>
      </Document>
    );
    // Without the gap pdf.js merges the two runs into one item; with it they
    // stay separate and pdf.js reports the gap as a whitespace-only item.
    const [items] = await renderPdfPageItems(doc);
    const runs = items.filter((i) => i.str.trim() !== "");
    expect(runs.map((i) => i.str)).toEqual(["Field", "Value"]);
    expect(runs[0].y).toBe(runs[1].y);
    expect(await renderPdfText(doc)).toContain("Field Value");
  });
});
