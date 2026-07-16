import type {
  Assessment,
  Workspace,
  RequirementProgress,
} from "../types/types";

export const isDefaultRequirementProgress = (
  rp: RequirementProgress | undefined,
): boolean =>
  !rp ||
  (rp.level === 0 && rp.applicability !== false && !rp.notes && !rp.evidence);

const artifacts = (ws?: Workspace) => ws?.artifacts ?? [];
const pocs = (ws?: Workspace) => ws?.pocs ?? [];
const checklist = (ws?: Workspace) => ws?.checklist ?? [];
const intake = (ws?: Workspace) => ws?.intake ?? [];

export const addArtifact: (
  ws: Workspace | undefined,
  a: { id: string; title: string; locator: string; notes?: string },
) => Workspace = (ws, a) => ({ ...ws, artifacts: [...artifacts(ws), a] });
export const updateArtifact: (
  ws: Workspace | undefined,
  id: string,
  patch: Partial<{ title: string; locator: string; notes: string }>,
) => Workspace = (ws, id, patch) => ({
  ...ws,
  artifacts: artifacts(ws).map((x) => (x.id === id ? { ...x, ...patch } : x)),
});
export const removeArtifact: (
  ws: Workspace | undefined,
  id: string,
) => Workspace = (ws, id) => ({
  ...ws,
  artifacts: artifacts(ws).filter((x) => x.id !== id),
});

export const addPoc: (
  ws: Workspace | undefined,
  p: { id: string; name: string; role?: string; contact?: string },
) => Workspace = (ws, p) => ({ ...ws, pocs: [...pocs(ws), p] });
export const updatePoc: (
  ws: Workspace | undefined,
  id: string,
  patch: Partial<{ name: string; role: string; contact: string }>,
) => Workspace = (ws, id, patch) => ({
  ...ws,
  pocs: pocs(ws).map((x) => (x.id === id ? { ...x, ...patch } : x)),
});
export const removePoc: (ws: Workspace | undefined, id: string) => Workspace = (
  ws,
  id,
) => ({ ...ws, pocs: pocs(ws).filter((x) => x.id !== id) });

export const addChecklistItem: (
  ws: Workspace | undefined,
  item: { itemId: string; label: string; group?: string; notes?: string },
) => Workspace = (ws, item) => ({
  ...ws,
  checklist: [...checklist(ws), { ...item, done: false, custom: true }],
});
export const updateChecklistItem: (
  ws: Workspace | undefined,
  itemId: string,
  patch: Partial<{ label: string; group: string; notes: string }>,
) => Workspace = (ws, itemId, patch) => ({
  ...ws,
  checklist: checklist(ws).map((x) =>
    x.itemId === itemId ? { ...x, ...patch } : x,
  ),
});
export const toggleChecklistItem: (
  ws: Workspace | undefined,
  itemId: string,
) => Workspace = (ws, itemId) => ({
  ...ws,
  checklist: checklist(ws).map((x) =>
    x.itemId === itemId ? { ...x, done: !x.done } : x,
  ),
});
export const removeChecklistItem: (
  ws: Workspace | undefined,
  itemId: string,
) => Workspace = (ws, itemId) => ({
  ...ws,
  checklist: checklist(ws).filter((x) => x.itemId !== itemId),
});

export const addIntakeItem: (
  ws: Workspace | undefined,
  item: { questionId: string; question: string; answer: string },
) => Workspace = (ws, item) => ({ ...ws, intake: [...intake(ws), item] });
export const updateIntakeItem: (
  ws: Workspace | undefined,
  questionId: string,
  patch: Partial<{ question: string; answer: string }>,
) => Workspace = (ws, questionId, patch) => ({
  ...ws,
  intake: intake(ws).map((x) =>
    x.questionId === questionId ? { ...x, ...patch } : x,
  ),
});
export const removeIntakeItem: (
  ws: Workspace | undefined,
  questionId: string,
) => Workspace = (ws, questionId) => ({
  ...ws,
  intake: intake(ws).filter((x) => x.questionId !== questionId),
});

export const setWorkingNotes: (
  ws: Workspace | undefined,
  notes: string,
) => Workspace = (ws, notes) => ({ ...ws, workingNotes: notes });

export const rescueOrphanedEntry = (
  a: Assessment,
  originalKey: string,
  targetRequirementKey: string,
): Assessment => {
  const entry = a.workspace?.orphanedEntries?.find(
    (e) => e.originalKey === originalKey,
  );
  if (!entry) return a;
  return {
    ...a,
    requirementProgress: {
      ...a.requirementProgress,
      [targetRequirementKey]: entry.payload,
    },
    workspace: {
      ...a.workspace,
      orphanedEntries: (a.workspace?.orphanedEntries ?? []).filter(
        (e) => e.originalKey !== originalKey,
      ),
    },
  };
};

export const discardOrphanedEntry = (
  a: Assessment,
  originalKey: string,
): Assessment => ({
  ...a,
  workspace: {
    ...a.workspace,
    orphanedEntries: (a.workspace?.orphanedEntries ?? []).filter(
      (e) => e.originalKey !== originalKey,
    ),
  },
});

export const SUGGESTED_INTAKE_QUESTIONS: string[] = [
  "Which PKI best describes your scope? (single CA, multiple CA, federated, hybrid)",
  "How many hours per week will be dedicated to the assessment?",
  "How many CAs and issuing systems are in scope?",
  "Which teams operate and govern the PKI?",
  "How will evidence be provided? (read-only accounts, escorted review, document share)",
  "What is the target completion date or timeline?",
];

export const SUGGESTED_CHECKLIST_TASKS: string[] = [
  "Hold kickoff meeting with PKI management",
  "Complete the Scope section",
  "Identify points of contact for each requirement",
  "Agree communication method and response-time expectations",
  "Agree evidence and artifact review method",
  "Set key dates and assessment pace",
  "Deliver the assessor briefing (purpose, scope, activities, dates)",
  "Send a follow-up email reinforcing the briefing",
];

const normalizeText = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ");

export const loadSuggestedIntake: (
  ws: Workspace | undefined,
  makeId: () => string,
) => Workspace = (ws, makeId) => {
  const existing = new Set(intake(ws).map((i) => normalizeText(i.question)));
  const additions = SUGGESTED_INTAKE_QUESTIONS.filter(
    (q) => !existing.has(normalizeText(q)),
  ).map((question) => ({ questionId: makeId(), question, answer: "" }));
  return { ...ws, intake: [...intake(ws), ...additions] };
};

export const loadSuggestedChecklist: (
  ws: Workspace | undefined,
  makeId: () => string,
) => Workspace = (ws, makeId) => {
  const existing = new Set(checklist(ws).map((c) => normalizeText(c.label)));
  const additions = SUGGESTED_CHECKLIST_TASKS.filter(
    (l) => !existing.has(normalizeText(l)),
  ).map((label) => ({ itemId: makeId(), label, done: false, custom: true }));
  return { ...ws, checklist: [...checklist(ws), ...additions] };
};
