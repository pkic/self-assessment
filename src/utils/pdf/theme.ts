import { Font, StyleSheet } from "@react-pdf/renderer";
import type { OverlayOperation } from "../maturityCalculations";
import RobotoRegular from "../../assets/fonts/Roboto-Regular.ttf";
import RobotoBold from "../../assets/fonts/Roboto-Bold.ttf";

// Operation badge styling shared with the on-page report — uses the same
// semantic colours so the PDF Overlay Details page reads identically to
// what users see in the Report tab.
export const overlayBadgeColors: Record<
  OverlayOperation,
  { bg: string; fg: string; border: string }
> = {
  multiplier: { bg: "#e8f0fe", fg: "#1a73e8", border: "#1a73e8" },
  addition: { bg: "#e6f5e9", fg: "#1e6b30", border: "#34a853" },
  override: { bg: "#fff7e6", fg: "#6b3a1e", border: "#f5d28b" },
};

// Uniform vertical gap ReportDocument inserts between consecutive rendered
// body sections (registry.tsx). Skipped for the first rendered section and
// for a fresh-page `break` section — both start flush under the page
// header/top, so adding this on top would just push them down for no
// reason. Section roots must not carry their own top margin, or it would
// double up with this one.
export const SECTION_GAP = 16;

// Default `reserve` for SectionHeading (SectionHeading.tsx) — how many
// points of following content must fit on the same page for a heading not
// to be pushed to the next one, so a heading is never stranded alone at a
// page bottom.
export const HEADING_RESERVE = 60;
// Smaller reserve for a lightweight sub-heading (e.g. "By module", a
// per-module/category label) that has less content riding immediately below
// it than a full section heading does.
export const SUBHEADING_RESERVE = 40;

// Register Roboto font from locally-bundled TTFs (no network fetch, no
// fake-bold synthesis) — a real Bold weight avoids fontkit dropping the
// leading glyph on bold text runs that a fake-bold/cold-cache race caused.
Font.register({
  family: "Roboto",
  fonts: [{ src: RobotoRegular }, { src: RobotoBold, fontWeight: 700 }],
});
Font.registerHyphenationCallback((word) => [word]);

// Resolve a --pkimm-* CSS custom property from the host document, falling back
// to a fixed color when there is no document (e.g. node test / SSR) or the
// token is unset. Keeps this module import-safe outside the browser.
export const cssVar = (name: string, fallback: string): string => {
  if (typeof document === "undefined" || !document.documentElement)
    return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
};

export const primaryColor = cssVar("--pkimm-primary-color", "#1a73e8");
export const secondaryColor = cssVar("--pkimm-secondary-color", "#f5b400");
export const tertiaryColor = cssVar("--pkimm-tertiary-color", "#34a853");

// Define styles for the PDF
export const styles = StyleSheet.create({
  body: {
    fontFamily: "Roboto",
  },
  page: {
    fontFamily: "Roboto",
    flexDirection: "column",
    paddingTop: 80,
    paddingBottom: 50,
    paddingLeft: 40,
    paddingRight: 40,
  },
  logo_first: {
    width: 300,
    height: "auto",
    marginTop: 150,
    alignSelf: "center",
  },
  title_first: {
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 10,
  },
  subtitle_first: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: "auto",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  overview_table: {
    width: "100%",
  },
  overview_tableRow: {
    flexDirection: "row",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#b9b8b8",
  },
  overview_tableCol: {
    width: "auto",
    padding: 5,
  },
  overview_tableCell: {
    fontSize: 10,
  },
  chart: {
    width: 300,
    paddingTop: 20,
    height: "auto",
    margin: "0 auto",
  },
  overallMaturityLevel: {
    textAlign: "center",
    marginBottom: 10,
    padding: 10,
  },
  rectangleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  rectangle: {
    width: 115,
    padding: 10,
    margin: 5,
    textAlign: "center",
    color: "#000000",
  },
  detailsTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  moduleMaturityLevels: {
    fontSize: 16,
    marginBottom: 10,
  },
  table: {
    margin: "0 auto",
  },
  tableRow: {
    flexDirection: "row",
    borderStyle: "solid",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#b9b8b8",
  },
  tableCol: {
    padding: 3,
  },
  tableCell: {
    marginTop: 5,
    fontSize: 8,
    textAlign: "left", // Change this to left align text
  },
  boldText: {
    fontWeight: "bold",
  },
  greyBackground: {
    backgroundColor: "#f0f0f0",
  },
  fixed_logo: {
    top: 10,
    right: 35,
    width: "30%",
    padding: 10,
    position: "absolute",
  },
  fixed_footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    paddingLeft: 40,
    paddingRight: 40,
    color: "grey",
  },
  about_heading: {
    fontSize: 12,
    marginBottom: 10,
  },
  about_text: {
    fontSize: 8,
  },
  maturity_table: {
    width: "100%",
  },
  maturity_tableRow: {
    flexDirection: "row",
    fontSize: 8,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#b9b8b8",
  },
  maturity_tableCol: {
    width: "auto",
    padding: 3,
  },
  maturity_tableCell: {
    fontSize: 8,
  },
});

// Function to determine color based on the level
export const getColorForLevel = (level: number) => {
  switch (level) {
    case 1:
      return {
        background: cssVar("--pkimm-maturity-level-1", "#9c27b0"),
        border: cssVar("--pkimm-maturity-level-1", "#9c27b0"),
        text: "#ffffff",
      };
    case 2:
      return {
        background: cssVar("--pkimm-maturity-level-2", "#ff5722"),
        border: cssVar("--pkimm-maturity-level-2", "#ff5722"),
        text: "#ffffff",
      };
    case 3:
      return {
        background: cssVar("--pkimm-maturity-level-3", "#4caf50"),
        border: cssVar("--pkimm-maturity-level-3", "#4caf50"),
        text: "#000000",
      };
    case 4:
      return {
        background: cssVar("--pkimm-maturity-level-4", "#03a9f4"),
        border: cssVar("--pkimm-maturity-level-4", "#03a9f4"),
        text: "#000000",
      };
    case 5:
      return {
        background: cssVar("--pkimm-maturity-level-5", "#ffc107"),
        border: cssVar("--pkimm-maturity-level-5", "#ffc107"),
        text: "#000000",
      };
    default:
      return {
        background: "rgba(0, 0, 0, 0.1)",
        border: "rgba(0, 0, 0, 1)",
        text: "#ffffff",
      };
  }
};

export const headerColor = cssVar("--pkimm-primary-color", "#1a73e8");
