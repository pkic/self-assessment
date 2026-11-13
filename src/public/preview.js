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

  for (const attribute of attributes) {
    const value = parameters.get(attribute);
    if (value) assessment?.setAttribute(attribute, value);
  }

  // The bundled-model selector carries "model@version", for example
  // pqcmm@1.0.1; a named profile or profile URL takes precedence.
  const [model, modelVersion] = (parameters.get("assessment") ?? "").split("@");
  if (model && !parameters.get("profile")) {
    assessment?.setAttribute("model", model);
    if (modelVersion) assessment?.setAttribute("modelVersion", modelVersion);
  }

  const form = document.querySelector(".preview-controls form");
  if (!(form instanceof HTMLFormElement)) return;

  for (const attribute of [...attributes, "assessment"]) {
    const control = form.elements.namedItem(attribute);
    const value = parameters.get(attribute);
    if (value && control instanceof HTMLInputElement) control.value = value;
    if (value && control instanceof HTMLSelectElement) {
      const optionExists = Array.from(control.options).some(
        (option) => option.value === value,
      );
      if (optionExists) control.value = value;
    }
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
