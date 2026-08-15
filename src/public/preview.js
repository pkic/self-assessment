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

  const componentScript = document.createElement("script");
  const componentUrl = new URL("self-assessment.js", window.location.href);
  componentUrl.searchParams.set("preview", document.lastModified);
  componentScript.src = componentUrl.href;
  document.body.append(componentScript);

  const form = document.querySelector(".preview-controls form");
  if (!(form instanceof HTMLFormElement)) return;

  for (const attribute of attributes) {
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
