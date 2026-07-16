import { Link, Text, View } from "@react-pdf/renderer";
import { Style } from "@react-pdf/types";
import React from "react";
import { primaryColor, styles } from "./theme";

export const MaturityLadderTable: React.FC<{ style: Style | Style[] }> = ({
  style,
}) => (
  <View style={style}>
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
        <Text style={styles.maturity_tableCell}>Foundational</Text>
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
          Process is characterized by organizational standards and controls are
          proactive
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
);

// CC BY 4.0 attribution for the PKI Maturity Model content itself (the
// model/category/requirement text, not the widget's generated report).
export const AttributionLine: React.FC = () => (
  <Text style={styles.about_text}>
    PKI Maturity Model content © PKI Consortium, CC BY 4.0, pkic.org/pkimm
  </Text>
);

export const UsefulResourcesTable: React.FC = () => (
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
        <Text style={styles.maturity_tableCell}>PKI Consortium home page</Text>
      </View>
    </View>
    <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
      <View style={[styles.maturity_tableCol, { width: "25%" }]}>
        <Text style={styles.maturity_tableCell}>
          <Link
            style={{ color: primaryColor }}
            src="https://pkic.org/wg/pkimm/model/"
          >
            PKI maturity model
          </Link>
        </Text>
      </View>
      <View style={[styles.maturity_tableCol, { width: "75%" }]}>
        <Text style={styles.maturity_tableCell}>
          Definition of the PKI maturity model and description of the maturity
          assessment process and procedures in order to rate the current
          maturity level and to track progress
        </Text>
      </View>
    </View>
    <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
      <View style={[styles.maturity_tableCol, { width: "25%" }]}>
        <Text style={styles.maturity_tableCell}>
          <Link
            style={{ color: primaryColor }}
            src="https://pkic.org/wg/pkimm/categories/"
          >
            Categories description
          </Link>
        </Text>
      </View>
      <View style={[styles.maturity_tableCol, { width: "75%" }]}>
        <Text style={styles.maturity_tableCell}>
          Description of PKI maturity model related categories and associated
          requirement, guidance, assessment tips, and references
        </Text>
      </View>
    </View>
    <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
      <View style={[styles.maturity_tableCol, { width: "25%" }]}>
        <Text style={styles.maturity_tableCell}>
          <Link
            style={{ color: primaryColor }}
            src="https://pkic.org/wg/pkimm/assessment/"
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
            src="https://pkic.org/wg/pkimm/tools/"
          >
            PKI maturity assessment tools
          </Link>
        </Text>
      </View>
      <View style={[styles.maturity_tableCol, { width: "75%" }]}>
        <Text style={styles.maturity_tableCell}>
          Available tools for the assessment of the PKI implementation and use
          case
        </Text>
      </View>
    </View>
    <View style={[styles.maturity_tableRow, { borderBottomWidth: 0 }]}>
      <View style={[styles.maturity_tableCol, { width: "25%" }]}>
        <Text style={styles.maturity_tableCell}>
          <Link
            style={{ color: primaryColor }}
            src="https://pkic.org/wg/pkimm/extensions/"
          >
            Extension framework
          </Link>
        </Text>
      </View>
      <View style={[styles.maturity_tableCol, { width: "75%" }]}>
        <Text style={styles.maturity_tableCell}>
          Overview of the extension framework, including structure, scoring
          model, and the catalog of available extensions
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
);
