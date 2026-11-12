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
      padding="none"
      className="evidence-assessment-assurance-card"
      aria-labelledby="evidence-assessment-assurance-heading"
    >
      <details className="evidence-assessment-assurance-details">
        <summary>
          <span className="evidence-assessment-disclosure__text">
            <span
              id="evidence-assessment-assurance-heading"
              className="evidence-assessment-disclosure__title"
              role="heading"
              aria-level={3}
            >
              Assurance and formal approval
            </span>
            <span className="evidence-assessment-assurance-label">
              {assurance.reportLabel}
            </span>
          </span>
        </summary>
        <div className="evidence-assessment-disclosure__body">
          <p>{assurance.notice}</p>
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
          <p className="evidence-assessment-muted">
            The browser prepares signature fields but does not select or sign
            for a person. The external signing flow establishes each actual
            signer at signing time
            {signing?.allowAdditionalSignatures
              ? " and may add further signatures."
              : "."}
          </p>
        </div>
      </details>
    </Card>
  );
};
