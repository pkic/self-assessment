import { Document, Image, Link, Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import { ReferenceEntry } from "../../types/types";
import LevelResult from "../../enums/LevelResult";
import { Header, Footer, CoverPage, SummaryRow } from "./primitives";
import { Table, TableRow, TableTextRow, TableCell, TableColumn } from "./Table";
import { ReferencesAppendixPage } from "./ReferencesAppendixPage";
import { AboutPageBody } from "./AboutPage";
import { MaturityBars } from "./charts/MaturityBars";
import { LevelPill } from "./LevelPill";
import { styles, getColorForLevel } from "./theme";
import { DetailRow } from "../reportData";

const DETAILS_COLUMNS: TableColumn[] = [
  { width: "13%", label: "Module" },
  { width: "27%", label: "Category" },
  { width: "22%", label: "Maturity Level" },
  { width: "38%", label: "Description" },
];

export interface PdfDocumentProps {
  chartImgData: string;
  qrImgData: string | null;
  overallMaturityLevel: number;
  moduleMaturityLevels: { module: string; level: number }[];
  detailRows: DetailRow[];
  references: ReferenceEntry[];
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  assessmentUrl: string;
  version: string;
}

export const PdfDocument: React.FC<PdfDocumentProps> = ({
  chartImgData,
  qrImgData,
  overallMaturityLevel,
  moduleMaturityLevels,
  detailRows,
  references,
  assessmentName,
  assessorName,
  useCaseDescription,
  assessmentUrl,
  version,
}) => (
  <Document>
    {/*first page contains only PKIC logo centered in the middle of the page*/}
    <CoverPage
      version={version}
      reportTitle="Self-Assessment Report"
      qrImgData={qrImgData}
    />

    {/*second page contains summary*/}
    <Page size="A4" style={styles.page} bookmark={{ title: "Summary" }}>
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <Text style={styles.title}>Summary</Text>
      <View style={styles.overview_table}>
        <SummaryRow
          label="Model Version:"
          value="1.0"
          labelWidth="25%"
          valueWidth="75%"
        />
        <View
          style={[
            styles.overview_tableRow,
            { borderBottomWidth: 0, fontWeight: "bold" },
          ]}
        >
          <View style={[styles.overview_tableCol, { width: "25%" }]}>
            <Text style={styles.overview_tableCell}>PKI Maturity Level:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "75%" }]}>
            <LevelPill level={overallMaturityLevel} variant="full" />
          </View>
        </View>
        <SummaryRow
          label="Assessment Name:"
          value={assessmentName}
          labelWidth="25%"
          valueWidth="75%"
        />
        <SummaryRow
          label="Assessor Name:"
          value={assessorName}
          labelWidth="25%"
          valueWidth="75%"
        />
        <SummaryRow
          label="Use Case Description:"
          value={useCaseDescription}
          labelWidth="25%"
          valueWidth="75%"
        />
        <View style={styles.overview_tableRow}>
          <View style={[styles.overview_tableCol, { width: "25%" }]}>
            <Text style={styles.overview_tableCell}>Assessment Link:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "75%" }]}>
            <Text style={styles.overview_tableCell}>
              <Link
                src={assessmentUrl}
                style={{ color: "green", textDecoration: "underline" }}
              >
                Go To Assessment
              </Link>
            </Text>
          </View>
        </View>
      </View>

      <Image style={styles.chart} src={chartImgData} />
    </Page>

    {/*third page contains details*/}
    <Page size="A4" style={styles.page} bookmark={{ title: "Report details" }}>
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <Text style={styles.heading}>Overall PKI Maturity Level</Text>
      <View
        style={[
          styles.overallMaturityLevel,
          {
            backgroundColor: getColorForLevel(overallMaturityLevel).background,
            borderColor: getColorForLevel(overallMaturityLevel).border,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 24,
            color: getColorForLevel(overallMaturityLevel).text,
          }}
        >
          {LevelResult[overallMaturityLevel]}
        </Text>
      </View>
      <Text style={[styles.heading, { marginTop: 16 }]}>
        Module Maturity Levels
      </Text>
      <MaturityBars moduleMaturityLevels={moduleMaturityLevels} />
      <Text style={[styles.heading, { marginTop: 16 }]}>Details</Text>
      <Table header columns={DETAILS_COLUMNS}>
        {detailRows.flatMap((row, idx) => {
          // Continuous striping over the whole table — never reset per
          // module, which used to leave two same-colour rows adjacent at
          // every module boundary. A row's notes ride below it as a
          // full-width breakable text row sharing its stripe, so the pair
          // reads as one striped unit inside the table borders.
          const zebra = idx % 2 === 1;
          const meta = (
            <TableRow key={row.key} zebra={zebra}>
              <TableCell width={DETAILS_COLUMNS[0].width}>
                {row.module}
              </TableCell>
              <TableCell width={DETAILS_COLUMNS[1].width}>
                {row.category}
              </TableCell>
              <TableCell plain width={DETAILS_COLUMNS[2].width}>
                <LevelPill level={row.storedColorKey} variant="full" />
              </TableCell>
              <TableCell width={DETAILS_COLUMNS[3].width}>
                {row.description || "N/A"}
              </TableCell>
            </TableRow>
          );
          if (!row.notes) return [meta];
          return [
            meta,
            <TableTextRow key={`${row.key}-notes`} label="Notes" zebra={zebra}>
              {row.notes}
            </TableTextRow>,
          ];
        })}
      </Table>
    </Page>

    <ReferencesAppendixPage
      references={references}
      assessmentUrl={assessmentUrl}
      version={version}
    />

    {/*final page contains the canonical About PKI Maturity Model content*/}
    <Page
      size="A4"
      style={styles.page}
      bookmark={{ title: "About PKI Maturity Model" }}
    >
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <AboutPageBody />
    </Page>
  </Document>
);
