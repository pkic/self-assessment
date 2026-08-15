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
  it("renders accessibly and establishes Level 0 only after both declarations", async () => {
    const { container } = render(
      <EvidenceAssessment
        src={null}
        profile={parseAssessmentProfile(
          getBundledAssessmentProfileYaml("pqcmm-self-assessment")!,
        )}
      />,
    );
    await screen.findByRole("heading", { name: "PQCMM Assessment" });
    await screen.findByText("No level established");

    const criteria = container.querySelectorAll(
      ".evidence-assessment-criterion",
    );
    expect(criteria).toHaveLength(2);
    for (const criterion of criteria) {
      fireEvent.click(
        within(criterion as HTMLElement).getByRole("radio", {
          name: "Met",
        }),
      );
    }

    await waitFor(() =>
      expect(
        container.querySelector(".evidence-assessment-header__result"),
      ).toHaveTextContent("Level 0"),
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
