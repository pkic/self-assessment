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
    html.replaceAll("__PREVIEW_BUILD__", revision),
    "utf8",
  );
};

await Promise.all(
  entries
    .filter((entry) => entry.isFile())
    .map((entry) => copyPublicFile(entry.name)),
);
