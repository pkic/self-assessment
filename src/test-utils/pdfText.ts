import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type React from "react";

// Render a @react-pdf document to a real PDF and read back each page's text
// items with pdf.js (pdfjs-dist, legacy build for Node), so tests can assert
// headings/labels appear intact (catches glyph drops) and that rendering does
// not throw (catches pdfkit invalid-input aborts, e.g. a zero-length SVG arc).
// This is the shared helper for real-render tests, which run the actual
// @react-pdf/renderer pipeline end to end rather than mocking it.
const renderPageItems = async (
  doc: React.ReactElement,
): Promise<TextItem[][]> => {
  const buf = await renderToBuffer(
    doc as unknown as React.ReactElement<DocumentProps>,
  );
  // pdf.js rejects a Node Buffer, so it gets a plain Uint8Array copy.
  const loadingTask = getDocument({ data: new Uint8Array(buf), verbosity: 0 });
  try {
    const pdf = await loadingTask.promise;
    const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    return await Promise.all(
      pageNumbers.map(async (n) => {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        page.cleanup();
        // Default options yield text items only (marked content is opt-in).
        return content.items as TextItem[];
      }),
    );
  } finally {
    await loadingTask.destroy();
  }
};

// Runs on the same baseline are joined and a baseline change starts a new
// line. This is the line-joining rule the helper has always used, `!lastY`
// included (it also treats a 0 baseline as unset). pdf.js puts a space between
// runs on one line that have a gap between them.
const pageText = (items: TextItem[]): string => {
  let lastY: number | undefined;
  let text = "";
  for (const item of items) {
    const y = item.transform[5];
    text += !lastY || lastY === y ? item.str : `\n${item.str}`;
    lastY = y;
  }
  return text;
};

// The document's text: each page's text, prefixed with a blank line.
export const renderPdfText = async (
  doc: React.ReactElement,
): Promise<string> => {
  const pages = await renderPageItems(doc);
  return pages.map((items) => `\n\n${pageText(items)}`).join("");
};

// Renders straight to a Buffer with no text extraction, for tests whose
// Document is expected to render with no pages.
export const renderPdfBuffer = (doc: React.ReactElement): Promise<Buffer> =>
  renderToBuffer(doc as unknown as React.ReactElement<DocumentProps>);

// One positioned text run from a rendered page. Coordinates are PDF user
// space: origin at the page's BOTTOM-left, so y decreases toward the page
// bottom (an A4 page is 842pt tall; the fixed footer sits around y≈20-35).
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

// Render a document and return every page's positioned text runs, so a test
// can assert real LAYOUT quality — e.g. that no page is blank/sparse and no
// section heading is stranded near a page bottom with nothing under it —
// rather than only the concatenated text. Reads the same per-page items the
// plain-text helper assembles.
export const renderPdfPageItems = async (
  doc: React.ReactElement,
): Promise<PdfTextItem[][]> => {
  const pages = await renderPageItems(doc);
  return pages.map((items) =>
    items.map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
    })),
  );
};
