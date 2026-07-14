import ReactPDF, { Document, Page, Text } from "@react-pdf/renderer";
import type React from "react";
import { createElement as h } from "react";

// The first `renderToBuffer` in a fresh Jest process, fired right after
// theme.ts's module-load `Font.register`, can race fontkit's async TTF parse
// and emit a font table that pdf-parse's bundled (2017-era) pdfjs rejects
// ("bad XRef entry"). A single throwaway render warms the font pipeline; every
// render after that is stable. We do it ONCE, lazily, inside the harness so no
// individual test file has to remember a beforeAll. (Not a product concern:
// the browser export path awaits Font.load() and uses a modern PDF renderer.)
let warmed: Promise<unknown> | null = null;
const warmUp = (): Promise<unknown> =>
  (warmed ??= ReactPDF.renderToBuffer(
    h(
      Document,
      null,
      h(Page, null, h(Text, null, ".")),
    ) as unknown as React.ReactElement<ReactPDF.DocumentProps>,
  ));

// Render a @react-pdf document to a real PDF and extract its text layer, so
// tests can assert headings/labels appear intact (catches glyph drops) and
// that rendering does not throw (catches pdfkit invalid-input aborts, e.g. a
// zero-length SVG arc). This is the one place in the test suite that calls
// the real @react-pdf/renderer pipeline end to end rather than mocking it.
const renderOnce = async (doc: React.ReactElement): Promise<string> => {
  const buf = await ReactPDF.renderToBuffer(
    doc as unknown as React.ReactElement<ReactPDF.DocumentProps>,
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    b: Buffer,
  ) => Promise<{ text: string }>;
  const parsed = await pdfParse(buf);
  return parsed.text;
};

// Total attempts after the warm-up render. Under heavy parallelism (many
// jest workers competing for the same CPU cores) the font-parse race can
// still lose on a second attempt often enough to flake a real-render suite,
// so this retries a couple more times before giving up; a genuine render bug
// (not a race) fails identically on every attempt.
const MAX_ATTEMPTS = 3;

export const renderPdfText = async (
  doc: React.ReactElement,
): Promise<string> => {
  await warmUp();
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await renderOnce(doc);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

// Renders straight to a Buffer with no pdf-parse round trip. pdf-parse's
// bundled 2017-era pdfjs is unreliable specifically on a genuinely zero-page
// PDF (an intermittent "bad XRef entry" on a doc with no content at all,
// reproducible even in total isolation — a quirk of that vendored parser, not
// of @react-pdf/renderer or this widget's report code). Use this instead of
// renderPdfText when a test's Document is expected to render with no pages/
// text to extract, so the assertion doesn't depend on parsing content that
// isn't there anyway.
export const renderPdfBuffer = async (
  doc: React.ReactElement,
): Promise<Buffer> => {
  await warmUp();
  return ReactPDF.renderToBuffer(
    doc as unknown as React.ReactElement<ReactPDF.DocumentProps>,
  );
};

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
// rather than only the concatenated text. Uses pdf-parse's pagerender hook
// (its bundled pdfjs exposes getTextContent per page) with the same warm-up
// + retry the plain-text helper uses.
export const renderPdfPageItems = async (
  doc: React.ReactElement,
): Promise<PdfTextItem[][]> => {
  await warmUp();
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const buf = await ReactPDF.renderToBuffer(
        doc as unknown as React.ReactElement<ReactPDF.DocumentProps>,
      );
      const pages: PdfTextItem[][] = [];
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (
        b: Buffer,
        o: { pagerender: (pageData: unknown) => Promise<string> },
      ) => Promise<{ text: string }>;
      await pdfParse(buf, {
        pagerender: async (pageData: unknown) => {
          const page = pageData as {
            getTextContent: () => Promise<{
              items: { str: string; transform: number[] }[];
            }>;
          };
          const tc = await page.getTextContent();
          pages.push(
            tc.items.map((it) => ({
              str: it.str,
              x: it.transform[4],
              y: it.transform[5],
            })),
          );
          return tc.items.map((it) => it.str).join(" ");
        },
      });
      return pages;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};
