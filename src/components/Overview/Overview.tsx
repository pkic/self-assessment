import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Overview.module.scss";

interface OverviewProps {}

const overview = `
This self-assessment tool is intended for a quick self-assessment of the PKI maturity level and as a starting point for the full assessment.

You can use the tool:
- to quickly evaluate the current PKI maturity level
- share progress with your team
- identify areas for improvement
- generate a report with the results
`;

const pkimm = `
The maturity model is based on the Capability Maturity Model Integration (CMMI) developed by Carnegie Mellon University. It should provide the following:
- Quickly understand the current level of capabilities and performance of the PKI
- Support comparison of PKI maturity with similar organizations based on size or industry (anonymized)
- Guidance on how to improve the capabilities of the current PKI
- Improve overall PKI performance
`;

const maturityLevels = `
The PKI maturity model defines 5 levels of the PKI maturity based on different indicators and associated risks.
`;

const markdownTable = `| **Maturity level** | **Short description**                                                                                        |
|--------------------|--------------------------------------------------------------------------------------------------------------|
| **Initial**        | Unpredictable process with poor control and always reactive                                                  |
| **Basic**          | Process is characterized by each particular case or project and controls are often reactive                  |
| **Advanced**       | Process is characterized by organizational standards and controls are proactive                              |
| **Managed**        | Processes are measured and controlled, proactive approach                                                    |
| **Optimized**      | Continuous improvement of the processes and procedures, proactive approach for future technology improvement |
`;

const resources = `
| Resource                                                                                                                | Description                                                                                                                                                               |
|-------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [PKI maturity model](https://pkic.org/pkimm/model/)                                                                                     | Definition of the PKI maturity model and description of the maturity assessment process and procedures in order to rate the current maturity level and to track progress. |
| [Categories description](https://pkic.org/pkimm/categories/)                                                                            | Description of PKI maturity model related categories and associated requirement, guidance, assessment tips, and references.                                               |
| [PKI maturity assessment process](https://pkic.org/pkimm/assessment/)                                                                   | Description of the assessment process.                                                                                                                                    |
| [PKI maturity assessment tools](https://pkic.org/pkimm/tools/)                                                                          | Available tools for the assessment of the PKI implementation and use case.                                                                                                |
| [Feedback form](https://forms.gle/7CgvuNoxaiTYbtK29)                                                                    | PKI maturity model and assessment feedback form.                                                                                                                          |
| [PKI maturity model community discussion](https://github.com/orgs/pkic/discussions/categories/pki-maturity-model-pkimm) | Ideas, questions, or feedback that you want to share or discuss related to the PKI maturity model.                                                                        |
`;

export const Overview: React.FC<OverviewProps> = () => {
  return (
    <div className="pkimm-overview">
      <div className="pkimm-overview-header">
        <h1>PKI Maturity Model (PKIMM) Self-Assessment</h1>
        <ReactMarkdown>{overview}</ReactMarkdown>

        <h1>What is PKI Maturity Model?</h1>
        <ReactMarkdown>{pkimm}</ReactMarkdown>
        <ReactMarkdown>{maturityLevels}</ReactMarkdown>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownTable}
        </ReactMarkdown>

        <h1>Resources</h1>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{resources}</ReactMarkdown>
      </div>
    </div>
  );
};
