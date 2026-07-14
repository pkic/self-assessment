import type { HelpTopicKey } from "./helpTopics";

export interface HelpSection {
  id?: string;
  heading: string;
  body: string;
  list?: string[];
}
export interface HelpTopic {
  title: string;
  self: HelpSection[];
  full: HelpSection[];
}

const LEVELS = [
  "1 Initial — reactive, ad hoc, unpredictable",
  "2 Foundational — case by case; controls often reactive",
  "3 Advanced — organizational standards; proactive",
  "4 Managed — measured and controlled",
  "5 Optimized — continuous improvement",
];

const RATING_LEVELS: HelpSection = {
  id: "rating-levels",
  heading: "The five levels",
  body: "Each level describes how consistently and proactively the requirement is met.",
  list: LEVELS,
};
const APPLICABILITY: HelpSection = {
  id: "applicability",
  heading: "Not applicable vs not assessed",
  body: "Level 0 means not assessed yet. Turn a requirement off only when it genuinely can't apply, and give a reason. Out-of-scope items are excluded from scoring — never counted as 0.",
};

export const HELP_CONTENT: Record<HelpTopicKey, HelpTopic> = {
  rating: {
    title: "Rating a requirement",
    self: [
      {
        heading: "What to do here",
        body: "Pick the level that best matches your PKI today, from your own knowledge — no evidence required.",
      },
      RATING_LEVELS,
      {
        id: "applicability",
        heading: "Not sure?",
        body: "Leave it at level 0 (not assessed) and come back. Mark a category not applicable only if it truly doesn't apply.",
      },
      {
        id: "notes-evidence",
        heading: "Notes",
        body: "Optional. Jot a rationale if it helps you remember why you chose a level.",
      },
      {
        id: "workspace-links",
        heading: "More detail?",
        body: "Switch to Full at the top for an evidence-backed, requirement-level review.",
      },
    ],
    full: [
      {
        heading: "What to do here",
        body: "Rate every in-scope requirement on the 1–5 scale using the guidance and assessment criteria on each card, then record your rationale and the evidence you relied on.",
      },
      RATING_LEVELS,
      APPLICABILITY,
      {
        id: "notes-evidence",
        heading: "Rationale and evidence",
        body: "A full assessment is evidence-backed: capture the documents, links, or ticket references behind each rating so it's defensible in review.",
      },
      {
        id: "workspace-links",
        heading: "Workspace links",
        body: "Attach the point of contact you interviewed and the artifacts you reviewed, so the report can trace each rating to its source.",
      },
    ],
  },
  "extension-rating": {
    title: "Rating an extension category",
    self: [
      {
        heading: "What to do here",
        body: "Extensions assess your PKI through an added lens. Rate each relevant category's level for the extension — there are no per-requirement ratings here.",
      },
      RATING_LEVELS,
      {
        id: "applicability",
        heading: "Not applicable",
        body: "Turn a category off when the extension's lens doesn't apply to it, with a reason. Out-of-scope categories are excluded from the extension score.",
      },
      {
        id: "notes-evidence",
        heading: "Notes",
        body: "Optional rationale for the relevance level you chose.",
      },
      {
        id: "workspace-links",
        heading: "More detail?",
        body: "Switch to Full to record evidence and workspace links at the category level.",
      },
    ],
    full: [
      {
        heading: "What to do here",
        body: "Rate each category's relevance level for this extension, and record rationale and evidence at the category level. Extension categories have no per-requirement rating.",
      },
      RATING_LEVELS,
      {
        id: "applicability",
        heading: "Not applicable",
        body: "Turn a category off when the extension's lens doesn't apply, with a reason. Out-of-scope categories are excluded from the extension score.",
      },
      {
        id: "notes-evidence",
        heading: "Rationale and evidence",
        body: "Capture the documents, links, or references behind each relevance rating.",
      },
      {
        id: "workspace-links",
        heading: "Workspace links",
        body: "Attach the point of contact and artifacts that support the category's relevance rating.",
      },
    ],
  },
  overview: {
    title: "Getting started",
    self: [
      {
        heading: "What this is",
        body: "A quick read on your PKI's maturity across governance, management, operations, and resources.",
      },
      {
        heading: "How it works",
        body: "Rate each category from your own knowledge, then review the report. About 10–15 minutes.",
      },
      {
        heading: "Need help anywhere?",
        body: "Open the ? button (top right) on any screen for guidance right where you are.",
      },
    ],
    full: [
      {
        heading: "What this is",
        body: "An evidence-backed, requirement-level assessment of how well your PKI is governed, managed, operated, and resourced.",
      },
      {
        heading: "The workflow",
        body: "Scope → Workspace → assess each module → Action plans → Evaluation → Report. Plan across several sessions.",
        list: [
          "Scope: choose what applies",
          "Workspace: gather evidence and contacts",
          "Assess: rate requirements",
          "Action plans: plan improvements",
          "Report: share the result",
        ],
      },
      {
        heading: "Need help anywhere?",
        body: "Open the ? button (top right) on any screen for guidance right where you are.",
      },
    ],
  },
  scope: {
    title: "Choosing what's in scope",
    self: [
      {
        heading: "Full assessment only",
        body: "Scope is part of the full assessment. Switch to Full (top of the app) to choose which categories and requirements apply.",
      },
    ],
    full: [
      {
        heading: "What to do here",
        body: "Choose which categories and requirements apply to this assessment. Out-of-scope items are excluded from scoring.",
      },
      {
        heading: "In scope, partial, excluded",
        body: "Use the status pills to include or exclude a module, category, or requirement. Give a reason when you exclude something — it appears in the report.",
      },
      {
        heading: "Templates",
        body: "Save the current scope as a reusable template, or import one from a file, to apply the same scope to future assessments.",
      },
    ],
  },
  workspace: {
    title: "Workspace",
    self: [
      {
        heading: "Full assessment only",
        body: "The Workspace is part of the full assessment — it's where you gather evidence, contacts, and notes before rating requirements. Switch to Full (top of the app) to use it.",
      },
    ],
    full: [
      {
        heading: "What this is",
        body: "Your place to gather everything useful for the assessment. Nothing here affects the maturity score.",
      },
      {
        heading: "Sections",
        body: "Intake questions, working notes, artifacts (documents you review), points of contact, and a checklist.",
        list: [
          "Artifacts and contacts link to requirements via a requirement's Workspace links",
          "Orphaned entries appear when a migration couldn't map old data",
        ],
      },
    ],
  },
  "action-plans": {
    title: "Action plans",
    self: [
      {
        heading: "Full assessment only",
        body: "Action plans are part of the full assessment — plan how you'll raise a category to a higher level. Switch to Full to use them.",
      },
    ],
    full: [
      {
        heading: "What to do here",
        body: "Plan how you'll raise a category to a higher level. Optional, and it doesn't affect the score.",
      },
      {
        heading: "A plan",
        body: "Pick a category, set a target level, and add objectives, tasks, outputs, a responsible contact, and a target date.",
      },
    ],
  },
  evaluation: {
    title: "Evaluation",
    self: [
      {
        heading: "Full assessment only",
        body: "The Evaluation dashboard is part of the full assessment — a read-only view of your results, coverage, and gaps. Switch to Full to see it.",
      },
    ],
    full: [
      {
        heading: "What this is",
        body: "A read-only summary of your results — nothing here is editable.",
      },
      {
        heading: "What it shows",
        body: "Maturity summary, completeness, scope coverage, the level-distribution matrix, gap-to-next-level, and an optional comparison to a baseline assessment.",
      },
    ],
  },
  report: {
    title: "Reports and sharing",
    self: [
      {
        heading: "Your report",
        body: "See your overall maturity and per-module levels. Not Assessed and Not Applicable categories are excluded from the calculation.",
      },
      {
        heading: "Share or export",
        body: "Share progress via a link, download the assessment as a YAML file to back it up or move it, or export a PDF.",
      },
    ],
    full: [
      {
        heading: "Report types",
        body: "Choose Attestation, Assessment, Detailed, or a Custom PDF. Attestation is a shareable one-pager; Detailed includes per-requirement results.",
      },
      {
        heading: "Share vs download vs PDF",
        body: "Download the YAML to back up or move the full assessment (it carries everything). A share link carries ratings only — notes and evidence stay in the file.",
      },
      {
        heading: "What's excluded",
        body: "Not Assessed and Not Applicable categories are excluded from the maturity calculation.",
      },
    ],
  },
  extensions: {
    title: "Extensions",
    self: [
      {
        heading: "What this is",
        body: "Extensions assess your PKI through an added lens (for example, post-quantum readiness).",
      },
      {
        heading: "Browser-managed",
        body: "Upload an extension file here; it's stored only in this browser and is never fetched from the network. Remove it here too.",
      },
      {
        heading: "Compatibility",
        body: "An extension must be compatible with the loaded model version. Incompatible ones show a badge and can't be enabled.",
      },
    ],
    full: [
      {
        heading: "What this is",
        body: "Extensions assess your PKI through an added lens (for example, post-quantum readiness).",
      },
      {
        heading: "Browser-managed",
        body: "Upload an extension file here; it's stored only in this browser and is never fetched from the network. Remove it here too.",
      },
      {
        heading: "Enable vs select",
        body: "Enabling an extension includes it in scoring; selecting it as the active target switches the app to assess through that lens.",
      },
    ],
  },
  assessments: {
    title: "Your assessments",
    self: [
      {
        heading: "What this is",
        body: "Manage multiple assessments — create, rename, duplicate, or delete them. All are stored only in this browser.",
      },
      {
        heading: "Move and restore",
        body: "Download an assessment as YAML to back it up or open it in another browser; use History to restore an earlier revision.",
      },
    ],
    full: [
      {
        heading: "What this is",
        body: "Manage multiple assessments — create, rename, duplicate, or delete them. All are stored only in this browser.",
      },
      {
        heading: "Move and restore",
        body: "Download an assessment as YAML to back it up or open it in another browser; use History to restore an earlier revision.",
      },
    ],
  },
  workflow: {
    title: "The workflow",
    self: [
      {
        heading: "Quick self-assessment",
        body: "Rate each category, then open the Report tab to see your maturity. That's it.",
      },
    ],
    full: [
      {
        heading: "Full assessment",
        body: "Scope what applies, gather evidence in the Workspace, rate each module's requirements, plan improvements in Action plans, review the Evaluation dashboard, then produce a Report.",
      },
    ],
  },
  glossary: {
    title: "Glossary",
    self: [
      {
        heading: "Terms",
        body: "Key terms used across the assessment.",
        list: [
          "Maturity level — 0 Not Assessed, -1/NA Not Applicable, 1–5 Initial…Optimized",
          "Category — a group of related requirements within a module",
          "Requirement — a single assessable statement",
          "In scope / out of scope — whether an item counts toward the score",
          "Applicability — whether an item can apply at all (off = excluded, not zero)",
          "Extension — an added assessment lens with its own relevance and scoring",
          "Action plan — an optional improvement plan for a category",
          "Revision — an automatic snapshot you can restore",
        ],
      },
    ],
    full: [
      {
        heading: "Terms",
        body: "Key terms used across the assessment.",
        list: [
          "Maturity level — 0 Not Assessed, -1/NA Not Applicable, 1–5 Initial…Optimized",
          "Category / requirement — a requirement is one assessable statement; a category groups them",
          "Effective level — a category's level derived from its requirement ratings",
          "Weight — a requirement's relative contribution to its category",
          "In scope / applicability — out-of-scope and not-applicable items are excluded from scoring, never zero",
          "Extension / relevance / overlay / floor score — an added lens, its per-category relevance, weight modifiers, and minimum score",
          "Workspace, POC, artifact — evidence-gathering space, a contact, a reviewed document",
          "Revision / transient assessment — an automatic snapshot; a link-loaded assessment held in memory only",
        ],
      },
    ],
  },
  faq: {
    title: "FAQ",
    self: [
      {
        heading: "Common questions",
        body: "Short answers to frequent questions.",
        list: [
          "Where is my data? Only in this browser — nothing is sent externally.",
          "Self vs Full? Self is a quick read; Full is evidence-backed. Switch at the top.",
          "Does Not Applicable hurt my score? No — excluded items don't count against you.",
          "Move to another browser? Download the assessment as YAML and open it there.",
          "Can I share a link? Yes — a link carries ratings only; the YAML carries everything.",
        ],
      },
    ],
    full: [
      {
        heading: "Common questions",
        body: "Short answers to frequent questions.",
        list: [
          "Where is my data? Only in this browser — nothing is sent externally.",
          "Why didn't my level change when I rated a requirement? Check scope and completeness — unrated or out-of-scope items are excluded.",
          "Not Applicable vs Not Assessed? Not Applicable is excluded from scoring; Not Assessed is level 0 and pending.",
          "Move to another browser? Download the assessment as YAML and open it there.",
          "What are extensions and where do they come from? Added lenses you upload here; they're stored only in this browser.",
        ],
      },
    ],
  },
};
