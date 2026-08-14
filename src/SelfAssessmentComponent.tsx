import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

class SelfAssessmentComponent extends HTMLElement {
  private root: ReturnType<typeof createRoot> | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    const dataUrl = this.getAttribute("dataUrl");
    const referencesUrl = this.getAttribute("referencesUrl");
    const modes = this.getAttribute("modes");
    const model = this.getAttribute("model");
    if (!this.root) {
      this.root = createRoot(this);
    }
    this.root.render(
      <App
        dataUrl={dataUrl}
        referencesUrl={referencesUrl}
        modes={modes}
        model={model}
      />,
    );
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }
}

// Register the custom element only once
if (!customElements.get("self-assessment")) {
  customElements.define("self-assessment", SelfAssessmentComponent);
}
