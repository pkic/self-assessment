import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";
import {
  faGithub,
  faLinkedin,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { ListItem, Br, FontAwesomeIcon } from "./primitives";
import {
  AttributionLine,
  MaturityLadderTable,
  UsefulResourcesTable,
} from "./StaticPages";
import { styles } from "./theme";

export interface AboutPageBodyProps {
  // Rendered after the model ladder / before the Consortium + resources +
  // social closing material, so an extension-specific block (e.g. the
  // extension report's "About PKI MM Extension Framework" section) reads
  // near the model explanation rather than after the social links.
  extensionSection?: React.ReactNode;
}

// The single canonical "About PKI Maturity Model" content, shared by every
// report: the self report's CoreReportDocument, the extension report's
// ExtensionReportDocument, and the section-registry "about" section used by
// the Attestation/Assessment/Detailed/Custom tiers. Flowing content only (no
// <Page>/Header/Footer/bookmark) — the caller supplies the page shell.
export const AboutPageBody: React.FC<AboutPageBodyProps> = ({
  extensionSection,
}) => (
  <View>
    <Text style={styles.about_heading}>About PKI Maturity Model</Text>
    <Text style={styles.about_text}>
      The maturity model is based on the Capability Maturity Model Integration
      (CMMI) developed by Carnegie Mellon University. It should provide the
      following:
    </Text>
    <Text style={styles.about_text}>
      <ListItem>
        Quickly understand the current level of capabilities and performance of
        the PKI
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

    <MaturityLadderTable style={styles.maturity_table} />

    {extensionSection}

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
      supervisory bodies and other interested or relying parties the consortium
      can address actual issues.
    </Text>

    <Text style={styles.about_heading}>
      <Br />
      Useful Resources
    </Text>
    <UsefulResourcesTable />

    <View style={{ marginTop: 10 }}>
      <AttributionLine />
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
  </View>
);
