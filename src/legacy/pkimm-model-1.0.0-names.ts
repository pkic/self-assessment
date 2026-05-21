/** Bundled snapshot of the released PKIMM 1.0.0 model's category and
 *  requirement names, indexed by the progress keys used by the released
 *  1.0.0 widget. Used to populate `StructureSnapshot.byKey` when migrating
 *  legacy unversioned data (localStorage or YAML export) into the new
 *  storage shape. */
import type { StructureSnapshot } from "../types/types";

/** Grouped by category to keep each `moduleId` + `categoryName` pair stated
 *  exactly once. Each group is `[moduleId, categoryName, [categoryKey,
 *  [requirementKey, requirementName]...]]`. */
const CATEGORIES: Array<[string, string, string, Array<[string, string]>]> = [
  [
    "G",
    "Strategy and Vision",
    "G.1",
    [
      ["G.1.1", "Organizational sponsor and support"],
      ["G.1.2", "Formal assignment of responsible leadership"],
      ["G.1.3", "Scope and business drivers for PKI"],
      ["G.1.4", "Architecture and design of the PKI"],
    ],
  ],
  [
    "G",
    "Policies and documentation",
    "G.2",
    [
      ["G.2.1", "he scope of policies is defined and documented"],
      ["G.2.2", "Certificate policy is documented and published"],
      ["G.2.3", "Certification practice statement is documented and published"],
      ["G.2.4", "Disclosure statement is documented and published"],
      ["G.2.5", "Policies are periodically reviewed and updated"],
    ],
  ],
  [
    "G",
    "Compliance",
    "G.3",
    [
      [
        "G.3.1",
        "Compliance policies are defined, implemented, and communicated",
      ],
      [
        "G.3.2",
        "A program to monitor compliance with the policies is established",
      ],
      [
        "G.3.3",
        "Responsibilities for the compliance are formally defined and assigned",
      ],
      [
        "G.3.4",
        "List of relevant laws, regulations, and standards, exist and is maintained",
      ],
    ],
  ],
  [
    "G",
    "Processes and procedures",
    "G.4",
    [
      ["G.4.1", "Scope of processes and procedure is aligned with policies"],
      [
        "G.4.2",
        "Processes and procedures are formally documented and followed",
      ],
      ["G.4.3", "Recurring activities are executed on time"],
      ["G.4.4", "Evidence from procedures is collected and maintained"],
      ["G.4.5", "Processes and procedures are reviewed and updated"],
    ],
  ],
  [
    "M",
    "Key management",
    "M.5",
    [
      [
        "M.5.1",
        "Key management roles and responsibilities are documented and formally assigned",
      ],
      ["M.5.2", "Inventory of cryptographic keys is documented and maintained"],
      [
        "M.5.3",
        "Inventory of cryptographic devices is documented and maintained",
      ],
      [
        "M.5.4",
        "Each cryptographic key is defined and has documented lifecycle procedures",
      ],
      [
        "M.5.5",
        "Cryptographic cipher suites and protocols are documented and maintained",
      ],
      ["M.5.6", "Key management is periodically reviewed and updated"],
    ],
  ],
  [
    "M",
    "Certificate management",
    "M.6",
    [
      ["M.6.1", "Certificate profiles are documented"],
      ["M.6.2", "Certificate cipher suites are documented"],
      ["M.6.3", "Certificate lifecycle management is documented"],
      ["M.6.4", "Inventory of issued certificates is documented"],
      ["M.6.5", "Certificate discovery process is documented"],
      ["M.6.6", "Certificate management is periodically reviewed and updated"],
      ["M.6.7", "Organizational PKI governance"],
    ],
  ],
  [
    "M",
    "Infrastructure management",
    "M.7",
    [
      ["M.7.1", "Network and deployment infrastructure is documented"],
      ["M.7.2", "Separation and segmentation principles are applied"],
      [
        "M.7.3",
        "Network vulnerability management is implemented and maintained",
      ],
      ["M.7.4", "Infrastructure recovery objectives controls"],
      ["M.7.5", "Infrastructure activities are periodically reviewed"],
    ],
  ],
  [
    "M",
    "Change management and agility",
    "M.8",
    [
      ["M.8.1", "The policy for change management and agility is documented"],
      ["M.8.2", "Request for change structure is documented and followed"],
      ["M.8.3", "The change management process is documented and implemented"],
      ["M.8.4", "Requirements for agility are identified"],
      ["M.8.5", "Change management and agility is periodically reviewed"],
    ],
  ],
  [
    "O",
    "Resilience",
    "O.9",
    [
      ["O.9.1", "Risk assessment and business impact analysis"],
      ["O.9.2", "Cyber-security management and incident planning"],
      ["O.9.3", "Business continuity planning and disaster recovery"],
      ["O.9.4", "Technology future proofing"],
      ["O.9.5", "Competence and information sharing"],
      ["O.9.6", "Continual review and improvement"],
    ],
  ],
  [
    "O",
    "Automation",
    "O.10",
    [
      ["O.10.1", "Process automation description"],
      ["O.10.2", "Monitoring and auditing of automated process"],
      ["O.10.3", "Incidents and exceptions handling"],
    ],
  ],
  [
    "O",
    "Interoperability",
    "O.11",
    [
      ["O.11.1", "Maintain PKI interoperability strategy"],
      ["O.11.2", "Documented integration guidance"],
      ["O.11.3", "Adoption and application of open standards"],
    ],
  ],
  [
    "O",
    "Monitoring and auditing",
    "O.12",
    [
      [
        "O.12.1",
        "Monitoring events and logging requirements are defined and documented",
      ],
      ["O.12.2", "Event logs from systems are collected"],
      ["O.12.3", "Audit trail can be reconstructed from audit logs"],
      [
        "O.12.4",
        "Monitoring of operational and security events is implemented",
      ],
      [
        "O.12.5",
        "Critical events are immediately alerted and resolved according to incident response plans",
      ],
      ["O.12.6", "Review of events and logs is periodically performed"],
    ],
  ],
  [
    "R",
    "Sourcing",
    "R.13",
    [
      ["R.13.1", "Resources are identified and documented"],
      ["R.13.2", "Resources are clearly defined"],
      ["R.13.3", "Availability of resources"],
      ["R.13.4", "Resources are periodically reviewed"],
    ],
  ],
  [
    "R",
    "Knowledge and training",
    "R.14",
    [
      ["R.14.1", "Establish training plan"],
      ["R.14.2", "Responsible personnel receive training"],
      ["R.14.3", "Perform security awareness training"],
      ["R.14.4", "Establish education plan"],
      ["R.14.5", "Periodically review knowledge"],
    ],
  ],
  [
    "R",
    "Awareness",
    "R.15",
    [
      ["R.15.1", "Establish and maintain awareness plan"],
      ["R.15.2", "Disclose PKI information"],
      ["R.15.3", "Establish single point of contact"],
      ["R.15.4", "Timely communication of important information"],
    ],
  ],
];

export const PKIMM_1_0_0_NAMES: StructureSnapshot["byKey"] = (() => {
  const out: StructureSnapshot["byKey"] = {};
  for (const [
    moduleId,
    categoryName,
    categoryKey,
    requirements,
  ] of CATEGORIES) {
    out[categoryKey] = { moduleId, categoryName };
    for (const [requirementKey, requirementName] of requirements) {
      out[requirementKey] = { moduleId, categoryName, requirementName };
    }
  }
  return out;
})();
