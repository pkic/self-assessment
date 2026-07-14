export interface OverviewGuidance {
  heading: string;
  intro: string;
  steps: string[];
  time: string;
  needs: string;
  note: string;
}

export const MATURITY_LEVELS: {
  num: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
}[] = [
  {
    num: 1,
    name: "Initial",
    description: "Unpredictable, poorly controlled, always reactive",
  },
  {
    num: 2,
    name: "Foundational",
    description: "Case-by-case; controls often reactive",
  },
  {
    num: 3,
    name: "Advanced",
    description: "Organizational standards; proactive control",
  },
  {
    num: 4,
    name: "Managed",
    description: "Measured and controlled; proactive",
  },
  {
    num: 5,
    name: "Optimized",
    description: "Continuous improvement; future-focused",
  },
];

export const RESOURCES: { title: string; url: string; description: string }[] =
  [
    {
      title: "PKI maturity model",
      url: "https://pkic.org/wg/pkimm/model/",
      description: "Model definition and assessment process.",
    },
    {
      title: "Categories description",
      url: "https://pkic.org/wg/pkimm/categories/",
      description: "Requirements, guidance, and references.",
    },
    {
      title: "Assessment process",
      url: "https://pkic.org/wg/pkimm/assessment/",
      description: "How the assessment works.",
    },
    {
      title: "Assessment tools",
      url: "https://pkic.org/wg/pkimm/tools/",
      description: "Tools for assessing your PKI.",
    },
    {
      title: "Extension framework",
      url: "https://pkic.org/wg/pkimm/extensions/",
      description: "Assess through an added lens.",
    },
    {
      title: "Community discussion",
      url: "https://github.com/orgs/pkic/discussions/categories/pki-maturity-model-pkimm",
      description: "Ideas, questions, and feedback.",
    },
  ];

export const PRIVACY_NOTE =
  "Everything stays in this browser — nothing is sent or stored externally. Export a file to back up or move your assessment.";

// View-agnostic pointer to the always-available Help panel — rendered once,
// the same in both self and full view, so it isn't part of OVERVIEW_GUIDANCE.
export const HELP_POINTER_NOTE =
  "Need help on any screen? Open the ? button (top right) for guidance right where you are.";

export const OVERVIEW_GUIDANCE: Record<"self" | "full", OverviewGuidance> = {
  self: {
    heading: "How the quick self-assessment works",
    intro:
      "Get a quick read on your PKI's maturity across governance, management, operations, and resources.",
    steps: ["Rate categories", "Review report"],
    time: "~10–15 minutes.",
    needs: "Familiarity with your PKI — no evidence required.",
    note: "This is a starting point. For a rigorous, evidence-backed assessment, switch to Full at the top.",
  },
  full: {
    heading: "How the full assessment works",
    intro:
      "Assess how well your PKI is governed, managed, operated, and resourced — with an evidence-backed, requirement-level review.",
    steps: ["Scope", "Workspace", "Assess", "Action plans", "Report"],
    time: "A few hours — plan across several sessions.",
    needs: "PKI documentation, points of contact for interviews, and evidence.",
    note: "A full assessment is typically run by an assessor who gathers evidence and interviews the PKI's owners.",
  },
};
