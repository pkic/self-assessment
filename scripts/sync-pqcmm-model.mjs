import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pqcmmRoot = resolve(
  process.env.PQCMM_ROOT ?? join(repositoryRoot, "..", "pqcmm"),
);
const targetDirectory = join(repositoryRoot, "src", "public");
const files = [
  ["model/pqcmm-model-1.1.0.yaml", "pqcmm-model-1.1.0.yaml"],
  ["schemas/pqcmm-model.schema-1.1.0.json", "pqcmm-model.schema-1.1.0.json"],
  [
    "profiles/pqcmm-self-assessment-profile-1.1.0.yaml",
    "pqcmm-self-assessment-profile-1.1.0.yaml",
  ],
  [
    "schemas/assessment-profile.schema-1.1.0.json",
    "assessment-profile.schema-1.1.0.json",
  ],
];

for (const [sourcePath, targetName] of files) {
  const source = join(pqcmmRoot, sourcePath);
  if (!existsSync(source)) {
    throw new Error(
      `PQCMM source not found: ${source}. Set PQCMM_ROOT to the canonical PQCMM checkout.`,
    );
  }
  copyFileSync(source, join(targetDirectory, targetName));
  console.log(`Synced ${targetName}`);
}
