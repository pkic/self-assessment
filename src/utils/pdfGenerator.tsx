import {
  Document,
  Font,
  G,
  Image,
  Link,
  Page,
  Path,
  pdf,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { Style } from "@react-pdf/types";
import React from "react";
import { ProgressData } from "../types/types";
import "../index.module.scss";
import LevelResult from "../enums/LevelResult";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGithub,
  faLinkedin,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { format } from "date-fns";

// Register Roboto font
Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Me5Q.ttf" }, // Roboto Regular
    {
      src: "https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Me5Q.ttf",
      fontWeight: 700,
    }, // Roboto Bold
  ],
});

const primaryColor = getComputedStyle(
  document.documentElement,
).getPropertyValue("--pkimm-primary-color");
const secondaryColor = getComputedStyle(
  document.documentElement,
).getPropertyValue("--pkimm-secondary-color");
const tertiaryColor = getComputedStyle(
  document.documentElement,
).getPropertyValue("--pkimm-tertiary-color");

const PkicLogoSvg = ({
  fillColor = "black",
  fillOne = primaryColor,
  fillTwo = secondaryColor,
  fillThree = tertiaryColor,
}) => (
  <Svg viewBox="0 0 1256 324">
    <Path
      fill={fillColor}
      d="M441.5 165.63L441.5 17.7L560.02 17.7C568.04 17.7 575.03 20.58 581 26.34C586.76 32.3 589.64 39.3 589.64 47.32L589.64 86.41C589.64 94.44 586.76 101.23 581 106.99C575.03 112.96 568.04 115.84 560.02 115.84L471.13 116.05L471.13 165.63L441.5 165.63ZM477.92 86.21L552.81 86.21C556.93 86.21 559.19 86.01 559.4 85.8C559.6 85.59 559.81 83.33 559.81 79.21L559.81 54.11C559.81 50 559.6 47.74 559.4 47.53C559.19 47.32 556.93 47.32 552.81 47.32L477.92 47.32C473.81 47.32 471.75 47.32 471.54 47.53C471.34 47.74 471.13 50 471.13 54.11L471.13 79.21C471.13 83.33 471.34 85.59 471.54 85.8C471.75 86.01 473.81 86.21 477.92 86.21ZM634.06 165.63L634.06 17.49L663.89 17.49L663.89 76.74L695.78 76.74L745.37 17.49L776.85 17.49L776.85 26.95L722.53 91.56L776.85 156.17L776.85 165.63L745.37 165.63L695.78 106.38L663.89 106.38L663.89 165.63L634.06 165.63ZM826.62 165.63L826.62 17.49L855.84 17.49L855.84 165.63L826.62 165.63ZM457.28 306.53C452.96 306.53 449.22 305.01 446.19 301.86C443.04 298.83 441.52 295.09 441.52 290.77L441.52 238.25C441.52 233.93 443.04 230.19 446.19 227.04C449.22 224.01 452.96 222.49 457.28 222.49L525.33 222.49L525.33 236.61L459.73 236.61C457.74 236.61 456.58 236.85 456.22 237.2C455.76 237.55 455.53 238.71 455.53 240.7L455.53 288.32C455.53 290.31 455.76 291.47 456.22 291.82C456.58 292.17 457.74 292.41 459.73 292.41L525.33 292.41L525.33 306.53L457.28 306.53ZM562.2 306.53C557.88 306.53 554.27 305.01 551.23 301.86C548.08 298.83 546.56 295.21 546.56 290.89L546.56 254.47C546.56 250.15 548.08 246.53 551.23 243.38C554.27 240.35 557.88 238.83 562.2 238.83L599.67 238.83C603.99 238.83 607.73 240.35 610.76 243.38C613.79 246.53 615.31 250.15 615.31 254.47L615.31 290.89C615.31 295.21 613.79 298.83 610.76 301.86C607.73 305.01 603.99 306.53 599.67 306.53L562.2 306.53ZM564.65 292.64L597.22 292.64C599.2 292.64 600.37 292.41 600.84 291.94C601.19 291.59 601.42 290.42 601.42 288.44L601.42 256.92C601.42 254.94 601.19 253.77 600.84 253.3C600.37 252.95 599.2 252.72 597.22 252.72L564.65 252.72C562.67 252.72 561.5 252.95 561.15 253.3C560.69 253.77 560.45 254.94 560.45 256.92L560.45 288.44C560.45 290.42 560.69 291.59 561.15 291.94C561.5 292.41 562.67 292.64 564.65 292.64ZM634.79 306.53L634.79 238.83L688.02 238.83C692.34 238.83 695.96 240.35 698.99 243.38C702.03 246.53 703.54 250.15 703.54 254.47L703.54 306.53L689.65 306.53L689.65 256.92C689.65 254.94 689.42 253.77 689.07 253.3C688.6 252.95 687.44 252.72 685.45 252.72L653 252.72C651.02 252.72 649.85 252.95 649.38 253.3C648.92 253.77 648.68 254.94 648.68 256.92L648.68 306.53L634.79 306.53ZM739.37 306.53C735.05 306.53 731.43 305.01 728.4 301.86C725.24 298.83 723.73 295.21 723.73 290.89L723.73 288.67L737.62 288.67L737.62 289.49C737.62 290.77 737.85 291.59 738.32 291.94C738.67 292.41 739.49 292.64 740.77 292.64L775.44 292.64C776.72 292.64 777.54 292.41 778.01 291.94C778.35 291.59 778.59 290.77 778.59 289.49L778.59 282.84C778.59 281.55 778.35 280.73 778.01 280.27C777.54 279.92 776.72 279.69 775.44 279.69L739.37 279.69C735.05 279.69 731.43 278.17 728.4 275.02C725.24 271.98 723.73 268.36 723.73 264.04L723.73 254.47C723.73 250.15 725.24 246.53 728.4 243.38C731.43 240.35 735.05 238.83 739.37 238.83L776.84 238.83C781.16 238.83 784.89 240.35 788.04 243.38C791.08 246.53 792.59 250.15 792.59 254.47L792.59 256.69L778.59 256.69L778.59 255.87C778.59 254.59 778.35 253.77 778.01 253.3C777.54 252.95 776.72 252.72 775.44 252.72L740.77 252.72C739.49 252.72 738.67 252.95 738.32 253.3C737.85 253.77 737.62 254.59 737.62 255.87L737.62 262.52C737.62 263.81 737.85 264.63 738.32 264.98C738.67 265.44 739.49 265.68 740.77 265.68L776.84 265.68C781.16 265.68 784.89 267.19 788.04 270.23C791.08 273.38 792.59 277 792.59 281.32L792.59 290.89C792.59 295.21 791.08 298.83 788.04 301.86C784.89 305.01 781.16 306.53 776.84 306.53L739.37 306.53ZM828.19 306.53C823.87 306.53 820.25 305.01 817.22 301.86C814.06 298.83 812.55 295.21 812.55 290.89L812.55 254.47C812.55 250.15 814.06 246.53 817.22 243.38C820.25 240.35 823.87 238.83 828.19 238.83L865.66 238.83C869.98 238.83 873.71 240.35 876.74 243.38C879.78 246.53 881.3 250.15 881.3 254.47L881.3 290.89C881.3 295.21 879.78 298.83 876.74 301.86C873.71 305.01 869.98 306.53 865.66 306.53L828.19 306.53ZM830.64 292.64L863.21 292.64C865.19 292.64 866.36 292.41 866.82 291.94C867.17 291.59 867.41 290.42 867.41 288.44L867.41 256.92C867.41 254.94 867.17 253.77 866.82 253.3C866.36 252.95 865.19 252.72 863.21 252.72L830.64 252.72C828.66 252.72 827.49 252.95 827.14 253.3C826.67 253.77 826.44 254.94 826.44 256.92L826.44 288.44C826.44 290.42 826.67 291.59 827.14 291.94C827.49 292.41 828.66 292.64 830.64 292.64ZM900.9 306.53L900.9 254.47C900.9 250.15 902.41 246.53 905.57 243.38C908.6 240.35 912.22 238.83 916.54 238.83L954.24 238.83L954.24 252.72L918.99 252.72C917.01 252.72 915.84 252.95 915.49 253.3C915.02 253.77 914.79 254.94 914.79 256.92L914.79 306.53L900.9 306.53ZM986.91 306.53C982.59 306.53 978.86 305.01 975.83 301.86C972.79 298.83 971.27 295.21 971.27 290.89L971.27 217.7L985.16 217.7L985.16 238.83L1012.24 238.83L1012.24 252.72L985.16 252.72L985.16 288.44C985.16 290.42 985.4 291.59 985.86 291.94C986.21 292.41 987.38 292.64 989.37 292.64L1012.24 292.64L1012.24 306.53L986.91 306.53ZM1031.49 306.53L1031.49 238.83L1045.38 238.83L1045.38 306.53L1031.49 306.53ZM1031.49 230.66L1031.49 216.65L1045.38 216.65L1045.38 230.66L1031.49 230.66ZM1082.49 306.53C1078.17 306.53 1074.44 305.01 1071.4 301.86C1068.36 298.83 1066.85 295.21 1066.85 290.89L1066.85 238.83L1080.74 238.83L1080.74 288.44C1080.74 290.42 1080.97 291.59 1081.44 291.94C1081.79 292.41 1082.96 292.64 1084.94 292.64L1117.51 292.64C1119.49 292.64 1120.66 292.41 1121.12 291.94C1121.47 291.59 1121.71 290.42 1121.71 288.44L1121.71 238.83L1135.6 238.83L1135.6 290.89C1135.6 295.21 1134.08 298.83 1131.05 301.86C1128.01 305.01 1124.28 306.53 1119.96 306.53L1082.49 306.53ZM1154.97 306.53L1154.97 238.83L1240.18 238.83C1244.49 238.83 1248.23 240.35 1251.26 243.38C1254.3 246.53 1255.82 250.15 1255.82 254.47L1255.82 306.53L1241.93 306.53L1241.93 256.92C1241.93 254.94 1241.69 253.77 1241.34 253.3C1240.87 252.95 1239.71 252.72 1237.72 252.72L1216.71 252.72C1214.73 252.72 1213.56 252.95 1213.21 253.3C1212.74 253.77 1212.51 254.94 1212.51 256.92L1212.51 306.53L1198.39 306.53L1198.39 256.92C1198.39 254.94 1198.15 253.77 1197.8 253.3C1197.45 252.95 1196.29 252.72 1194.3 252.72L1173.18 252.72C1171.19 252.72 1170.02 252.95 1169.67 253.3C1169.21 253.77 1168.97 254.94 1168.97 256.92L1168.97 306.53L1154.97 306.53Z"
    />
    <G>
      <Path
        fill={fillThree}
        d="M185.82 289.34C177.42 303.88 175.78 323.96 157.02 323.96C138.25 323.96 136.6 303.88 128.21 289.34C100.11 283.72 74.92 270.04 55.16 250.81L69.57 237.19C92.26 258.97 123.07 272.36 157.02 272.36C190.96 272.36 221.77 258.97 244.45 237.19L258.86 250.81C239.1 270.04 213.92 283.72 185.82 289.34Z"
      />
      <Path
        fill={fillTwo}
        d="M196.77 5.52C221.12 12.39 242.9 25.42 260.3 42.82C262.47 45 264.58 47.24 266.61 49.55C283.41 49.55 301.66 40.93 311.05 57.18C320.42 73.43 303.86 84.89 295.46 99.43C300.4 114.09 303.08 129.79 303.08 146.11C303.08 158.48 301.54 170.5 298.65 181.97L279.64 176.3C282.01 166.63 283.28 156.52 283.28 146.11C283.28 111.24 269.14 79.67 246.3 56.83C231.44 41.98 212.91 30.81 192.18 24.81L196.77 5.52Z"
      />
      <Path
        fill={fillOne}
        d="M18.37 99.91C9.98 85.37 -6.59 73.91 2.79 57.66C12.18 41.41 30.42 50.03 47.22 50.03C49.26 47.72 51.36 45.48 53.54 43.3C70.94 25.9 92.71 12.87 117.07 6L121.66 25.29C100.93 31.29 82.39 42.46 67.54 57.31C44.7 80.15 30.56 111.72 30.56 146.59C30.56 157 31.83 167.11 34.2 176.78L15.19 182.45C12.3 170.98 10.76 158.96 10.76 146.59C10.76 130.27 13.43 114.57 18.37 99.91Z"
      />
      <Path
        fill={fillColor}
        d="M227.24 75.88C245.22 93.85 256.33 118.68 256.33 146.11C256.33 160.68 253.19 174.53 247.55 186.99L288.45 210.61L278.62 227.71L237.67 204.06C234.53 208.43 231.04 212.54 227.24 216.34C209.26 234.31 184.43 245.43 157.02 245.43C129.59 245.43 104.76 234.31 86.78 216.34C82.99 212.54 79.5 208.43 76.36 204.06L35.41 227.71L25.58 210.61L66.48 186.99C60.84 174.53 57.69 160.68 57.69 146.11C57.69 118.68 68.81 93.85 86.78 75.88C102.57 60.1 123.64 49.6 147.11 47.28L147.11 0.04L166.92 0.04L166.92 47.28C190.39 49.6 211.46 60.1 227.24 75.88ZM213.23 89.89C198.85 75.5 178.97 66.6 157.02 66.6C135.06 66.6 115.18 75.5 100.79 89.89C86.4 104.27 77.5 124.15 77.5 146.11C77.5 168.06 86.4 187.94 100.79 202.33C115.18 216.72 135.06 225.61 157.02 225.61C178.97 225.61 198.85 216.72 213.23 202.33C227.63 187.95 236.53 168.06 236.53 146.11C236.53 124.15 227.63 104.27 213.23 89.89Z"
      />
      <Path
        fill={fillColor}
        d="M146.04 141.81L132.31 194.95L181.72 194.95L167.99 141.81C175.51 137.86 180.64 129.97 180.64 120.89C180.64 107.85 170.06 97.27 157.02 97.27C143.97 97.27 133.39 107.85 133.39 120.89C133.39 129.97 138.52 137.86 146.04 141.81Z"
      />
    </G>
  </Svg>
);

// Define styles for the PDF
const styles = StyleSheet.create({
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
    borderRadius: 0,
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

const Header: React.FC = () => (
  <View style={styles.fixed_logo} fixed>
    <PkicLogoSvg
      fillColor="black"
      fillOne="black"
      fillTwo="black"
      fillThree="black"
    />
  </View>
);

const Footer: React.FC<{ assessmentUrl: string; version: string }> = ({
  assessmentUrl,
  version,
}) => (
  <View style={styles.fixed_footer} fixed>
    <Text
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
    <Text>{version}</Text>
    <Text>{format(new Date(), "MMMM do, yyyy h:mm a")}</Text>
    <Link
      src={assessmentUrl}
      style={{ color: primaryColor, textDecoration: "underline" }}
    >
      Go To Assessment
    </Link>
  </View>
);

interface PdfDocumentProps {
  chartImgData: string;
  overallMaturityLevel: number;
  moduleMaturityLevels: { module: string; level: number }[];
  modules: {
    id: string;
    name: string;
    categories: { id: string; name: string }[];
  }[];
  progress: Record<string, ProgressData>;
  assessmentName: string;
  assessorName: string;
  useCaseDescription: string;
  assessmentUrl: string;
  version: string;
}

// Function to determine color based on the level
const getColorForLevel = (level: number) => {
  switch (level) {
    case 1:
      return {
        background: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-1",
        ),
        border: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-1",
        ),
        text: "#ffffff",
      };
    case 2:
      return {
        background: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-2",
        ),
        border: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-2",
        ),
        text: "#ffffff",
      };
    case 3:
      return {
        background: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-3",
        ),
        border: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-3",
        ),
        text: "#000000",
      };
    case 4:
      return {
        background: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-4",
        ),
        border: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-4",
        ),
        text: "#000000",
      };
    case 5:
      return {
        background: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-5",
        ),
        border: getComputedStyle(document.documentElement).getPropertyValue(
          "--pkimm-maturity-level-5",
        ),
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

const headerColor = getComputedStyle(document.documentElement).getPropertyValue(
  "--pkimm-primary-color",
);

const PdfDocument: React.FC<PdfDocumentProps> = ({
  chartImgData,
  overallMaturityLevel,
  moduleMaturityLevels,
  modules,
  progress,
  assessmentName,
  assessorName,
  useCaseDescription,
  assessmentUrl,
  version,
}) => (
  <Document>
    {/*first page contains only PKIC logo centered in the middle of the page*/}
    <Page size="A4" style={styles.page}>
      <View style={styles.logo_first}>
        <PkicLogoSvg />
      </View>
      <Text style={[styles.title_first, { marginTop: 50 }]}>
        PKI Maturity Model
      </Text>
      <Text style={styles.subtitle_first}>Self-Assessment Report</Text>
      <Text style={[styles.subtitle_first, { fontSize: 12 }]}>{version}</Text>
      <Text style={[styles.subtitle_first, { fontSize: 12 }]}>
        {format(new Date(), "MMMM do, yyyy h:mm a")}
      </Text>
    </Page>

    {/*second page contains summary*/}
    <Page size="A4" style={styles.page} bookmark={{ title: "Summary" }}>
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <Text style={styles.title}>Summary</Text>
      <View style={styles.overview_table}>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "25%" }]}>
            <Text style={styles.overview_tableCell}>Model Version:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "75%" }]}>
            <Text style={styles.overview_tableCell}>1.0</Text>
          </View>
        </View>
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
            <Text
              style={[
                styles.overview_tableCell,
                {
                  color: getColorForLevel(overallMaturityLevel).background,
                },
              ]}
            >
              {LevelResult[overallMaturityLevel]}
            </Text>
          </View>
        </View>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "25%" }]}>
            <Text style={styles.overview_tableCell}>Assessment Name:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "75%" }]}>
            <Text style={styles.overview_tableCell}>{assessmentName}</Text>
          </View>
        </View>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "25%" }]}>
            <Text style={styles.overview_tableCell}>Assessor Name:</Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "75%" }]}>
            <Text style={styles.overview_tableCell}>{assessorName}</Text>
          </View>
        </View>
        <View style={[styles.overview_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.overview_tableCol, { width: "25%" }]}>
            <Text style={[styles.overview_tableCell]}>
              Use Case Description:
            </Text>
          </View>
          <View style={[styles.overview_tableCol, { width: "75%" }]}>
            <Text style={[styles.overview_tableCell]}>
              {useCaseDescription}
            </Text>
          </View>
        </View>
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
      <Text style={styles.heading}>Module Maturity Levels</Text>
      <View style={styles.rectangleRow}>
        {moduleMaturityLevels.map(({ module, level }) => (
          <View
            style={[
              styles.rectangle,
              {
                backgroundColor: getColorForLevel(level).background,
                borderColor: getColorForLevel(level).border,
              },
            ]}
            key={module}
          >
            <Text
              style={{
                color: getColorForLevel(level).text,
                fontSize: 15,
                marginBottom: 5,
              }}
            >
              {module}
            </Text>
            <Text style={{ color: getColorForLevel(level).text, fontSize: 15 }}>
              {LevelResult[level]}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.heading}>Details</Text>
      <View style={styles.table}>
        <View
          style={[
            styles.tableRow,
            {
              borderTopWidth: 1,
              backgroundColor: headerColor,
              color: "#ffffff",
            },
          ]}
        >
          <View style={[styles.tableCol, { width: "5%" }]}>
            <Text style={[styles.tableCell, styles.boldText]}>#</Text>
          </View>
          <View style={[styles.tableCol, { width: "11%" }]}>
            <Text style={[styles.tableCell, styles.boldText]}>Module</Text>
          </View>
          <View style={[styles.tableCol, { width: "25%" }]}>
            <Text style={[styles.tableCell, styles.boldText]}>Category</Text>
          </View>
          <View style={[styles.tableCol, { width: "12%" }]}>
            <Text style={[styles.tableCell, styles.boldText]}>
              Maturity Level
            </Text>
          </View>
          <View style={[styles.tableCol, { width: "47%" }]}>
            <Text style={[styles.tableCell, styles.boldText]}>Description</Text>
          </View>
        </View>
        {modules.flatMap((module) =>
          module.categories.map((category, categoryIndex) => {
            const isEvenRow = categoryIndex % 2 === 1;
            return (
              <View>
                <View
                  style={[
                    styles.tableRow,
                    isEvenRow ? styles.greyBackground : {},
                  ]}
                  key={`${module.id}.${category.id}`}
                >
                  <View style={[styles.tableCol, { width: "5%" }]}>
                    <Text
                      style={styles.tableCell}
                    >{`${module.id}.${category.id}`}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: "11%" }]}>
                    <Text style={styles.tableCell}>{module.name}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: "25%" }]}>
                    <Text style={styles.tableCell}>{category.name}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: "12%" }]}>
                    <Text
                      style={[
                        styles.tableCell,
                        {
                          color: getColorForLevel(
                            progress[`${module.id}.${category.id}`]?.level,
                          ).background,
                        },
                      ]}
                    >
                      {progress[`${module.id}.${category.id}`]?.result || "N/A"}
                    </Text>
                  </View>
                  <View style={[styles.tableCol, { width: "47%" }]}>
                    <Text style={[styles.tableCell, { fontSize: 6 }]}>
                      {progress[`${module.id}.${category.id}`]?.description ||
                        "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }),
        )}
      </View>
    </Page>

    {/*fourth page contains about, consortium and resources*/}
    <Page
      size="A4"
      style={styles.page}
      bookmark={{ title: "About PKI Maturity Model" }}
    >
      <Header />
      <Footer assessmentUrl={assessmentUrl} version={version} />
      <Text style={styles.about_heading}>About PKI Maturity Model</Text>
      <Text style={styles.about_text}>
        The maturity model is based on the Capability Maturity Model Integration
        (CMMI) developed by Carnegie Mellon University. It should provide the
        following:
      </Text>
      <Text style={styles.about_text}>
        <ListItem>
          Quickly understand the current level of capabilities and performance
          of the PKI
        </ListItem>
        <Br />
        <ListItem>
          Support comparison of PKI maturity with similar organizations based on
          size or industry (anonymized)
        </ListItem>
        <Br />
        <ListItem>
          Guidance on how to improve the capabilities of the current PKI
        </ListItem>
        <Br />
        <ListItem>Improve overall PKI performance</ListItem>
        <Br />
      </Text>
      <Text style={styles.about_text}>
        <Br />
        The PKI maturity model defines 5 levels of the PKI maturity based on
        different indicators and associated risks.
        <Br />
        <Br />
      </Text>

      <View style={styles.maturity_table}>
        <View
          style={[
            styles.maturity_tableRow,
            styles.greyBackground,
            {
              borderBottomWidth: 0,
              fontWeight: "bold",
            },
          ]}
        >
          <View style={[styles.maturity_tableCol, { width: "15%" }]}>
            <Text style={styles.maturity_tableCell}>Maturity level</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "85%" }]}>
            <Text style={styles.maturity_tableCell}>Short description</Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "15%" }]}>
            <Text style={styles.maturity_tableCell}>Initial</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "85%" }]}>
            <Text style={styles.maturity_tableCell}>
              Unpredictable process with poor control and always reactive
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "15%" }]}>
            <Text style={styles.maturity_tableCell}>Basic</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "85%" }]}>
            <Text style={styles.maturity_tableCell}>
              Process is characterized by each particular case or project and
              controls are often reactive
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "15%" }]}>
            <Text style={styles.maturity_tableCell}>Advanced</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "85%" }]}>
            <Text style={styles.maturity_tableCell}>
              Process is characterized by organizational standards and controls
              are proactive
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "15%" }]}>
            <Text style={styles.maturity_tableCell}>Managed</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "85%" }]}>
            <Text style={styles.maturity_tableCell}>
              Processes are measured and controlled, proactive approach
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 1 }]}>
          <View style={[styles.maturity_tableCol, { width: "15%" }]}>
            <Text style={styles.maturity_tableCell}>Optimized</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "85%" }]}>
            <Text style={styles.maturity_tableCell}>
              Continuous improvement of the processes and procedures, proactive
              approach for future technology improvement
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.about_heading}>
        <Br />
        About PKI Consortium
      </Text>
      <Text style={styles.about_text}>
        The PKI Consortium is comprised of leading organizations that are
        committed to improve, create, and collaborate on generic, industry or
        use-case specific policies, procedures, best practices, standards, and
        tools that advance trust in assets and communication for everyone and
        everything using Public Key Infrastructure (PKI) as well as the security
        of the internet in general. By engaging with users, regulators,
        supervisory bodies and other interested or relying parties the
        consortium can address actual issues.
      </Text>

      <Text style={styles.about_heading}>
        <Br />
        Useful Resources
      </Text>
      <View style={styles.maturity_table}>
        <View
          style={[
            styles.maturity_tableRow,
            styles.greyBackground,
            {
              borderBottomWidth: 0,
              fontWeight: "bold",
            },
          ]}
        >
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>Resource</Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>Description</Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link style={{ color: primaryColor }} src="https://pkic.org">
                PKI Consortium
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              PKI Consortium home page
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link
                style={{ color: primaryColor }}
                src="https://pkic.org/pkimm/model/"
              >
                PKI maturity model
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              Definition of the PKI maturity model and description of the
              maturity assessment process and procedures in order to rate the
              current maturity level and to track progress
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link
                style={{ color: primaryColor }}
                src="https://pkic.org/pkimm/categories/"
              >
                Categories description
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              Description of PKI maturity model related categories and
              associated requirement, guidance, assessment tips, and references
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link
                style={{ color: primaryColor }}
                src="https://pkic.org/pkimm/assessment/"
              >
                PKI maturity assessment process
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              Description of the assessment process
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link
                style={{ color: primaryColor }}
                src="https://pkic.org/pkimm/tools/"
              >
                PKI maturity assessment tools
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              Available tools for the assessment of the PKI implementation and
              use case
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link
                style={{ color: primaryColor }}
                src="https://forms.gle/7CgvuNoxaiTYbtK29"
              >
                Feedback form
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              PKI maturity model and assessment feedback form
            </Text>
          </View>
        </View>
        <View style={[styles.maturity_tableRow, { borderBottomWidth: 1 }]}>
          <View style={[styles.maturity_tableCol, { width: "25%" }]}>
            <Text style={styles.maturity_tableCell}>
              <Link
                style={{ color: primaryColor }}
                src="https://github.com/orgs/pkic/discussions/categories/pki-maturity-model-pkimm"
              >
                PKI maturity model community discussion
              </Link>
            </Text>
          </View>
          <View style={[styles.maturity_tableCol, { width: "75%" }]}>
            <Text style={styles.maturity_tableCell}>
              Ideas, questions, or feedback that you want to share or discuss
              related to the PKI maturity model.
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.about_heading}>
          <Br />
          <Br />
          <Br />
          <Br />
          <Br />
          Follow us on:
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Link src="https://twitter.com/PKIConsortium">
            <FontAwesomeIcon
              faIcon={faXTwitter}
              style={{
                color: "#000000",
                width: "20px",
                marginRight: "10px",
              }}
            />
          </Link>
          <Link src="https://www.linkedin.com/groups/4852478/">
            <FontAwesomeIcon
              faIcon={faLinkedin}
              style={{
                color: "#0077B5",
                width: "20px",
                marginRight: "10px",
              }}
            />
          </Link>
          <Link src="https://github.com/pkic">
            <FontAwesomeIcon
              faIcon={faGithub}
              style={{
                color: "#6e5494",
                width: "20px",
              }}
            />
          </Link>
        </View>
      </View>
    </Page>
  </Document>
);

interface ListItemProps {
  children: string;
}

const ListItem: React.FC<ListItemProps> = ({ children }) => {
  return (
    <View>
      <View>
        <Text>{"\u2022" + " "}</Text>
      </View>
      <Text>{children}</Text>
    </View>
  );
};

const Br = () => "\n";

interface FontAwesomeIconProps {
  faIcon: IconDefinition;
  style?: Style;
}

const FontAwesomeIcon = ({
  faIcon: { icon },
  style = {},
}: FontAwesomeIconProps) => {
  const duotone = Array.isArray(icon[4]);
  const paths = Array.isArray(icon[4]) ? icon[4] : [icon[4]];
  const color = style.color || "black";
  return (
    <Svg viewBox={`0 0 ${icon[0]} ${icon[1]}`} style={style}>
      {paths &&
        paths.map((d, index) => (
          <Path
            d={d}
            key={index}
            fill={color}
            fillOpacity={duotone && index === 0 ? 0.4 : 1.0}
          />
        ))}
    </Svg>
  );
};

export const exportToPDF = async (
  progress: Record<string, ProgressData>,
  chartElement: HTMLElement,
  overallMaturityLevel: number,
  moduleMaturityLevels: { module: string; level: number }[],
  modules: {
    id: string;
    name: string;
    categories: { id: string; name: string }[];
  }[],
  assessmentName: string,
  assessorName: string,
  useCaseDescription: string,
  assessmentUrl: string,
  version: string,
) => {
  const chartCanvas = chartElement.querySelector("canvas") as HTMLCanvasElement;
  const chartImgData = chartCanvas.toDataURL("image/png");

  const pdfDoc = (
    <PdfDocument
      chartImgData={chartImgData}
      overallMaturityLevel={overallMaturityLevel}
      moduleMaturityLevels={moduleMaturityLevels}
      modules={modules}
      progress={progress}
      assessmentName={assessmentName}
      assessorName={assessorName}
      useCaseDescription={useCaseDescription}
      assessmentUrl={assessmentUrl}
      version={version}
    />
  );

  const pdfBlob = await pdf(pdfDoc).toBlob();

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "PKIMM-self-assessment-report.pdf";
  a.click();
  URL.revokeObjectURL(url);
};
