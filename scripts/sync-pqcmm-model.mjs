import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = resolve(
  process.env.PQCMM_SITE_ROOT ?? join(repositoryRoot, "..", "pkic.org"),
);
const sourceDirectory = join(siteRoot, "assets", "data", "pqcmm");
const targetDirectory = join(repositoryRoot, "src", "public");
const files = ["pqcmm-model-1.0.1.yaml", "pqcmm-model.schema-1.0.0.json"];

for (const file of files) {
  const source = join(sourceDirectory, file);
  if (!existsSync(source)) {
    throw new Error(
      `PQCMM source not found: ${source}. Set PQCMM_SITE_ROOT to the pkic.org checkout.`,
    );
  }
  copyFileSync(source, join(targetDirectory, file));
  console.log(`Synced ${file}`);
}
