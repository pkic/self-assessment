import type { AssessmentProfileData } from "./types";
import {
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_PACKAGE_BYTES,
} from "./evidence";

const assertUnique = (values: string[], message: string): void => {
  if (new Set(values).size !== values.length) throw new Error(message);
};

const validateSubjectPolicy = (profile: AssessmentProfileData): void => {
  const fields = profile.runtime.subjectFields;
  const fieldKeys = fields.map(({ key }) => key);
  assertUnique(fieldKeys, "Assessment subject field keys must be unique.");
  const knownFields = new Set(fieldKeys);
  for (const rule of profile.runtime.subjectRules ?? []) {
    for (const field of rule.fields) {
      if (!knownFields.has(field)) {
        throw new Error(`Subject rule references unknown field: ${field}`);
      }
    }
  }

  for (const format of ["cpe-2.3", "package-url"] as const) {
    if (fields.filter((field) => field.format === format).length > 1) {
      throw new Error(`Only one ${format} subject field may be configured.`);
    }
  }
};

const validateAssurancePolicy = (profile: AssessmentProfileData): void => {
  const profiles = profile.assurance.profiles;
  assertUnique(
    profiles.map(({ id }) => id),
    "Assurance profile ids must be unique.",
  );
  const defaultAssurance = profiles.find(
    ({ id }) => id === profile.assurance.defaultProfile,
  );
  if (!defaultAssurance) {
    throw new Error("Default assurance profile is not declared.");
  }
  if (defaultAssurance.availability !== "browser") {
    throw new Error(
      "Default assurance profile must be available in the browser.",
    );
  }

  const browserProfiles = profiles.filter(
    ({ availability }) => availability === "browser",
  );
  for (const assurance of browserProfiles) {
    const claimsCertification =
      assurance.independentVerification ||
      assurance.certification ||
      assurance.requiredFacets.includes("certification-issuance");
    if (claimsCertification) {
      throw new Error(
        "Browser assurance profiles cannot claim independent verification or certification.",
      );
    }
  }
};

const validateWeightedExperience = (profile: AssessmentProfileData): void => {
  if (profile.runtime.experience !== "weighted-maturity") return;
  if (profile.runtime.methodology.strategy !== "weighted-average") {
    throw new Error(
      "The weighted-maturity experience requires the weighted-average strategy.",
    );
  }
  const parameters = profile.runtime.methodology.parameters;
  const supported =
    parameters.minimumLevel === 0 &&
    parameters.maximumLevel === 5 &&
    ["floor", "round", "ceil"].includes(String(parameters.rounding)) &&
    parameters.categoryWeightField === "weight" &&
    parameters.requirementWeightField === "weight" &&
    parameters.excludeNotApplicable === true;
  if (!supported) {
    throw new Error(
      "Weighted maturity parameters must use levels 0-5, supported rounding, weight fields, and Not Applicable exclusion.",
    );
  }
};

const validateEvidencePolicy = (profile: AssessmentProfileData): void => {
  const criterion = profile.runtime.criterion;
  if (!criterion) {
    throw new Error(
      "The evidence-gated-maturity experience requires a criterion policy.",
    );
  }
  const evidence = criterion.evidence;
  const statusValues = criterion.statuses.map(({ value }) => value);
  assertUnique(statusValues, "Criterion status values must be unique.");
  for (const status of evidence.requiredForStatuses) {
    if (!statusValues.includes(status)) {
      throw new Error(
        `Evidence policy references unknown criterion status: ${status}`,
      );
    }
  }
  if (evidence.maxFileBytes > evidence.maxPackageBytes) {
    throw new Error("Evidence maxFileBytes cannot exceed maxPackageBytes.");
  }
  if (
    evidence.maxFileBytes > MAX_EVIDENCE_FILE_BYTES ||
    evidence.maxPackageBytes > MAX_EVIDENCE_PACKAGE_BYTES
  ) {
    throw new Error("Evidence limits exceed the browser safety maximum.");
  }
  if (evidence.acceptedMediaTypes.length === 0) {
    throw new Error("At least one evidence media type must be accepted.");
  }
  const requiredValidators = [
    "sha256-integrity",
    "reference-presence",
  ] as const;
  const validatorsMatch =
    evidence.validators.length === requiredValidators.length &&
    requiredValidators.every((validator) =>
      evidence.validators.includes(validator),
    );
  if (!validatorsMatch) {
    throw new Error(
      "Evidence validators must be sha256-integrity and reference-presence.",
    );
  }
};

const validateGatedExperience = (profile: AssessmentProfileData): void => {
  if (profile.runtime.experience !== "evidence-gated-maturity") return;
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
  const passingStatuses = parameters.passingStatuses;
  const parametersMatch =
    parameters.baselineLevel === 0 &&
    parameters.minimumLevel === 0 &&
    parameters.maximumLevel === 5 &&
    parameters.evidenceRequiredFromLevel ===
      criterion.evidence.requiredFromLevel &&
    Array.isArray(passingStatuses) &&
    passingStatuses.length === criterion.evidence.requiredForStatuses.length &&
    passingStatuses.every(
      (status) =>
        typeof status === "string" &&
        criterion.evidence.requiredForStatuses.includes(status),
    );
  if (!parametersMatch) {
    throw new Error(
      "Cumulative gate parameters must match the declared evidence policy and supported level range.",
    );
  }
  validateEvidencePolicy(profile);
};

const validateReportPolicy = (profile: AssessmentProfileData): void => {
  if (profile.report.includeAttestation && !profile.report.signing) {
    throw new Error("Attestation reports require a signing policy.");
  }
  const fieldNames =
    profile.report.signing?.fields.map(({ name }) => name) ?? [];
  assertUnique(fieldNames, "PDF signature field names must be unique.");
};

export const validateAssessmentProfileSemantics = (
  profile: AssessmentProfileData,
): void => {
  validateSubjectPolicy(profile);
  validateAssurancePolicy(profile);
  validateWeightedExperience(profile);
  validateGatedExperience(profile);
  validateReportPolicy(profile);
};
