import React from "react";

interface RequirableField {
  key: string;
  required?: boolean;
}

interface AtLeastOneRule {
  fields: string[];
  message: string;
}

/**
 * Most response and scope fields are required, so only the exceptions get a
 * marker: a field covered by an "at least one of" rule says so, and any
 * other non-required field is marked optional. Required fields carry the
 * native `required` attribute instead.
 */
export const fieldRequirementNote = (
  field: RequirableField,
  rules: readonly AtLeastOneRule[] | undefined,
): string | undefined => {
  if (field.required) return undefined;
  if (rules?.some((rule) => rule.fields.includes(field.key))) {
    return "one of these is required";
  }
  return "optional";
};

/**
 * Renders an "at least one of" rule message just before the first field it
 * covers, so the guidance sits next to the fields it is about.
 */
export const RuleNote: React.FC<{
  field: string;
  rules: readonly AtLeastOneRule[] | undefined;
}> = ({ field, rules }) => (
  <>
    {rules
      ?.filter((rule) => rule.fields[0] === field)
      .map((rule) => (
        <p key={rule.message} className="evidence-assessment-question__rule">
          {rule.message}
        </p>
      ))}
  </>
);
