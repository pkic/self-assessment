import { Document, Image, Link, Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import { ExtensionData, ReferenceEntry } from "../../types/types";
import type { DetailRow, OverlayRow, RelevanceRow } from "../reportData";
import {
  Header,
  Footer,
  CoverPage,
  TableHeaderRow,
  DetailsTableHeader,
  TableBodyRow,
  SummaryRow,
} from "./primitives";
import { OverlayCell } from "./overlays";
import { ReferencesAppendixPage } from "./ReferencesAppendixPage";
import { AboutPageBody } from "./AboutPage";
import { LevelPill } from "./LevelPill";
import { Table, TableRow, TableTextRow, TableCell } from "./Table";
import { styles, primaryColor } from "./theme";

interface ExtensionPdfDocumentProps {
  chartImgData: string;
  qrImgData: string | null;
  overallMaturityLevel: number;
  overallWeightedMaturity: number;
  floorScore: number | null;
  weightedScore: number;
  moduleWeightedMaturityLevels: { module: string; level: number }[];
  detailRows: DetailRow[];
  overlayRows: OverlayRow[];
  relevanceRows: RelevanceRow[];
  extension: ExtensionData;
  references: ReferenceEntry[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  assessmentUrl: string;
  version: string;
}

export const ExtensionPdfDocument: React.FC<ExtensionPdfDocumentProps> = ({
  chartImgData,
  qrImgData,
  overallMaturityLevel,
  overallWeightedMaturity,
  floorScore,
  weightedScore,
  moduleWeightedMaturityLevels,
  detailRows,
  overlayRows,
  relevanceRows,
  extension,
  references,
  assessmentName,
  assessorName,
  useCaseDescription,
  assessmentUrl,
  version,
}) => (
  <Document>
    {/* First page: Cover */}
    <CoverPage
      version={version}
      reportTitle={`${extension.extension.name} Report`}
      qrImgData={qrImgData}
    />

    {/* Second page: Summary */}
    <Page size="A4" style={styles.page} bookmark={{ title: "Summary" }}>
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <Text style={styles.title}>Summary</Text>

      {/* Core Summary Table */}
      <View style={styles.overview_table}>
        <SummaryRow
          label="Model Version:"
          value="1.0"
          labelWidth="30%"
          valueWidth="70%"
        />
        <View
          style={[
            styles.overview_tableRow,
            { borderBottomWidth: 0, fontWeight: "bold" },
          ]}
        >
          <View style={[styles.overview_tableCol, { width: "30%" }]}>
            <Text style={styles.overview_tableCell}>PKI Maturity Level:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "70%" }]}>
            <LevelPill level={overallMaturityLevel} variant="full" />
          </View>
        </View>
        <SummaryRow
          label="Assessment Name:"
          value={assessmentName}
          labelWidth="30%"
          valueWidth="70%"
        />
        <SummaryRow
          label="Assessor Name:"
          value={assessorName}
          labelWidth="30%"
          valueWidth="70%"
        />
        <SummaryRow
          label="Use Case Description:"
          value={useCaseDescription}
          labelWidth="30%"
          valueWidth="70%"
        />
        <View style={styles.overview_tableRow}>
          <View style={[styles.overview_tableCol, { width: "30%" }]}>
            <Text style={styles.overview_tableCell}>Assessment Link:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "70%" }]}>
            <Text style={styles.overview_tableCell}>
              <Link
                src={assessmentUrl}
                style={{ color: primaryColor, textDecoration: "underline" }}
              >
                Go To Assessment
              </Link>
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.heading, { marginTop: 20, textAlign: "left" }]}>
        Extension Information
      </Text>
      <View style={styles.overview_table}>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "30%" }]}>
            <Text style={styles.overview_tableCell}>Extension:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "70%" }]}>
            <Text style={styles.overview_tableCell}>
              {extension.extension.name}
            </Text>
          </View>
        </View>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "30%" }]}>
            <Text style={styles.overview_tableCell}>Version:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "70%" }]}>
            <Text style={styles.overview_tableCell}>
              {extension.extension.version}
            </Text>
          </View>
        </View>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "30%" }]}>
            <Text style={styles.overview_tableCell}>Description:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "70%" }]}>
            <Text style={styles.overview_tableCell}>
              {extension.extension.description}
            </Text>
          </View>
        </View>
        <View style={styles.overview_tableRow}>
          <View style={[styles.overview_tableCol, { width: "30%" }]}>
            <Text style={styles.overview_tableCell}>
              Achieved PKI Maturity (Blended):
            </Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "70%" }]}>
            <LevelPill level={overallWeightedMaturity} variant="full" />
          </View>
        </View>
      </View>

      <Image style={[styles.chart, { width: 250 }]} src={chartImgData} />
    </Page>

    {/* Third page: Detailed Metrics and Results */}
    <Page
      size="A4"
      style={styles.page}
      bookmark={{ title: "Assessment Details" }}
    >
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />

      <Text style={styles.heading}>Maturity Results</Text>

      <View style={styles.maturity_table}>
        <View
          style={[
            styles.maturity_tableRow,
            styles.greyBackground,
            { borderBottomWidth: 0, fontWeight: "bold" },
          ]}
        >
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <Text style={styles.maturity_tableCell}>Metric</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <Text style={styles.maturity_tableCell}>Maturity Level</Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <Text style={styles.maturity_tableCell}>
              Overall Maturity Level
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <LevelPill level={overallWeightedMaturity} variant="full" />
          </View>
        </View>
        {floorScore !== null && (
          <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.maturity_tableCol, { width: "50%" }]}>
              <Text style={styles.maturity_tableCell}>Floor Score</Text>
            </View>
            <View style={[styles.maturity_tableCol, { width: "50%" }]}>
              <LevelPill level={floorScore} variant="full" />
            </View>
          </View>
        )}
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 1 }]}>
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <Text style={styles.maturity_tableCell}>
              Extension Weighted Level
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <LevelPill level={weightedScore} variant="full" />
          </View>
        </View>
      </View>

      {/*<Text style={[styles.heading, { marginTop: 20 }]}>Module Maturity Levels</Text>*/}
      <View style={styles.maturity_table}>
        <View
          style={[
            styles.maturity_tableRow,
            styles.greyBackground,
            { borderBottomWidth: 0, fontWeight: "bold" },
          ]}
        >
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <Text style={styles.maturity_tableCell}>Module</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "50%" }]}>
            <Text style={styles.maturity_tableCell}>Maturity Level</Text>
          </View>
        </View>
        {moduleWeightedMaturityLevels.map(({ module, level }, idx) => (
          <View
            key={module}
            style={[
              styles.maturity_tableRow,
              {
                borderBottomWidth:
                  idx === moduleWeightedMaturityLevels.length - 1 ? 1 : 0,
              },
            ]}
          >
            <View style={[styles.maturity_tableCol, { width: "50%" }]}>
              <Text style={styles.maturity_tableCell}>{module}</Text>
            </View>
            <View style={[styles.maturity_tableCol, { width: "50%" }]}>
              <LevelPill level={level} variant="full" />
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.heading, { marginTop: 20 }]}>Details</Text>
      <View style={styles.table}>
        <DetailsTableHeader />
        {detailRows.map((r, idx) => {
          return (
            <TableBodyRow key={r.key} idx={idx}>
              <View style={[styles.tableCol, { width: "13%" }]}>
                <Text style={styles.tableCell}>{r.module}</Text>
              </View>
              <View style={[styles.tableCol, { width: "27%" }]}>
                <Text style={styles.tableCell}>{r.category}</Text>
              </View>
              <View style={[styles.tableCol, { width: "22%" }]}>
                <LevelPill level={r.blendedLevelNum} variant="full" />
              </View>
              <View style={[styles.tableCol, { width: "38%" }]}>
                <Text style={[styles.tableCell, { fontSize: 7 }]}>
                  {r.description || "N/A"}
                </Text>
              </View>
            </TableBodyRow>
          );
        })}
      </View>
    </Page>

    {/* Overlay Details Page */}
    {overlayRows.length > 0 && (
      <Page
        size="A4"
        style={styles.page}
        bookmark={{ title: "Overlay Details" }}
      >
        <Header />
        <Footer assessmentUrl={assessmentUrl} version={version} />
        <Text style={styles.title}>Overlay Details</Text>
        <View style={styles.table}>
          <TableHeaderRow
            columns={[
              { width: "17%", label: "Module" },
              { width: "28%", label: "Category" },
              { width: "55%", label: "Overlays Applied" },
            ]}
          />
          {overlayRows.map((row, idx) => (
            <TableBodyRow key={row.key} idx={idx}>
              <View style={[styles.tableCol, { width: "17%" }]}>
                <Text style={styles.tableCell}>{row.module}</Text>
              </View>
              <View style={[styles.tableCol, { width: "28%" }]}>
                <Text style={styles.tableCell}>{row.category}</Text>
              </View>
              <View style={[styles.tableCol, { width: "55%" }]}>
                <OverlayCell details={row.details} />
              </View>
            </TableBodyRow>
          ))}
        </View>
      </Page>
    )}

    {/* Relevance Summary and Details Pages */}
    {relevanceRows.length > 0 && (
      <Page
        size="A4"
        style={styles.page}
        bookmark={{ title: "Extension Relevance Details" }}
      >
        <Header />
        <Footer assessmentUrl={assessmentUrl} version={version} />
        <Text style={styles.title}>Relevance Details</Text>
        <Table
          header
          columns={[
            { width: "22%", label: "Module" },
            { width: "33%", label: "Category" },
            { width: "15%", label: "Weight" },
            { width: "30%", label: "Relevance Level" },
          ]}
        >
          {relevanceRows.flatMap((r) => {
            const meta = (
              <TableRow key={r.key}>
                <TableCell width="22%">{r.module}</TableCell>
                <TableCell width="33%">{r.category}</TableCell>
                <TableCell width="15%">{String(r.weight)}</TableCell>
                <TableCell plain width="30%">
                  <LevelPill level={r.colorKey} variant="full" />
                </TableCell>
              </TableRow>
            );
            const extras: React.ReactNode[] = [];
            if (r.notes)
              extras.push(
                <TableTextRow key={`${r.key}-notes`} label="Notes">
                  {r.notes}
                </TableTextRow>,
              );
            if (r.evidence)
              extras.push(
                <TableTextRow key={`${r.key}-evidence`} label="Evidence">
                  {r.evidence}
                </TableTextRow>,
              );
            return [meta, ...extras];
          })}
        </Table>
      </Page>
    )}

    <ReferencesAppendixPage
      references={references}
      assessmentUrl={assessmentUrl}
      version={version}
    />

    {/* Final Page: the canonical About content, plus the extension-framework
        block in its dedicated slot (preserved, not dropped) */}
    <Page
      size="A4"
      style={styles.page}
      bookmark={{ title: "About PKI Maturity Model" }}
    >
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <AboutPageBody
        extensionSection={
          <>
            <Text style={[styles.about_heading, { marginTop: 20 }]}>
              About PKI MM Extension Framework
            </Text>
            <Text style={styles.about_text}>
              The PKI MM Extension Framework allows to build specific contexts
              on top of the PKI Maturity Model and use it for specialized
              assessments. Extensions can introduce new guidance, probes, and
              maturity definitions for existing categories, as well as weight
              overlays (multipliers, additions, overrides) to calculate
              context-aware maturity scores.
            </Text>
          </>
        }
      />
    </Page>
  </Document>
);
