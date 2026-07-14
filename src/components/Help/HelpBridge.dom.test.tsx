import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AssessmentTargetProvider,
  useAssessmentTarget,
} from "../../contexts/AssessmentTargetContext";
import { HelpBridge } from "./HelpBridge";
import { useHelp } from "./HelpProvider";

// AssessmentTargetProvider's REAL props:
// availableExtensions, coreModules, progress, requirementProgress, enabledExtensions.
const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AssessmentTargetProvider
    availableExtensions={[]}
    coreModules={[]}
    progress={{}}
    requirementProgress={{}}
    enabledExtensions={[]}
  >
    {children}
  </AssessmentTargetProvider>
);

const Trigger = () => {
  const { openHelp } = useHelp();
  return <button onClick={() => openHelp()}>help</button>;
};

test("header help opens the resolved topic under the target provider", () => {
  render(
    <Provider>
      <HelpBridge tab="G" view="full" moduleIds={["G"]}>
        <Trigger />
      </HelpBridge>
    </Provider>,
  );
  fireEvent.click(screen.getByText("help"));
  expect(screen.getByText("Rating a requirement")).toBeInTheDocument();
});

test("extension target resolves a module tab to extension-rating", () => {
  const Switcher = () => {
    const { setTarget } = useAssessmentTarget();
    return (
      <button onClick={() => setTarget({ kind: "extension", id: "x" })}>
        ext
      </button>
    );
  };
  render(
    <Provider>
      <Switcher />
      <HelpBridge tab="G" view="full" moduleIds={["G"]}>
        <Trigger />
      </HelpBridge>
    </Provider>,
  );
  fireEvent.click(screen.getByText("ext"));
  fireEvent.click(screen.getByText("help"));
  expect(screen.getByText("Rating an extension category")).toBeInTheDocument();
});

test("useHelp() outside any HelpProvider is a no-op that does not throw", () => {
  render(<Trigger />);
  expect(() => {
    fireEvent.click(screen.getByText("help"));
  }).not.toThrow();
});
