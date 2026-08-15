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
      container.querySelector(".evidence-assessment-header__result"),
    ).toHaveTextContent("Level 0");
    expect(screen.getByLabelText("Target date for Level 1")).toHaveAttribute(
      "type",
      "date",
    );
    expect(screen.getByLabelText("SBOM or CBOM available")).toHaveRole(
      "combobox",
    );
    expect(
      screen.getByRole("button", { name: "Add SBOM or CBOM file" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: /level 0.*criteria completion/i,
      }),
    ).toHaveAttribute("value", "100");
    expect(screen.getByText("Next gate")).toBeInTheDocument();

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
    expect(screen.getByText("Established")).toBeInTheDocument();

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
    expect(screen.getByText(/suggested cpe:/i)).toHaveTextContent(
      "cpe:2.3:a:example_corp:secure_gateway:2.0:*:*:*:*:*:*:*",
    );
    fireEvent.click(screen.getByRole("button", { name: "Use suggested CPE" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Download PDF report" }),
      ).toBeEnabled(),
    );

    expect(
      screen.getByText(/external signing flow establishes each actual signer/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/accountable executive/i)).toHaveTextContent(
      "optional",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
