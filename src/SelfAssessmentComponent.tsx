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
    const configUrl = this.getAttribute("configUrl");
    const extensionsUrl = this.getAttribute("extensionsUrl");
    if (!this.root) {
      this.root = createRoot(this);
    }
    this.root.render(
      <App
        dataUrl={dataUrl}
        configUrl={configUrl}
        extensionsUrl={extensionsUrl}
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
