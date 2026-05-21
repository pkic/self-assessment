/** Bundled snapshot of the released PKIMM 1.0.0 model's category and
 *  requirement names, indexed by the progress keys used by the released
 *  1.0.0 widget. Used to populate `StructureSnapshot.byKey` when migrating
 *  legacy unversioned data (localStorage or YAML export) into the new
 *  storage shape. */
import type { StructureSnapshot } from "../types/types";

export const PKIMM_1_0_0_NAMES: StructureSnapshot["byKey"] = {
  "G.1": { moduleId: "G", categoryName: "Strategy and Vision" },
  "G.1.1": {
    moduleId: "G",
    categoryName: "Strategy and Vision",
    requirementName: "Organizational sponsor and support",
  },
  "G.1.2": {
    moduleId: "G",
    categoryName: "Strategy and Vision",
    requirementName: "Formal assignment of responsible leadership",
  },
  "G.1.3": {
    moduleId: "G",
    categoryName: "Strategy and Vision",
    requirementName: "Scope and business drivers for PKI",
  },
  "G.1.4": {
    moduleId: "G",
    categoryName: "Strategy and Vision",
    requirementName: "Architecture and design of the PKI",
  },
  "G.2": { moduleId: "G", categoryName: "Policies and documentation" },
  "G.2.1": {
    moduleId: "G",
    categoryName: "Policies and documentation",
    requirementName: "he scope of policies is defined and documented",
  },
  "G.2.2": {
    moduleId: "G",
    categoryName: "Policies and documentation",
    requirementName: "Certificate policy is documented and published",
  },
  "G.2.3": {
    moduleId: "G",
    categoryName: "Policies and documentation",
    requirementName:
      "Certification practice statement is documented and published",
  },
  "G.2.4": {
    moduleId: "G",
    categoryName: "Policies and documentation",
    requirementName: "Disclosure statement is documented and published",
  },
  "G.2.5": {
    moduleId: "G",
    categoryName: "Policies and documentation",
    requirementName: "Policies are periodically reviewed and updated",
  },
  "G.3": { moduleId: "G", categoryName: "Compliance" },
  "G.3.1": {
    moduleId: "G",
    categoryName: "Compliance",
    requirementName:
      "Compliance policies are defined, implemented, and communicated",
  },
  "G.3.2": {
    moduleId: "G",
    categoryName: "Compliance",
    requirementName:
      "A program to monitor compliance with the policies is established",
  },
  "G.3.3": {
    moduleId: "G",
    categoryName: "Compliance",
    requirementName:
      "Responsibilities for the compliance are formally defined and assigned",
  },
  "G.3.4": {
    moduleId: "G",
    categoryName: "Compliance",
    requirementName:
      "List of relevant laws, regulations, and standards, exist and is maintained",
  },
  "G.4": { moduleId: "G", categoryName: "Processes and procedures" },
  "G.4.1": {
    moduleId: "G",
    categoryName: "Processes and procedures",
    requirementName:
      "Scope of processes and procedure is aligned with policies",
  },
  "G.4.2": {
    moduleId: "G",
    categoryName: "Processes and procedures",
    requirementName:
      "Processes and procedures are formally documented and followed",
  },
  "G.4.3": {
    moduleId: "G",
    categoryName: "Processes and procedures",
    requirementName: "Recurring activities are executed on time",
  },
  "G.4.4": {
    moduleId: "G",
    categoryName: "Processes and procedures",
    requirementName: "Evidence from procedures is collected and maintained",
  },
  "G.4.5": {
    moduleId: "G",
    categoryName: "Processes and procedures",
    requirementName: "Processes and procedures are reviewed and updated",
  },
  "M.5": { moduleId: "M", categoryName: "Key management" },
  "M.5.1": {
    moduleId: "M",
    categoryName: "Key management",
    requirementName:
      "Key management roles and responsibilities are documented and formally assigned",
  },
  "M.5.2": {
    moduleId: "M",
    categoryName: "Key management",
    requirementName:
      "Inventory of cryptographic keys is documented and maintained",
  },
  "M.5.3": {
    moduleId: "M",
    categoryName: "Key management",
    requirementName:
      "Inventory of cryptographic devices is documented and maintained",
  },
  "M.5.4": {
    moduleId: "M",
    categoryName: "Key management",
    requirementName:
      "Each cryptographic key is defined and has documented lifecycle procedures",
  },
  "M.5.5": {
    moduleId: "M",
    categoryName: "Key management",
    requirementName:
      "Cryptographic cipher suites and protocols are documented and maintained",
  },
  "M.5.6": {
    moduleId: "M",
    categoryName: "Key management",
    requirementName: "Key management is periodically reviewed and updated",
  },
  "M.6": { moduleId: "M", categoryName: "Certificate management" },
  "M.6.1": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName: "Certificate profiles are documented",
  },
  "M.6.2": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName: "Certificate cipher suites are documented",
  },
  "M.6.3": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName: "Certificate lifecycle management is documented",
  },
  "M.6.4": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName: "Inventory of issued certificates is documented",
  },
  "M.6.5": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName: "Certificate discovery process is documented",
  },
  "M.6.6": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName:
      "Certificate management is periodically reviewed and updated",
  },
  "M.6.7": {
    moduleId: "M",
    categoryName: "Certificate management",
    requirementName: "Organizational PKI governance",
  },
  "M.7": { moduleId: "M", categoryName: "Infrastructure management" },
  "M.7.1": {
    moduleId: "M",
    categoryName: "Infrastructure management",
    requirementName: "Network and deployment infrastructure is documented",
  },
  "M.7.2": {
    moduleId: "M",
    categoryName: "Infrastructure management",
    requirementName: "Separation and segmentation principles are applied",
  },
  "M.7.3": {
    moduleId: "M",
    categoryName: "Infrastructure management",
    requirementName:
      "Network vulnerability management is implemented and maintained",
  },
  "M.7.4": {
    moduleId: "M",
    categoryName: "Infrastructure management",
    requirementName: "Infrastructure recovery objectives controls",
  },
  "M.7.5": {
    moduleId: "M",
    categoryName: "Infrastructure management",
    requirementName: "Infrastructure activities are periodically reviewed",
  },
  "M.8": { moduleId: "M", categoryName: "Change management and agility" },
  "M.8.1": {
    moduleId: "M",
    categoryName: "Change management and agility",
    requirementName:
      "The policy for change management and agility is documented",
  },
  "M.8.2": {
    moduleId: "M",
    categoryName: "Change management and agility",
    requirementName: "Request for change structure is documented and followed",
  },
  "M.8.3": {
    moduleId: "M",
    categoryName: "Change management and agility",
    requirementName:
      "The change management process is documented and implemented",
  },
  "M.8.4": {
    moduleId: "M",
    categoryName: "Change management and agility",
    requirementName: "Requirements for agility are identified",
  },
  "M.8.5": {
    moduleId: "M",
    categoryName: "Change management and agility",
    requirementName: "Change management and agility is periodically reviewed",
  },
  "O.9": { moduleId: "O", categoryName: "Resilience" },
  "O.9.1": {
    moduleId: "O",
    categoryName: "Resilience",
    requirementName: "Risk assessment and business impact analysis",
  },
  "O.9.2": {
    moduleId: "O",
    categoryName: "Resilience",
    requirementName: "Cyber-security management and incident planning",
  },
  "O.9.3": {
    moduleId: "O",
    categoryName: "Resilience",
    requirementName: "Business continuity planning and disaster recovery",
  },
  "O.9.4": {
    moduleId: "O",
    categoryName: "Resilience",
    requirementName: "Technology future proofing",
  },
  "O.9.5": {
    moduleId: "O",
    categoryName: "Resilience",
    requirementName: "Competence and information sharing",
  },
  "O.9.6": {
    moduleId: "O",
    categoryName: "Resilience",
    requirementName: "Continual review and improvement",
  },
  "O.10": { moduleId: "O", categoryName: "Automation" },
  "O.10.1": {
    moduleId: "O",
    categoryName: "Automation",
    requirementName: "Process automation description",
  },
  "O.10.2": {
    moduleId: "O",
    categoryName: "Automation",
    requirementName: "Monitoring and auditing of automated process",
  },
  "O.10.3": {
    moduleId: "O",
    categoryName: "Automation",
    requirementName: "Incidents and exceptions handling",
  },
  "O.11": { moduleId: "O", categoryName: "Interoperability" },
  "O.11.1": {
    moduleId: "O",
    categoryName: "Interoperability",
    requirementName: "Maintain PKI interoperability strategy",
  },
  "O.11.2": {
    moduleId: "O",
    categoryName: "Interoperability",
    requirementName: "Documented integration guidance",
  },
  "O.11.3": {
    moduleId: "O",
    categoryName: "Interoperability",
    requirementName: "Adoption and application of open standards",
  },
  "O.12": { moduleId: "O", categoryName: "Monitoring and auditing" },
  "O.12.1": {
    moduleId: "O",
    categoryName: "Monitoring and auditing",
    requirementName:
      "Monitoring events and logging requirements are defined and documented",
  },
  "O.12.2": {
    moduleId: "O",
    categoryName: "Monitoring and auditing",
    requirementName: "Event logs from systems are collected",
  },
  "O.12.3": {
    moduleId: "O",
    categoryName: "Monitoring and auditing",
    requirementName: "Audit trail can be reconstructed from audit logs",
  },
  "O.12.4": {
    moduleId: "O",
    categoryName: "Monitoring and auditing",
    requirementName:
      "Monitoring of operational and security events is implemented",
  },
  "O.12.5": {
    moduleId: "O",
    categoryName: "Monitoring and auditing",
    requirementName:
      "Critical events are immediately alerted and resolved according to incident response plans",
  },
  "O.12.6": {
    moduleId: "O",
    categoryName: "Monitoring and auditing",
    requirementName: "Review of events and logs is periodically performed",
  },
  "R.13": { moduleId: "R", categoryName: "Sourcing" },
  "R.13.1": {
    moduleId: "R",
    categoryName: "Sourcing",
    requirementName: "Resources are identified and documented",
  },
  "R.13.2": {
    moduleId: "R",
    categoryName: "Sourcing",
    requirementName: "Resources are clearly defined",
  },
  "R.13.3": {
    moduleId: "R",
    categoryName: "Sourcing",
    requirementName: "Availability of resources",
  },
  "R.13.4": {
    moduleId: "R",
    categoryName: "Sourcing",
    requirementName: "Resources are periodically reviewed",
  },
  "R.14": { moduleId: "R", categoryName: "Knowledge and training" },
  "R.14.1": {
    moduleId: "R",
    categoryName: "Knowledge and training",
    requirementName: "Establish training plan",
  },
  "R.14.2": {
    moduleId: "R",
    categoryName: "Knowledge and training",
    requirementName: "Responsible personnel receive training",
  },
  "R.14.3": {
    moduleId: "R",
    categoryName: "Knowledge and training",
    requirementName: "Perform security awareness training",
  },
  "R.14.4": {
    moduleId: "R",
    categoryName: "Knowledge and training",
    requirementName: "Establish education plan",
  },
  "R.14.5": {
    moduleId: "R",
    categoryName: "Knowledge and training",
    requirementName: "Periodically review knowledge",
  },
  "R.15": { moduleId: "R", categoryName: "Awareness" },
  "R.15.1": {
    moduleId: "R",
    categoryName: "Awareness",
    requirementName: "Establish and maintain awareness plan",
  },
  "R.15.2": {
    moduleId: "R",
    categoryName: "Awareness",
    requirementName: "Disclose PKI information",
  },
  "R.15.3": {
    moduleId: "R",
    categoryName: "Awareness",
    requirementName: "Establish single point of contact",
  },
  "R.15.4": {
    moduleId: "R",
    categoryName: "Awareness",
    requirementName: "Timely communication of important information",
  },
};
