import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Extensions } from "./Extensions";
import {
  AssessmentTargetProvider,
  useAssessmentTarget,
} from "../../contexts/AssessmentTargetContext";
import type { ExtensionData } from "../../types/types";

const ext = (id: string): ExtensionData => ({
  schemaVersion: "1.0.0",
  extension: { id, name: `Ext ${id}`, version: "1.0.0", description: "d" },
  relevance: { modules: [] },
  overlays: { modules: [] },
});

const renderExt = (
  props: Partial<React.ComponentProps<typeof Extensions>> = {},
  exts: ExtensionData[] = [],
  enabled: string[] = [],
) =>
  render(
    <AssessmentTargetProvider
      availableExtensions={exts}
      enabledExtensions={enabled}
      coreModules={[]}
      progress={{}}
      requirementProgress={{}}
    >
      <Extensions
        extensions={exts}
        enabledExtensions={enabled}
        onToggleExtension={jest.fn()}
        onUploadExtension={jest.fn()}
        onRemoveExtension={jest.fn()}
        {...props}
      />
    </AssessmentTargetProvider>,
  );

describe("Extensions", () => {
  let confirmSpy: jest.SpyInstance;
  beforeEach(() => {
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("shows the empty state and the upload control when there are no extensions", () => {
    renderExt();
    expect(
      screen.getByText(/No extensions yet\. Upload a/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upload extension/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows an intro noting extensions are stored only in this browser", () => {
    renderExt();
    expect(
      screen.getByText(/stored only in this browser/i),
    ).toBeInTheDocument();
  });

  it("calls onRemoveExtension with the extension id when Remove is clicked", () => {
    const onRemoveExtension = jest.fn();
    const exts = [ext("ext1")];
    renderExt({ onRemoveExtension }, exts, []);

    fireEvent.click(screen.getByRole("button", { name: "Remove Ext ext1" }));

    expect(onRemoveExtension).toHaveBeenCalledWith("ext1");
  });

  it("calls onUploadExtension when a file is chosen via the hidden file input", () => {
    const onUploadExtension = jest.fn();
    const { container } = renderExt({ onUploadExtension });

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["schemaVersion: 1.0.0"], "ext.yaml", {
      type: "text/yaml",
    });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onUploadExtension).toHaveBeenCalledWith(file);
  });

  it("renders the upload error as an alert", () => {
    renderExt({ uploadError: "bad file" });

    expect(screen.getByRole("alert")).toHaveTextContent("bad file");
  });

  it("resets the target to original when the active extension is removed", () => {
    const onRemoveExtension = jest.fn();
    const exts = [ext("ext1")];

    const Probe: React.FC = () => {
      const { target } = useAssessmentTarget();
      return (
        <div data-testid="probe">
          {target.kind === "extension" ? `extension:${target.id}` : "original"}
        </div>
      );
    };

    render(
      <AssessmentTargetProvider
        availableExtensions={exts}
        enabledExtensions={[]}
        coreModules={[]}
        progress={{}}
        requirementProgress={{}}
      >
        <Probe />
        <Extensions
          extensions={exts}
          enabledExtensions={[]}
          onToggleExtension={jest.fn()}
          onUploadExtension={jest.fn()}
          onRemoveExtension={onRemoveExtension}
        />
      </AssessmentTargetProvider>,
    );

    // Selecting (enabling) the extension makes it the active target.
    fireEvent.click(screen.getByRole("checkbox", { name: "Ext ext1" }));
    expect(screen.getByTestId("probe")).toHaveTextContent("extension:ext1");

    fireEvent.click(screen.getByRole("button", { name: "Remove Ext ext1" }));

    expect(screen.getByTestId("probe")).toHaveTextContent("original");
    expect(onRemoveExtension).toHaveBeenCalledWith("ext1");
  });

  it("leaves the active target and does not remove when the confirm is cancelled", () => {
    confirmSpy.mockReturnValue(false);
    const onRemoveExtension = jest.fn();
    const exts = [ext("ext1")];

    const Probe: React.FC = () => {
      const { target } = useAssessmentTarget();
      return (
        <div data-testid="probe">
          {target.kind === "extension" ? `extension:${target.id}` : "original"}
        </div>
      );
    };

    render(
      <AssessmentTargetProvider
        availableExtensions={exts}
        enabledExtensions={[]}
        coreModules={[]}
        progress={{}}
        requirementProgress={{}}
      >
        <Probe />
        <Extensions
          extensions={exts}
          enabledExtensions={[]}
          onToggleExtension={jest.fn()}
          onUploadExtension={jest.fn()}
          onRemoveExtension={onRemoveExtension}
        />
      </AssessmentTargetProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Ext ext1" }));
    expect(screen.getByTestId("probe")).toHaveTextContent("extension:ext1");

    fireEvent.click(screen.getByRole("button", { name: "Remove Ext ext1" }));

    // Cancelled: still the active target, and no removal delegated.
    expect(screen.getByTestId("probe")).toHaveTextContent("extension:ext1");
    expect(onRemoveExtension).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderExt(
      { uploadError: "bad file" },
      [ext("ext1")],
      ["ext1"],
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
