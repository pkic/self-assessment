import { View } from "@react-pdf/renderer";
import React from "react";
import {
  Table,
  TableRow,
  TableTextRow,
  TableCell,
  TableColumn,
  isLongText,
} from "../Table";
import { SectionHeading } from "../SectionHeading";
import type { PkiEnvironment } from "../../../types/types";
import type { SectionComponent } from "./SectionContext";

// Same field keys/labels as the (now superseded, self-tier) PkiEnvironmentSection.
const PKI_ENVIRONMENT_FIELDS: { key: keyof PkiEnvironment; label: string }[] = [
  { key: "components", label: "Components" },
  { key: "outOfScopeConsiderations", label: "Out-of-scope considerations" },
  { key: "highLevelDesign", label: "High-level design" },
  { key: "pointsOfInteraction", label: "Points of interaction" },
];

const PKI_ENVIRONMENT_COLUMNS: TableColumn[] = [
  { width: "30%", label: "Field" },
  { width: "70%", label: "Value" },
];

// PKI environment as a sized Field|Value table for the Assessment/Detailed
// tiers (the Attestation tier renders none of this). Gated on ctx directly,
// per the section-gating convention. A short value renders in the 70% column;
// a long one flows below its atomic field-label row as a full-width breakable
// row (see Table.tsx's LONG_TEXT_CHARS), so the label can never strand at a
// page bottom with its value orphaned on the next page.
export const PkiEnvironmentTable: SectionComponent = (ctx) => {
  const filled = PKI_ENVIRONMENT_FIELDS.filter(
    ({ key }) => ctx.pkiEnvironment[key],
  );
  if (filled.length === 0) return null;

  return (
    <View>
      <SectionHeading>PKI Environment</SectionHeading>
      <Table header columns={PKI_ENVIRONMENT_COLUMNS}>
        {filled.flatMap(({ key, label }) => {
          const value = ctx.pkiEnvironment[key] ?? "";
          if (!isLongText(value)) {
            return [
              <TableRow key={key}>
                <TableCell width={PKI_ENVIRONMENT_COLUMNS[0].width} bold>
                  {label}
                </TableCell>
                <TableCell width={PKI_ENVIRONMENT_COLUMNS[1].width}>
                  {value}
                </TableCell>
              </TableRow>,
            ];
          }
          return [
            <TableRow key={key}>
              <TableCell width="100%" bold>
                {label}
              </TableCell>
            </TableRow>,
            <TableTextRow key={`${key}-value`}>{value}</TableTextRow>,
          ];
        })}
      </Table>
    </View>
  );
};
