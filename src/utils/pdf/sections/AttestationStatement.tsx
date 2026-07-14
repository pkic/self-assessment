import { Text, View } from "@react-pdf/renderer";
import React from "react";
import LevelResult from "../../../enums/LevelResult";
import { mapAssessmentType } from "../assessmentType";
import { styles, getColorForLevel } from "../theme";
import { buildScopeCoverageLine } from "../../reportData";
import { Table, TableRow, TableCell } from "../Table";
import type { SectionComponent } from "./SectionContext";

// Renders a value, or a "Not specified" fallback when it's empty — every
// identity row in the Attestation always renders, unlike the omit-when-empty
// rows used elsewhere in the PDF suite.
const val = (x: string): string => x || "Not specified";

const IDENTITY_COLUMNS = [{ width: "32%" }, { width: "68%" }];

// The pre-certification statement at the core of every full tier: overall
// maturity level, a one-line scope-coverage summary, and an identity table.
// Deliberately excludes PKI Environment and any detailed scope/exclusions
// listing — those live in their own sections (pkiEnvironment/scopeOverview)
// so the Attestation stays shareable without exposing PKI internals. Always
// renders (never null) — every full tier includes it.
export const AttestationStatement: SectionComponent = (ctx) => {
  const { label: assessmentTypeLabel, confidence } = mapAssessmentType(
    ctx.assessmentType,
  );
  const assessorPositionLabel =
    ctx.assessorPosition === "internal"
      ? "Internal"
      : ctx.assessorPosition === "external"
        ? "External"
        : "Not specified";

  return (
    <View>
      <Text style={styles.title}>Attestation Statement</Text>

      <View
        style={[
          styles.overallMaturityLevel,
          {
            backgroundColor: getColorForLevel(ctx.overallMaturityLevel)
              .background,
            borderColor: getColorForLevel(ctx.overallMaturityLevel).border,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 18,
            color: getColorForLevel(ctx.overallMaturityLevel).text,
          }}
        >
          PKI Maturity Level: {ctx.overallMaturityLevel} —{" "}
          {LevelResult[ctx.overallMaturityLevel]}
        </Text>
      </View>

      <Text style={[styles.about_text, { marginBottom: 15 }]}>
        {buildScopeCoverageLine(ctx.overallMaturityLevel, ctx.coverage)}
      </Text>

      <Table columns={IDENTITY_COLUMNS}>
        <TableRow>
          <TableCell width="32%" bold>
            Assessment Name
          </TableCell>
          <TableCell width="68%">{val(ctx.assessmentName)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="32%" bold>
            Assessor Name
          </TableCell>
          <TableCell width="68%">{val(ctx.assessorName)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="32%" bold>
            Assessed Organization
          </TableCell>
          <TableCell width="68%">{val(ctx.organizationName)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="32%" bold>
            Assessor&apos;s Company
          </TableCell>
          <TableCell width="68%">{val(ctx.assessorCompany)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="32%" bold>
            Assessor Position
          </TableCell>
          <TableCell width="68%">{assessorPositionLabel}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="32%" bold>
            Assessment Type
          </TableCell>
          <TableCell width="68%">
            {confidence !== null
              ? `${assessmentTypeLabel} · ${confidence} confidence`
              : assessmentTypeLabel}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell width="32%" bold>
            Model Reference
          </TableCell>
          <TableCell width="68%">
            {`PKI Maturity Model ${ctx.dataVersion}`}
          </TableCell>
        </TableRow>
      </Table>
    </View>
  );
};
