import type { AssessmentProfileData } from "./types";
import {
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_PACKAGE_BYTES,
} from "./evidence";

export const validateAssessmentProfileSemantics = (
  profile: AssessmentProfileData,
): void => {
  const fieldKeys = new Set(
    profile.runtime.subjectFields.map((field) => field.key),
  );
  if (fieldKeys.size !== profile.runtime.subjectFields.length) {
    throw new Error("Assessment subject field keys must be unique.");
  }
  for (const rule of profile.runtime.subjectRules ?? []) {
    for (const field of rule.fields) {
      if (!fieldKeys.has(field)) {
        throw new Error(`Subject rule references unknown field: ${field}`);
      }
    }
  }

  for (const format of ["cpe-2.3", "package-url"] as const) {
    const count = profile.runtime.subjectFields.filter(
      (field) => field.format === format,
    ).length;
    if (count > 1) {
      throw new Error(`Only one ${format} subject field may be configured.`);
    }
  }

  const assuranceIds = profile.assurance.profiles.map(({ id }) => id);
  if (new Set(assuranceIds).size !== assuranceIds.length) {
    throw new Error("Assurance profile ids must be unique.");
  }
  const defaultAssurance = profile.assurance.profiles.find(
    (assurance) => assurance.id === profile.assurance.defaultProfile,
  );
  if (!defaultAssurance) {
    throw new Error("Default assurance profile is not declared.");
  }
  if (defaultAssurance.availability !== "browser") {
    throw new Error(
      "Default assurance profile must be available in the browser.",
    );
  }
  for (const assurance of profile.assurance.profiles.filter(
    ({ availability }) => availability === "browser",
  )) {
    if (
      assurance.independentVerification ||
      assurance.certification ||
      assurance.requiredFacets.includes("certification-issuance")
    ) {
      throw new Error(
        "Browser assurance profiles cannot claim independent verification or certification.",
      );
    }
  }

  if (profile.runtime.experience === "weighted-maturity") {
    if (profile.runtime.methodology.strategy !== "weighted-average") {
      throw new Error(
        "The weighted-maturity experience requires the weighted-average strategy.",
      );
    }
    const parameters = profile.runtime.methodology.parameters;
    if (
      parameters.minimumLevel !== 0 ||
      parameters.maximumLevel !== 5 ||
      !["floor", "round", "ceil"].includes(String(parameters.rounding)) ||
      parameters.categoryWeightField !== "weight" ||
      parameters.requirementWeightField !== "weight" ||
      parameters.excludeNotApplicable !== true
    ) {
      throw new Error(
        "Weighted maturity parameters must use levels 0-5, supported rounding, weight fields, and Not Applicable exclusion.",
      );
    }
  }
  if (profile.runtime.experience === "evidence-gated-maturity") {
    if (profile.runtime.methodology.strategy !== "cumulative-gates") {
      throw new Error(
        "The evidence-gated-maturity experience requires the cumulative-gates strategy.",
      );
    }
    const criterion = profile.runtime.criterion;
    if (!criterion) {
      throw new Error(
        "The evidence-gated-maturity experience requires a criterion policy.",
      );
    }
    const parameters = profile.runtime.methodology.parameters;
    if (
      parameters.baselineLevel !== 0 ||
      parameters.minimumLevel !== 0 ||
      parameters.maximumLevel !== 5 ||
      parameters.evidenceRequiredFromLevel !==
        criterion.evidence.requiredFromLevel ||
      !Array.isArray(parameters.passingStatuses) ||
      parameters.passingStatuses.length !==
        criterion.evidence.requiredForStatuses.length ||
      parameters.passingStatuses.some(
        (status) =>
          typeof status !== "string" ||
          !criterion.evidence.requiredForStatuses.includes(status),
      )
    ) {
      throw new Error(
        "Cumulative gate parameters must match the declared evidence policy and supported level range.",
      );
    }
    const statusValues = criterion.statuses.map(({ value }) => value);
    if (new Set(statusValues).size !== statusValues.length) {
      throw new Error("Criterion status values must be unique.");
    }
    for (const status of criterion.evidence.requiredForStatuses) {
      if (!statusValues.includes(status)) {
        throw new Error(
          `Evidence policy references unknown criterion status: ${status}`,
        );
      }
    }
    if (criterion.evidence.maxFileBytes > criterion.evidence.maxPackageBytes) {
      throw new Error("Evidence maxFileBytes cannot exceed maxPackageBytes.");
    }
    if (
      criterion.evidence.maxFileBytes > MAX_EVIDENCE_FILE_BYTES ||
      criterion.evidence.maxPackageBytes > MAX_EVIDENCE_PACKAGE_BYTES
    ) {
      throw new Error("Evidence limits exceed the browser safety maximum.");
    }
    if (criterion.evidence.acceptedMediaTypes.length === 0) {
      throw new Error("At least one evidence media type must be accepted.");
    }
    const supportedValidators = new Set([
      "sha256-integrity",
      "reference-presence",
    ]);
    if (
      criterion.evidence.validators.some(
        (validator) => !supportedValidators.has(validator),
      ) ||
      [...supportedValidators].some(
        (validator) => !criterion.evidence.validators.includes(validator),
      )
    ) {
      throw new Error(
        "Evidence validators must be sha256-integrity and reference-presence.",
      );
    }
  }
  if (profile.report.includeAttestation && !profile.report.signing) {
    throw new Error("Attestation reports require a signing policy.");
  }
  const signatureFieldNames =
    profile.report.signing?.fields.map((field) => field.name) ?? [];
  if (new Set(signatureFieldNames).size !== signatureFieldNames.length) {
    throw new Error("PDF signature field names must be unique.");
  }
};
