import { TextEncoder, TextDecoder } from "util";

// jsdom does not implement TextEncoder/TextDecoder; urlGenerator's base64
// helpers (used when generating a share URL) need them.
if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as { TextEncoder?: typeof TextEncoder }).TextEncoder =
    TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as unknown as { TextDecoder?: typeof TextDecoder }).TextDecoder =
    TextDecoder;
}

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

// --- Mock @react-pdf/renderer -------------------------------------------
// UnifiedReport imports SECTION_ORDER/resolveSections from the section
// registry (for the Custom report picker), which pulls in the section
// components (Cover.tsx -> primitives.tsx) that import @react-pdf/renderer
// at module load time (theme.ts runs Font.register/StyleSheet.create
// eagerly). Stub it as a pass-through so those modules can be required
// without pulling in the real (ESM) PDF renderer package.
jest.mock("@react-pdf/renderer", () => {
  const passthrough =
    (name: string) =>
    ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(name, props, children);

  return {
    __esModule: true,
    Document: passthrough("mock-document"),
    Page: passthrough("mock-page"),
    View: passthrough("mock-view"),
    Text: passthrough("mock-text"),
    Image: passthrough("mock-image"),
    Link: passthrough("mock-link"),
    Svg: passthrough("mock-svg"),
    Path: passthrough("mock-path"),
    G: passthrough("mock-g"),
    Rect: passthrough("mock-rect"),
    Circle: passthrough("mock-circle"),
    Line: passthrough("mock-line"),
    Font: { register: jest.fn(), registerHyphenationCallback: jest.fn() },
    StyleSheet: { create: (styles: unknown) => styles },
    pdf: jest.fn(() => ({ toBlob: async () => new Blob() })),
  };
});

// Imported after the mock above so the mocked module is in place before
// UnifiedReport (and the section registry it now pulls in) evaluate their
// module bodies.
import { UnifiedReport } from "./UnifiedReport";
import {
  AssessmentTargetProvider,
  useAssessmentTarget,
} from "../../contexts/AssessmentTargetContext";
import { decodeProgressHash, decodeFullParam } from "../../utils/urlGenerator";
import {
  SECTION_ORDER,
  ATTESTATION_SECTIONS,
  ASSESSMENT_SECTIONS,
  DETAILED_SECTIONS,
} from "../../utils/pdf/sections/registry";
import type {
  ExtensionData,
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../../types/types";

expect.extend(toHaveNoViolations);

const noop = () => {};

const baseProps = {
  onDownload: jest.fn(),
  dataVersion: "2.0.0",
  assessmentName: "",
  assessorName: "",
  useCaseDescription: "",
  enabledExtensions: [],
  onExportPDF: noop,
  onReset: noop,
  onAssessmentName: noop,
  onAssessorName: noop,
  onUseCaseDescription: noop,
  organizationName: "",
  assessorCompany: "",
  assessorPosition: "" as const,
  assessmentType: "" as const,
  startDate: "",
  targetDate: "",
  finishDate: "",
  pkiEnvironment: {},
  onOrganizationName: noop,
  onAssessorCompany: noop,
  onAssessorPosition: noop,
  onAssessmentType: noop,
  onStartDate: noop,
  onTargetDate: noop,
  onFinishDate: noop,
  onPkiEnvironment: noop,
  isTransient: false,
  isFullView: false,
  sectionAvailability: {},
};

// Test-only helper: selects the given extension as the active target on
// mount. There is no prop on AssessmentTargetProvider to seed a non-original
// initial target, and the real switcher (AssessmentHeader) pulls in unrelated
// dropdown markup/CSS — this reaches the same context state (`setTarget`)
// the simplest way for a test.
const TargetSwitcher: React.FC<{ extensionId: string }> = ({ extensionId }) => {
  const { setTarget } = useAssessmentTarget();
  React.useEffect(() => {
    setTarget({ kind: "extension", id: extensionId });
  }, [extensionId, setTarget]);
  return null;
};

const renderReport = (
  overrides: Partial<typeof baseProps> = {},
  target: {
    coreModules?: ModuleData[];
    progress?: Record<string, ProgressData>;
    requirementProgress?: Record<string, RequirementProgress>;
    availableExtensions?: ExtensionData[];
    enabledExtensions?: string[];
    activeExtensionId?: string;
  } = {},
) =>
  render(
    <AssessmentTargetProvider
      availableExtensions={target.availableExtensions ?? []}
      coreModules={target.coreModules ?? []}
      progress={target.progress ?? {}}
      requirementProgress={target.requirementProgress ?? {}}
      enabledExtensions={target.enabledExtensions ?? []}
    >
      {target.activeExtensionId && (
        <TargetSwitcher extensionId={target.activeExtensionId} />
      )}
      <UnifiedReport {...baseProps} {...overrides} />
    </AssessmentTargetProvider>,
  );

test("self view shows Share + Download, no Email", () => {
  renderReport({ isFullView: false });
  expect(
    screen.getByRole("button", { name: /Share progress/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Download assessment/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Send Email/i }),
  ).not.toBeInTheDocument();
});

test("full view hides Share, shows Download", () => {
  renderReport({ isFullView: true });
  expect(
    screen.queryByRole("button", { name: /Share progress/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Download assessment/i }),
  ).toBeInTheDocument();
});

test("Download button fires onDownload", () => {
  const onDownload = jest.fn();
  renderReport({ isFullView: true, onDownload });
  fireEvent.click(screen.getByRole("button", { name: /Download assessment/i }));
  expect(onDownload).toHaveBeenCalled();
});

test("assessment-name field has a guiding placeholder", () => {
  renderReport({});
  expect(screen.getByPlaceholderText(/annual review/i)).toBeInTheDocument();
});

test("typing in the Organization field fires onOrganizationName", () => {
  const onOrganizationName = jest.fn();
  renderReport({ onOrganizationName, isFullView: true });
  const input = screen.getByLabelText(/Assessed organization/i);
  fireEvent.change(input, { target: { value: "Acme Corp" } });
  expect(onOrganizationName).toHaveBeenCalledWith("Acme Corp");
});

test("the Assessed organization field exposes a hint via aria-describedby", () => {
  renderReport({ isFullView: true });
  const input = screen.getByLabelText(/Assessed organization/i);
  const describedBy = input.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  const hintEl = document.getElementById(describedBy!);
  expect(hintEl).toHaveTextContent(/organization whose PKI is being assessed/i);
});

test("selecting assessmentType 'self' fires onAssessmentType('self')", () => {
  const onAssessmentType = jest.fn();
  renderReport({ onAssessmentType, isFullView: true });
  const select = screen.getByLabelText(/Assessment type/i);
  fireEvent.change(select, { target: { value: "self" } });
  expect(onAssessmentType).toHaveBeenCalledWith("self");
});

test("setting the start date input fires onStartDate with the ISO value", () => {
  const onStartDate = jest.fn();
  renderReport({ onStartDate, isFullView: true });
  const input = screen.getByLabelText(/Start date/i);
  fireEvent.change(input, { target: { value: "2026-07-06" } });
  expect(onStartDate).toHaveBeenCalledWith("2026-07-06");
});

test("typing in the components textarea fires onPkiEnvironment('components', ...)", () => {
  const onPkiEnvironment = jest.fn();
  renderReport({ onPkiEnvironment, isFullView: true });
  const textarea = screen.getByLabelText(/Components/i);
  fireEvent.change(textarea, { target: { value: "CA, RA, HSM" } });
  expect(onPkiEnvironment).toHaveBeenCalledWith("components", "CA, RA, HSM");
});

test("self view shows only the core fields, not the full-assessment metadata form", () => {
  renderReport({ isFullView: false });
  // Original self-assessment fields remain.
  expect(screen.getByLabelText(/Assessment Name/i)).toHaveValue("");
  expect(screen.getByLabelText(/Assessor Name/i)).toHaveValue("");
  // Full-assessment-only metadata is absent in self view.
  expect(
    screen.queryByLabelText(/Assessed organization/i),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Assessment type/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Start date/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Components/i)).not.toBeInTheDocument();
});

test("full view shows the full-assessment metadata form", () => {
  renderReport({ isFullView: true });
  expect(screen.getByLabelText(/Assessed organization/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Assessment type/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Start date/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Components/i)).toBeInTheDocument();
});

test("Share Progress stamps the actual dataVersion, not a hardcoded 1.0.0", () => {
  renderReport({ dataVersion: "2.0.0" });
  fireEvent.click(screen.getByRole("button", { name: /Share Progress/i }));
  const urlInput = screen.getByLabelText(/Assessment URL/i) as HTMLInputElement;
  const hash = new URL(urlInput.value).hash.slice(1);
  const decoded = decodeProgressHash(hash);
  expect(decoded?.dataVersion).toBe("2.0.0");
});

test("Share Progress on a quick assessment (no requirementProgress) omits the full param", () => {
  renderReport({ dataVersion: "2.0.0" });
  fireEvent.click(screen.getByRole("button", { name: /Share Progress/i }));
  const urlInput = screen.getByLabelText(/Assessment URL/i) as HTMLInputElement;
  expect(new URL(urlInput.value).hash).not.toContain("full=");
});

test("Share Progress on a full assessment includes a full param carrying requirementProgress", () => {
  const coreModules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "strategy-and-vision",
          weight: 3,
          name: "Strategy and vision",
          description: "",
          levels: [],
          requirements: [
            {
              id: "r1",
              weight: 1,
              description: "r1",
              guidance: "",
              assessment: "",
              references: [],
            },
          ],
        },
      ],
    },
  ];
  const requirementProgress: Record<string, RequirementProgress> = {
    "G.strategy-and-vision.r1": {
      level: 4,
      applicability: true,
      notes: "",
      evidence: "",
    },
  };
  renderReport({ dataVersion: "2.0.0" }, { coreModules, requirementProgress });
  fireEvent.click(screen.getByRole("button", { name: /Share Progress/i }));
  const urlInput = screen.getByLabelText(/Assessment URL/i) as HTMLInputElement;
  const hash = new URL(urlInput.value).hash.slice(1);
  const params = new URLSearchParams(hash);
  const full = params.get("full");
  expect(full).toBeTruthy();
  const decodedFull = decodeFullParam(full!);
  expect(
    decodedFull?.requirementProgress["G.strategy-and-vision.r1"]?.level,
  ).toBe(4);
});

test("self view renders no report-type selector and Export to PDF fires onExportPDF('self', undefined)", () => {
  const onExportPDF = jest.fn();
  renderReport({ onExportPDF, isFullView: false });

  expect(screen.queryByLabelText(/Report type/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Export to PDF/i }));
  expect(onExportPDF).toHaveBeenCalledWith(
    "self",
    undefined,
    undefined,
    undefined,
  );
});

test("full view's report-type selector offers Assessment, Detailed, Attestation, and Custom, defaults to Assessment, and threads the selected tier into onExportPDF", () => {
  const onExportPDF = jest.fn();
  renderReport({ onExportPDF, isFullView: true });

  const select = screen.getByLabelText(/Report type/i) as HTMLSelectElement;
  expect(select).toBeInTheDocument();
  const optionLabels = Array.from(select.options).map((o) => o.textContent);
  expect(optionLabels).toEqual([
    "Assessment",
    "Detailed",
    "Attestation",
    "Custom",
  ]);
  expect(select.value).toBe("assessment");

  fireEvent.click(screen.getByRole("button", { name: /Export to PDF/i }));
  expect(onExportPDF).toHaveBeenCalledWith(
    "assessment",
    undefined,
    undefined,
    undefined,
  );

  onExportPDF.mockClear();
  fireEvent.change(select, { target: { value: "detailed" } });
  fireEvent.click(screen.getByRole("button", { name: /Export to PDF/i }));
  expect(onExportPDF).toHaveBeenCalledWith(
    "detailed",
    undefined,
    expect.objectContaining({ statuses: expect.any(Set) }),
    undefined,
  );

  onExportPDF.mockClear();
  fireEvent.change(select, { target: { value: "attestation" } });
  fireEvent.click(screen.getByRole("button", { name: /Export to PDF/i }));
  expect(onExportPDF).toHaveBeenCalledWith(
    "attestation",
    undefined,
    undefined,
    undefined,
  );
});

test("the Attestation option is disabled for a transient assessment", () => {
  renderReport({ isTransient: true, isFullView: true });
  const select = screen.getByLabelText(/Report type/i) as HTMLSelectElement;
  const attestationOption = Array.from(select.options).find(
    (o) => o.value === "attestation",
  ) as HTMLOptionElement;
  expect(attestationOption.disabled).toBe(true);
});

test("the Attestation option is enabled for a saved (non-transient) assessment", () => {
  renderReport({ isTransient: false, isFullView: true });
  const select = screen.getByLabelText(/Report type/i) as HTMLSelectElement;
  const attestationOption = Array.from(select.options).find(
    (o) => o.value === "attestation",
  ) as HTMLOptionElement;
  expect(attestationOption.disabled).toBe(false);
});

test("the report-type selector is not rendered when viewing an extension target, even in full view", () => {
  const extensionData: ExtensionData = {
    extension: {
      id: "ext-1",
      name: "Test Extension",
      version: "1.0.0",
      description: "",
    },
    relevance: { modules: [] },
  };
  renderReport(
    { isFullView: true },
    {
      availableExtensions: [extensionData],
      enabledExtensions: ["ext-1"],
      activeExtensionId: "ext-1",
    },
  );

  expect(screen.queryByLabelText(/Report type/i)).not.toBeInTheDocument();
});

test("shows the report filter for detailed tier and passes it to onExportPDF", () => {
  const onExportPDF = jest.fn();
  renderReport({ onExportPDF, isFullView: true });
  fireEvent.change(screen.getByLabelText("Report type"), {
    target: { value: "detailed" },
  });
  const flagged = screen.getByRole("button", { name: /flagged/i });
  fireEvent.click(flagged);
  fireEvent.click(screen.getByRole("button", { name: /export to pdf/i }));
  expect(onExportPDF).toHaveBeenCalledWith(
    "detailed",
    undefined,
    expect.objectContaining({ statuses: expect.any(Set) }),
    undefined,
  );
});

test("hides the report filter for the assessment tier", () => {
  renderReport({ isFullView: true, onExportPDF: jest.fn() });
  // Default tier is "assessment": no status filter chips rendered.
  expect(screen.queryByRole("button", { name: /flagged/i })).toBeNull();
});

test("the report filter has no accessibility violations", async () => {
  renderReport({
    isFullView: true,
    onExportPDF: jest.fn(),
  });
  fireEvent.change(screen.getByLabelText("Report type"), {
    target: { value: "detailed" },
  });
  const filter = document.querySelector(".pkimm-report-filter") as HTMLElement;
  expect(filter).toBeInTheDocument();
  expect(await axe(filter)).toHaveNoViolations();
});

test("selecting Custom reveals the base-preset select and the section checklist", () => {
  renderReport({ isFullView: true });
  fireEvent.change(screen.getByLabelText("Report type"), {
    target: { value: "custom" },
  });

  expect(screen.getByLabelText(/Start from/i)).toBeInTheDocument();
  expect(screen.getAllByRole("checkbox")).toHaveLength(SECTION_ORDER.length);
});

test("changing the base preset re-seeds the checked set to the new preset", () => {
  renderReport({ isFullView: true });
  fireEvent.change(screen.getByLabelText("Report type"), {
    target: { value: "custom" },
  });
  fireEvent.change(screen.getByLabelText(/Start from/i), {
    target: { value: "attestation" },
  });

  const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
  SECTION_ORDER.forEach((key, i) => {
    expect(checkboxes[i].checked).toBe(ATTESTATION_SECTIONS.includes(key));
  });
});

test("a section present in sectionAvailability renders disabled with its reason, and is excluded from the exported sections", () => {
  const onExportPDF = jest.fn();
  renderReport({
    onExportPDF,
    isFullView: true,
    sectionAvailability: { comparison: "No baseline selected" },
  });
  fireEvent.change(screen.getByLabelText("Report type"), {
    target: { value: "custom" },
  });
  fireEvent.change(screen.getByLabelText(/Start from/i), {
    target: { value: "detailed" },
  });

  expect(screen.getByText("No baseline selected")).toBeInTheDocument();

  const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
  const comparisonCheckbox = checkboxes[SECTION_ORDER.indexOf("comparison")];
  expect(comparisonCheckbox.checked).toBe(false);
  expect(comparisonCheckbox.disabled).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: /Export to PDF/i }));
  const sections = onExportPDF.mock.calls[0][3];
  expect(sections).not.toContain("comparison");
  expect(sections).toEqual(
    DETAILED_SECTIONS.filter((key) => key !== "comparison"),
  );
});

test("the requirement filter is visible for detailed and for custom when requirementDetails is checked; hidden otherwise", () => {
  renderReport({ isFullView: true });
  const select = screen.getByLabelText("Report type");

  fireEvent.change(select, { target: { value: "attestation" } });
  expect(
    screen.queryByLabelText("Filter requirements:"),
  ).not.toBeInTheDocument();

  fireEvent.change(select, { target: { value: "assessment" } });
  expect(
    screen.queryByLabelText("Filter requirements:"),
  ).not.toBeInTheDocument();

  fireEvent.change(select, { target: { value: "detailed" } });
  expect(screen.getByLabelText("Filter requirements:")).toBeInTheDocument();

  fireEvent.change(select, { target: { value: "custom" } });
  // Default custom base ("assessment") does not include requirementDetails.
  expect(
    screen.queryByLabelText("Filter requirements:"),
  ).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Start from/i), {
    target: { value: "detailed" },
  });
  expect(screen.getByLabelText("Filter requirements:")).toBeInTheDocument();

  const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
  fireEvent.click(checkboxes[SECTION_ORDER.indexOf("requirementDetails")]);
  expect(
    screen.queryByLabelText("Filter requirements:"),
  ).not.toBeInTheDocument();
});

test("clicking Export in custom mode calls onExportPDF with tier 'custom' and an ordered sections array", () => {
  const onExportPDF = jest.fn();
  renderReport({ onExportPDF, isFullView: true });
  fireEvent.change(screen.getByLabelText("Report type"), {
    target: { value: "custom" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Export to PDF/i }));

  expect(onExportPDF).toHaveBeenCalledWith(
    "custom",
    undefined,
    undefined,
    ASSESSMENT_SECTIONS,
  );
});
