import yaml from "js-yaml";
import { MAX_MODEL_YAML_BYTES } from "../../assessment-engine/fetch";
import type { EvidenceModelData } from "./types";

const MAX_GRAPH_DEPTH = 32;
const MAX_GRAPH_NODES = 20_000;
const MAX_COLLECTION_ITEMS = 512;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "string" && value[key] !== "";

const optionalString = (value: Record<string, unknown>, key: string): boolean =>
  value[key] === undefined || typeof value[key] === "string";

const safeHttpUrl = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const safeSourceReference = (value: unknown): boolean =>
  typeof value === "string" &&
  value.length > 0 &&
  (!value.includes(":") || safeHttpUrl(value));

const assertBoundedAcyclicGraph = (root: unknown): void => {
  const seen = new WeakSet<object>();
  let nodes = 0;
  const visit = (value: unknown, depth: number): void => {
    if (typeof value !== "object" || value === null) return;
    if (depth > MAX_GRAPH_DEPTH) {
      throw new Error("The model exceeds the maximum nesting depth.");
    }
    if (seen.has(value)) {
      throw new Error(
        "The model contains aliases or shared object references.",
      );
    }
    seen.add(value);
    nodes += 1;
    if (nodes > MAX_GRAPH_NODES) {
      throw new Error("The model exceeds the object graph safety limit.");
    }
    const children = Array.isArray(value) ? value : Object.values(value);
    if (children.length > MAX_COLLECTION_ITEMS) {
      throw new Error("A model collection exceeds the item safety limit.");
    }
    for (const child of children) visit(child, depth + 1);
  };
  visit(root, 0);
};

const isEvidenceModel = (value: unknown): value is EvidenceModelData => {
  if (!isRecord(value) || !hasString(value, "schemaVersion")) return false;
  const model = value.model;
  const scoring = value.scoring;
  if (!isRecord(model) || !isRecord(scoring) || !Array.isArray(value.levels))
    return false;
  if (
    ![
      "id",
      "name",
      "abbreviation",
      "version",
      "scope",
      "subjectLabel",
      "description",
      "canonicalUrl",
    ].every((key) => hasString(model, key)) ||
    !safeHttpUrl(model.canonicalUrl) ||
    !hasString(scoring, "method") ||
    !Number.isInteger(scoring.minimumLevel) ||
    !Number.isInteger(scoring.maximumLevel) ||
    (scoring.minimumLevel as number) < 0 ||
    (scoring.maximumLevel as number) < (scoring.minimumLevel as number) ||
    (scoring.maximumLevel as number) - (scoring.minimumLevel as number) > 63 ||
    !Array.isArray(scoring.criterionStatuses) ||
    scoring.criterionStatuses.length === 0 ||
    !scoring.criterionStatuses.every(
      (status) => typeof status === "string" && status.length > 0,
    ) ||
    new Set(scoring.criterionStatuses).size !==
      scoring.criterionStatuses.length ||
    !hasString(scoring, "rule")
  ) {
    return false;
  }

  const identifiers = new Set<string>();
  const addIdentifier = (candidate: unknown): boolean => {
    if (typeof candidate !== "string" || candidate.length === 0) return false;
    if (identifiers.has(candidate)) return false;
    identifiers.add(candidate);
    return true;
  };
  const levelNumbers = new Set<number>();
  const levelsValid = value.levels.every((candidate) => {
    if (
      !isRecord(candidate) ||
      !Number.isInteger(candidate.number) ||
      levelNumbers.has(candidate.number as number)
    ) {
      return false;
    }
    levelNumbers.add(candidate.number as number);
    const criteria = candidate.criteria;
    const assessment = candidate.assessment;
    const checklist = candidate.evidenceChecklist;
    if (
      !hasString(candidate, "name") ||
      !hasString(candidate, "title") ||
      typeof candidate.description !== "string" ||
      typeof candidate.summary !== "string" ||
      !safeSourceReference(candidate.sourcePage) ||
      !isRecord(criteria) ||
      typeof criteria.introduction !== "string" ||
      !Array.isArray(criteria.items) ||
      !isRecord(assessment) ||
      typeof assessment.methodology !== "string" ||
      !Array.isArray(assessment.groups) ||
      !isRecord(checklist) ||
      typeof checklist.introduction !== "string" ||
      !Array.isArray(checklist.items)
    ) {
      return false;
    }
    if (
      !criteria.items.every(
        (item) =>
          isRecord(item) && addIdentifier(item.id) && hasString(item, "text"),
      ) ||
      !assessment.groups.every(
        (group) =>
          isRecord(group) &&
          addIdentifier(group.id) &&
          hasString(group, "name") &&
          (group.kind === "assessment" || group.kind === "intake") &&
          optionalString(group, "introduction") &&
          Array.isArray(group.questions) &&
          group.questions.every(
            (question) =>
              isRecord(question) &&
              addIdentifier(question.id) &&
              hasString(question, "question") &&
              optionalString(question, "guidance") &&
              optionalString(question, "expectedInput") &&
              optionalString(question, "purpose"),
          ),
      ) ||
      !checklist.items.every(
        (item) =>
          isRecord(item) && addIdentifier(item.id) && hasString(item, "text"),
      )
    ) {
      return false;
    }
    return true;
  });
  if (!levelsValid) return false;
  for (
    let level = scoring.minimumLevel as number;
    level <= (scoring.maximumLevel as number);
    level += 1
  ) {
    if (!levelNumbers.has(level)) return false;
  }
  return (
    levelNumbers.size ===
    (scoring.maximumLevel as number) - (scoring.minimumLevel as number) + 1
  );
};

export const parseEvidenceModel = (yamlText: string): EvidenceModelData => {
  if (new TextEncoder().encode(yamlText).byteLength > MAX_MODEL_YAML_BYTES) {
    throw new Error("The model exceeds the input safety limit.");
  }
  const parsed = yaml.load(yamlText);
  assertBoundedAcyclicGraph(parsed);
  if (!isEvidenceModel(parsed)) {
    throw new Error(
      "The model does not satisfy the evidence-gated maturity experience contract.",
    );
  }
  return parsed;
};
