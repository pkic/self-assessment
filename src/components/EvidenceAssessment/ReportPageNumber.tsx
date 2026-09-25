import React from "react";
import { Text } from "@react-pdf/renderer";
import { reportStyles } from "./reportStyles";

export const ReportPageNumber: React.FC = () => (
  <Text
    style={reportStyles.pageNumber}
    fixed
    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
  />
);
