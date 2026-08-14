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
import { PqcmmAssessment } from "./PqcmmAssessment";

jest.mock("./pdf", () => ({ downloadPqcmmPdf: jest.fn() }));

describe("PqcmmAssessment", () => {
  it("renders accessibly and establishes Level 0 only after both declarations", async () => {
    const { container } = render(<PqcmmAssessment src={null} />);
    await screen.findByRole("heading", { name: "PQCMM Assessment" });
    await screen.findByText("No level established");

    const criteria = container.querySelectorAll(".pqcmm-criterion");
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
        container.querySelector(".pqcmm-header__result"),
      ).toHaveTextContent("Level 0"),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
