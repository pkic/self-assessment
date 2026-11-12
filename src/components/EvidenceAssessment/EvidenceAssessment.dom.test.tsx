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
    expect(screen.getByLabelText("Target date for Level 1")).toHaveAttribute(
      "type",
      "date",
    );
    expect(screen.getByLabelText("SBOM or CBOM available")).toHaveRole(
      "combobox",
    );
    expect(
      screen.getByRole("button", { name: "Add files: SBOM or CBOM file" }),
    ).toBeInTheDocument();
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

    const criteria = container.querySelectorAll(
      ".evidence-assessment-criterion",
    );
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
    const first = within(screen.getByRole("main"))
      .getByLabelText("Criterion 1.1.1")
      .closest("article")!;
    expect(within(first).getByText("1.2.1")).toBeInTheDocument();
    expect(
      within(first).getByRole("list", {
        name: "What this criterion needs to count",
      }),
    ).toHaveTextContent("Questions support it (0 of 3)");
    expect(
      screen.getByRole("heading", { name: "Other questions at this level" }),
    ).toBeInTheDocument();
  });
});
