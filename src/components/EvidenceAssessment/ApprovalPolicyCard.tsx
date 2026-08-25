import React from "react";
import { currentAssuranceProfile } from "../../assessment-engine/assurance-policy";
import type { AssessmentProfileData } from "../../assessment-engine/types";
import { Card } from "../ui";

interface Props {
  profile: AssessmentProfileData;
  assuranceProfileId: string;
}

export const ApprovalPolicyCard: React.FC<Props> = ({
  profile,
  assuranceProfileId,
}) => {
  const assurance = currentAssuranceProfile(profile, assuranceProfileId);
  const signing = profile.report.signing;
  return (
    <Card
      as="section"
      padding="lg"
      className="evidence-assessment-assurance-card"
    >
      <div className="evidence-assessment-section-heading">
        <h3>Assurance and formal approval</h3>
        <p>{assurance.notice}</p>
      </div>
      <p className="evidence-assessment-assurance-label">
        {assurance.reportLabel}
      </p>
      {signing ? (
        <ul>
          {signing.fields.map((field) => (
            <li key={field.name}>
              {field.label}: {field.role} (
              {field.required ? "required" : "optional"})
            </li>
          ))}
        </ul>
      ) : null}
      <div className="evidence-assessment-attestation-actions">
        <output>
          The browser prepares signature fields but does not select or sign for
          a person. The external signing flow establishes each actual signer at
          signing time
          {signing?.allowAdditionalSignatures
            ? " and may add further signatures."
            : "."}
        </output>
      </div>
    </Card>
  );
};
