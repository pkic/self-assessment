import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

const sourceDirectory = resolve("src/public");
const outputDirectory = resolve("dist");

await mkdir(outputDirectory, { recursive: true });
const entries = await readdir(sourceDirectory, { withFileTypes: true });

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
  );

// One option per model this build bundles (written by fetch-models.mjs),
// so a preview offers its drafts and a release does not.
const bundledModelOptions = async () => {
  const models = JSON.parse(
    await readFile(resolve("src/generated/models/models.json"), "utf8"),
  );
  return models
    .map(({ assessment, version, draft }) => {
      const label = `${assessment.toUpperCase()} ${version}${draft ? " (draft)" : ""}`;
      return `<option value="${escapeHtml(`${assessment}@${version}`)}">${escapeHtml(label)}</option>`;
    })
    .join("\n            ");
};

const copyPublicFile = async (name) => {
  const source = resolve(sourceDirectory, name);
  const destination = resolve(outputDirectory, name);
  if (name !== "index.html") {
    await copyFile(source, destination);
    return;
  }

  const revision = encodeURIComponent(process.env.GITHUB_SHA ?? "local");
  const html = await readFile(source, "utf8");
  await writeFile(
    destination,
    html
      .replaceAll("__PREVIEW_BUILD__", revision)
      .replace("<!-- __BUNDLED_MODELS__ -->", await bundledModelOptions()),
    "utf8",
  );
};

await Promise.all(
  entries
    .filter((entry) => entry.isFile())
    .map((entry) => copyPublicFile(entry.name)),
);
