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
 * marker: any non-required field outside an "at least one of" rule is marked
 * optional. Fields inside a rule are shown together under the rule's message
 * (see groupFieldsByRule), and required fields carry the native `required`
 * attribute instead.
 */
export const fieldRequirementNote = (
  field: RequirableField,
  rules: readonly AtLeastOneRule[] | undefined,
): string | undefined => {
  if (field.required) return undefined;
  if (rules?.some((rule) => rule.fields.includes(field.key))) return undefined;
  return "optional";
};

export type FieldLayoutItem<F> =
  { kind: "field"; field: F } | { kind: "rule"; message: string; fields: F[] };

/**
 * Lays fields out in order, pulling the fields of each "at least one of"
 * rule together at the position of its first field so they can be shown as
 * one group under the rule's message.
 */
export const groupFieldsByRule = <F extends RequirableField>(
  fields: readonly F[],
  rules: readonly AtLeastOneRule[] | undefined,
): FieldLayoutItem<F>[] => {
  const items: FieldLayoutItem<F>[] = [];
  const placed = new Set<string>();
  for (const field of fields) {
    if (placed.has(field.key)) continue;
    const rule = rules?.find((candidate) =>
      candidate.fields.includes(field.key),
    );
    if (!rule) {
      items.push({ kind: "field", field });
      placed.add(field.key);
      continue;
    }
    const members = fields.filter((candidate) =>
      rule.fields.includes(candidate.key),
    );
    members.forEach((member) => placed.add(member.key));
    items.push({ kind: "rule", message: rule.message, fields: members });
  }
  return items;
};
