(() => {
  const parameters = new URLSearchParams(window.location.search);
  const assessment = document.getElementById("assessment");
  const attributes = [
    "profile",
    "profileUrl",
    "dataUrl",
    "referencesUrl",
    "modes",
  ];

  const applyAttributes = () => {
    for (const attribute of attributes) {
      const value = parameters.get(attribute);
      if (value) assessment?.setAttribute(attribute, value);
    }
    // The bundled-model selector carries "model@version", for example
    // pqcmm@1.0.1; a named profile or profile URL takes precedence.
    const [model, modelVersion] = (parameters.get("assessment") ?? "").split(
      "@",
    );
    if (model && !parameters.get("profile")) {
      assessment?.setAttribute("model", model);
      if (modelVersion) assessment?.setAttribute("modelVersion", modelVersion);
    }
  };

  const restoreControl = (control, value) => {
    if (control instanceof HTMLInputElement) control.value = value;
    if (
      control instanceof HTMLSelectElement &&
      Array.from(control.options).some((option) => option.value === value)
    ) {
      control.value = value;
    }
  };

  applyAttributes();
  const form = document.querySelector(".preview-controls form");
  if (!(form instanceof HTMLFormElement)) return;

  for (const attribute of [...attributes, "assessment"]) {
    const value = parameters.get(attribute);
    if (value) restoreControl(form.elements.namedItem(attribute), value);
  }

  form.addEventListener("submit", () => {
    for (const attribute of attributes) {
      const control = form.elements.namedItem(attribute);
      if (control instanceof HTMLInputElement && !control.value.trim()) {
        control.disabled = true;
      }
    }
  });
})();
