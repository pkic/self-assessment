import "fake-indexeddb/auto";
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { axe } from "jest-axe";
import { parseAssessmentProfile } from "../../assessment-engine/profile";
import { getBundledAssessmentProfileYaml } from "../../defaults/assessmentProfiles";
import { EvidenceAssessment } from "./EvidenceAssessment";

jest.mock("./pdf", () => ({ downloadEvidenceAssessmentPdf: jest.fn() }));

describe("EvidenceAssessment", () => {
  it("starts at Level 0 and enables export after the basic information", async () => {
    const { container } = render(
      <EvidenceAssessment
        src={null}
        profile={parseAssessmentProfile(
          getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
        )}
      />,
    );
    await screen.findByRole("heading", { name: "PQCMM Assessment" });
    expect(
      screen.getByRole("heading", { name: "Level 0 · None" }),
    ).toBeInTheDocument();
    // Questions that don't decide the level open in a side panel.
    expect(screen.queryByLabelText("Target date for Level 1")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /^Answer: By what date/ }),
    );
    expect(screen.getByLabelText("Target date for Level 1")).toHaveAttribute(
      "type",
      "date",
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Answer: Is a Software Bill/ }),
    );
    expect(screen.getByLabelText("SBOM or CBOM available")).toHaveRole(
      "combobox",
    );
    expect(
      screen.getByRole("button", { name: "Attach files: SBOM or CBOM file" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.getByRole("progressbar", {
        name: /level 1.*criteria completion/i,
      }),
    ).toHaveAttribute("value", "0");
    expect(screen.getByText("Next: Level 1 · Initial")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("complementary", { name: "Assessment progress" }),
      ).getByRole("button", { name: /^Level 0 None: Established/ }),
    ).toHaveAttribute("aria-pressed", "true");

    const criteria = container.querySelectorAll(".evidence-criterion");
    expect(criteria).toHaveLength(2);
    for (const criterion of criteria) {
      expect(
        within(criterion as HTMLElement).getByRole("radio", {
          name: "Met",
        }),
      ).toBeChecked();
    }
    expect(
      screen.getByText(/Established · 2 of 2 criteria met/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Assessment scope/ }),
    ).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByRole("button", { name: "Download PDF report" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Product or service"), {
      target: { value: "Secure Gateway" },
    });
    fireEvent.change(screen.getByLabelText("Product version or release"), {
      target: { value: "2.0" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Example Corp" },
    });
    expect(screen.getByLabelText("Assessor organization")).toHaveValue(
      "Example Corp",
    );
    expect(screen.getByText(/suggested cpe 2\.3 name:/i)).toHaveTextContent(
      "cpe:2.3:a:example_corp:secure_gateway:2.0:*:*:*:*:*:*:*",
    );
    fireEvent.click(screen.getByRole("button", { name: "Use suggestion" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Download PDF report" }),
      ).toBeEnabled(),
    );
    // Completing the scope does not fold the form away mid-edit.
    expect(
      screen.getByRole("button", { name: /Assessment scope/ }),
    ).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByText(/external signing flow establishes each actual signer/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/accountable executive/i)).toHaveTextContent(
      "optional",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("moves between levels from the staircase and the level navigation", async () => {
    render(
      <EvidenceAssessment
        src={null}
        profile={parseAssessmentProfile(
          getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
        )}
      />,
    );
    await screen.findByRole("heading", { name: "PQCMM Assessment" });
    fireEvent.click(
      within(
        screen.getByRole("complementary", { name: "Assessment progress" }),
      ).getByRole("button", { name: /^Level 2 Foundational:/ }),
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Foundational" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to Level 3" }),
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Advanced" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Level 2" }));
    expect(
      screen.getByRole("heading", { level: 3, name: "Foundational" }),
    ).toBeInTheDocument();
  });

  it("hides the expected-input note when the response fields define it", async () => {
    render(
      <EvidenceAssessment
        src={null}
        profile={parseAssessmentProfile(
          getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
        )}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /^Answer: By what date/ }),
    );
    await screen.findByLabelText("Target date for Level 1");
    expect(screen.queryByText(/Date \(YYYY-MM-DD\)/)).not.toBeInTheDocument();
  });

  it("shows each criterion's questions inside it and the rest after", async () => {
    render(
      <EvidenceAssessment
        src={null}
        profile={parseAssessmentProfile(
          getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
        )}
      />,
    );
    await screen.findByRole("heading", { name: "PQCMM Assessment" });
    fireEvent.click(
      within(
        screen.getByRole("complementary", { name: "Assessment progress" }),
      ).getByRole("button", { name: /^Level 1 Initial:/ }),
    );
    const first = within(screen.getByRole("main")).getByRole("article", {
      name: /^Criterion 1\.1\.1:/,
    });
    // Nothing but the statement and the decision until a conclusion is set.
    expect(within(first).queryByText(/Which quantum-safe/)).toBeNull();
    expect(within(first).queryByLabelText(/Notes and gaps/)).toBeNull();

    fireEvent.click(within(first).getByRole("radio", { name: "Met" }));
    expect(
      within(first).getByText(
        "This counts as Met once it has 3 more answers and evidence.",
      ),
    ).toBeInTheDocument();
    expect(within(first).getByText(/Which quantum-safe/)).toBeInTheDocument();
    expect(
      within(first).getByText("Met, not yet supported"),
    ).toBeInTheDocument();
    expect(await axe(first)).toHaveNoViolations();
    // Self-assessment derives findings from complete answers.
    expect(within(first).queryByText("Assessment finding")).toBeNull();

    fireEvent.click(within(first).getByRole("radio", { name: "Not met" }));
    expect(within(first).queryByText(/Which quantum-safe/)).toBeNull();
    expect(
      within(first).getByLabelText("What is missing?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "More detail for the report" }),
    ).toBeInTheDocument();
  });
});
