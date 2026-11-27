import React from "react";
import { validAssessmentFormat } from "../../assessment-engine/subject-validation";
import type {
  AssessmentProfileData,
  AssessmentSubjectField,
  AssessmentSubjectGroup,
} from "../../assessment-engine/types";
import { fieldRequirementNote, groupFieldsByRule } from "./fieldRequirement";
import { SubjectField } from "./SubjectField";

interface Props {
  profile: AssessmentProfileData;
  subject: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

interface ResolvedGroup {
  id: string;
  label?: string;
  description?: string;
  fields: AssessmentSubjectField[];
}

/**
 * The profile's subject groups in order, with any field the groups leave out
 * gathered in a final unlabelled group. Without groups, every field is in one.
 */
const resolveGroups = (profile: AssessmentProfileData): ResolvedGroup[] => {
  const byKey = new Map(
    profile.runtime.subjectFields.map((field) => [field.key, field]),
  );
  const declared: AssessmentSubjectGroup[] =
    profile.runtime.subjectGroups ?? [];
  const groups: ResolvedGroup[] = declared.map((group) => ({
    id: group.id,
    label: group.label,
    description: group.description,
    fields: group.fields
      .map((key) => byKey.get(key))
      .filter((field): field is AssessmentSubjectField => Boolean(field)),
  }));
  const grouped = new Set(declared.flatMap((group) => group.fields));
  const rest = profile.runtime.subjectFields.filter(
    (field) => !grouped.has(field.key),
  );
  if (rest.length > 0) groups.push({ id: "other", fields: rest });
  return groups;
};

const formatError = (
  field: AssessmentSubjectField,
  subject: Record<string, string>,
): string | undefined => {
  const value = subject[field.key]?.trim() ?? "";
  return validAssessmentFormat(field.format, value)
    ? undefined
    : `This is not a valid ${field.label}.`;
};

/**
 * The assessment scope as labelled groups. A group whose fields are exactly
 * one "at least one of" rule carries the rule as its description; elsewhere
 * a rule's fields are boxed together under the rule's message.
 */
export const ScopeForm: React.FC<Props> = ({ profile, subject, onChange }) => {
  const rules = profile.runtime.subjectRules ?? [];
  const renderField = (field: AssessmentSubjectField, note?: string) => (
    <SubjectField
      key={field.key}
      field={field}
      subject={subject}
      labelNote={note}
      error={formatError(field, subject)}
      onChange={onChange}
    />
  );

  return (
    <div className="evidence-scope">
      {resolveGroups(profile).map((group) => {
        const groupRule = rules.find(
          (rule) =>
            rule.fields.length === group.fields.length &&
            group.fields.every((field) => rule.fields.includes(field.key)),
        );
        const description = group.description ?? groupRule?.message;
        const items = groupRule
          ? group.fields.map((field) => ({ kind: "field" as const, field }))
          : groupFieldsByRule(group.fields, rules);
        const body = items.map((item) => {
          if (item.kind === "rule") {
            return (
              <fieldset key={item.message} className="evidence-field-group">
                <legend>{item.message}</legend>
                {item.fields.map((field) => renderField(field))}
              </fieldset>
            );
          }
          const note = groupRule
            ? undefined
            : fieldRequirementNote(item.field, rules);
          return renderField(item.field, note);
        });
        if (!group.label) {
          return (
            <div key={group.id} className="evidence-scope__fields">
              {body}
            </div>
          );
        }
        return (
          <fieldset key={group.id} className="evidence-scope__group">
            <legend>{group.label}</legend>
            {description ? (
              <p className="evidence-scope__description">{description}</p>
            ) : null}
            <div className="evidence-scope__fields">{body}</div>
          </fieldset>
        );
      })}
    </div>
  );
};
