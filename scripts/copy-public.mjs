import { copyFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDirectory = resolve("src/public");
const outputDirectory = resolve("dist");

await mkdir(outputDirectory, { recursive: true });
const entries = await readdir(sourceDirectory, { withFileTypes: true });
await Promise.all(
  entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      copyFile(
        resolve(sourceDirectory, entry.name),
        resolve(outputDirectory, entry.name),
      ),
    ),
);
