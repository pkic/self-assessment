// Fetches the released model files listed in models.lock.json into
// src/generated/models/, where the bundle imports them from.
//
// Each file is downloaded from its repository at the release tag and must
// match the SHA-256 recorded in the lock file, so a moved or re-uploaded tag
// fails the build instead of silently changing an assessment. Downloads are
// kept in .cache/models/ (git-ignored); later runs, including offline ones,
// read from there.
//
// Development override: MODEL_SOURCE_<ID>=/path/to/checkout (for example
// MODEL_SOURCE_PKIMM) reads that source's files from a local checkout at the
// same paths, without hash checks, to try an unreleased model.
//
// Files marked with "modelVersion" are the source's model at that version;
// files marked "profile": true are assessment profiles for that release's
// model, bundled alongside it.
// The script also writes src/generated/models/index.ts, which imports each of
// them, so every released model in the lock file is bundled and selectable,
// and models.json, which lists them for scripts/build-pages.mjs.
//
// A release may instead name a "commit" and be marked "draft": an unreleased
// model pinned to one commit, still checked against its hash. Its files are
// always fetched (code may need its schemas), but its models are only listed
// in index.ts and models.json, and so bundled and offered, when
// MODEL_DRAFTS=1 (preview builds), never in a release build. A file's "as"
// sets its output name, for drafts whose files are not yet named by version.
//
// Usage:
//   node scripts/fetch-models.mjs          fetch and verify (pre-build/test)
//   node scripts/fetch-models.mjs --lock   record hashes for new lock entries
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHA256 = /^[0-9a-f]{64}$/;
const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const COMMIT = /^[0-9a-f]{40}$/;
const FILE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const REPOSITORY = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

const fail = (message) => {
  throw new Error(`models.lock.json: ${message}`);
};

const checkFile = (file, outputs, versions) => {
  if (!PATH.test(file.path ?? "") || file.path.includes("..")) {
    fail(`invalid path ${file.path}.`);
  }
  if (file.sha256 !== undefined && !SHA256.test(file.sha256)) {
    fail(`invalid hash for ${file.path}.`);
  }
  if (file.modelVersion !== undefined) {
    if (!VERSION.test(file.modelVersion)) {
      fail(`invalid modelVersion for ${file.path}.`);
    }
    if (versions.has(file.modelVersion)) {
      fail(`model version ${file.modelVersion} is listed twice.`);
    }
    versions.add(file.modelVersion);
  }
  if (file.profile !== undefined && file.profile !== true) {
    fail(`profile must be true or absent for ${file.path}.`);
  }
  if (file.as !== undefined && !FILE_NAME.test(file.as)) {
    fail(`invalid output name ${file.as}.`);
  }
  // Every file lands in one flat output folder, named by its file name.
  const output = outputName(file);
  if (outputs.has(output)) fail(`${output} is listed twice.`);
  outputs.add(output);
};

const outputName = (file) => file.as ?? basename(file.path);

/** A release names exactly one of a tag or, for a draft, a commit. */
const checkRelease = (source, release) => {
  if (release.draft === true) {
    if (!COMMIT.test(release.commit ?? "") || release.tag !== undefined) {
      fail(`a draft of ${source.id} needs a full commit hash and no tag.`);
    }
  } else if (release.draft !== undefined || release.commit !== undefined) {
    fail(`only a draft of ${source.id} may name a commit.`);
  } else if (!TAG.test(release.tag ?? "")) {
    fail(`invalid tag for ${source.id}.`);
  }
};

/** The ref a release is downloaded at: its tag, or a draft's commit. */
const releaseRef = (release) => release.tag ?? release.commit;

/** The releases whose models a build offers: drafts only when asked for. */
export const includedReleases = (source, { drafts = false } = {}) =>
  source.releases.filter((release) => drafts || release.draft !== true);

const checkSource = (source, outputs) => {
  if (!/^[a-z][a-z0-9-]*$/.test(source.id ?? "")) {
    fail(`invalid source id ${source.id}.`);
  }
  if (!REPOSITORY.test(source.repository ?? "")) {
    fail(`invalid repository for ${source.id}.`);
  }
  const versions = new Set();
  for (const release of source.releases ?? []) {
    checkRelease(source, release);
    for (const file of release.files ?? []) {
      checkFile(file, outputs, versions);
    }
    const files = release.files ?? [];
    if (
      files.some((file) => file.profile) &&
      files.filter((file) => file.modelVersion !== undefined).length !== 1
    ) {
      fail(`a release of ${source.id} with profiles needs exactly one model.`);
    }
  }
};

/** Checks the lock file's shape; returns the lock or throws. */
export function readLock(text) {
  const lock = JSON.parse(text);
  if (lock.lockVersion !== 1 || !Array.isArray(lock.sources)) {
    fail("expected lockVersion 1 with sources.");
  }
  const outputs = new Set();
  for (const source of lock.sources) checkSource(source, outputs);
  return lock;
}

/** The model files a build includes: one per source and version. */
export const lockedModels = (lock, options) =>
  lock.sources.flatMap((source) =>
    includedReleases(source, options).flatMap((release) =>
      release.files
        .filter((file) => file.modelVersion !== undefined)
        .map((file) => ({
          assessment: source.id,
          version: file.modelVersion,
          draft: release.draft === true,
          fileName: outputName(file),
        })),
    ),
  );

/** The profile files a build includes, with their release's model. */
export const lockedProfiles = (lock, options) =>
  lock.sources.flatMap((source) =>
    includedReleases(source, options).flatMap((release) => {
      const model = release.files.find(
        (file) => file.modelVersion !== undefined,
      );
      return release.files
        .filter((file) => file.profile)
        .map((file) => ({
          assessment: source.id,
          version: model.modelVersion,
          draft: release.draft === true,
          fileName: outputName(file),
        }));
    }),
  );

/**
 * Source of src/generated/models/index.ts: one import per locked model, so
 * webpack bundles every released version.
 */
export const modelIndexSource = (lock, options) => {
  const models = lockedModels(lock, options);
  const profiles = lockedProfiles(lock, options);
  const imports = [
    ...models.map(
      ({ fileName }, index) => `import model${index} from "./${fileName}";`,
    ),
    ...profiles.map(
      ({ fileName }, index) => `import profile${index} from "./${fileName}";`,
    ),
  ];
  const entry = (name) => (item, index) =>
    `  { assessment: ${JSON.stringify(item.assessment)}, version: ${JSON.stringify(item.version)}, draft: ${item.draft}, yaml: ${name}${index} },`;
  const entries = models.map(entry("model"));
  const profileEntries = profiles.map(entry("profile"));
  return [
    "// Generated by scripts/fetch-models.mjs from models.lock.json. Do not edit.",
    ...imports,
    "",
    "export interface ReleasedModel {",
    "  assessment: string;",
    "  version: string;",
    "  /** An unreleased model, only in preview builds. */",
    "  draft: boolean;",
    "  yaml: string;",
    "}",
    "",
    "export const RELEASED_MODELS: ReleasedModel[] = [",
    ...entries,
    "];",
    "",
    "/** Assessment profiles; version is the model version they assess. */",
    "export const RELEASED_PROFILES: ReleasedModel[] = [",
    ...profileEntries,
    "];",
    "",
  ].join("\n");
};

const overrideFor = (source, env) =>
  env[`MODEL_SOURCE_${source.id.toUpperCase().replaceAll("-", "_")}`];

const rawUrl = (source, release, file) =>
  release.draft === true
    ? `https://raw.githubusercontent.com/${source.repository}/${release.commit}/${file.path}`
    : `https://raw.githubusercontent.com/${source.repository}/refs/tags/${release.tag}/${file.path}`;

/**
 * Returns the verified bytes of one locked file: from the cache, else from
 * the network (then cached). Throws when the hash doesn't match.
 */
async function lockedBytes(source, release, file, { cacheDir, fetchImpl }) {
  const cached = join(cacheDir, source.id, releaseRef(release), file.path);
  if (existsSync(cached)) {
    const bytes = readFileSync(cached);
    if (sha256(bytes) === file.sha256) return bytes;
  }
  const url = rawUrl(source, release, file);
  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new Error(
      `Cannot download ${url} and it is not cached. Connect to the network once to fill .cache/models/.`,
      { cause: error },
    );
  }
  if (!response.ok) {
    throw new Error(`Cannot download ${url}: HTTP ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (file.sha256 !== undefined && sha256(bytes) !== file.sha256) {
    throw new Error(
      `${source.repository}@${releaseRef(release)}:${file.path} does not match the hash in models.lock.json. The release changed; check it before updating the lock.`,
    );
  }
  mkdirSync(dirname(cached), { recursive: true });
  writeFileSync(cached, bytes);
  return bytes;
}

/** Returns one file's bytes: from a local checkout, or locked and verified. */
async function fileBytes(source, release, file, options) {
  if (options.checkout) return readFileSync(join(options.checkout, file.path));
  if (file.sha256 === undefined && !options.record) {
    throw new Error(
      `${file.path} has no hash in models.lock.json. Run: node scripts/fetch-models.mjs --lock`,
    );
  }
  const bytes = await lockedBytes(source, release, file, options);
  if (options.record && file.sha256 === undefined) file.sha256 = sha256(bytes);
  return bytes;
}

/**
 * Fetches every locked file into outDir. With `record: true`, entries without
 * a hash get the hash of what was downloaded, and the updated lock is
 * returned.
 */
export async function fetchModels({
  lock,
  outDir,
  cacheDir,
  env = process.env,
  fetchImpl = fetch,
  log = console.log,
  record = false,
}) {
  const drafts = env.MODEL_DRAFTS === "1";
  mkdirSync(outDir, { recursive: true });
  const entries = lock.sources.flatMap((source) => {
    const checkout = overrideFor(source, env);
    if (checkout) {
      log(
        `Using ${source.id} from ${checkout} (MODEL_SOURCE override, not verified against models.lock.json).`,
      );
    }
    const options = { checkout, record, cacheDir, fetchImpl };
    return source.releases.flatMap((release) =>
      release.files.map((file) => ({ source, release, file, options })),
    );
  });
  const contents = await Promise.all(
    entries.map(({ source, release, file, options }) =>
      fileBytes(source, release, file, options),
    ),
  );
  entries.forEach(({ file }, index) =>
    writeFileSync(join(outDir, outputName(file)), contents[index]),
  );
  writeFileSync(join(outDir, "index.ts"), modelIndexSource(lock, { drafts }));
  const models = lockedModels(lock, { drafts }).map(
    ({ assessment, version, draft }) => ({ assessment, version, draft }),
  );
  writeFileSync(
    join(outDir, "models.json"),
    `${JSON.stringify(models, null, 2)}\n`,
  );
  return lock;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const lockPath = join(root, "models.lock.json");
  const record = process.argv.includes("--lock");
  const lock = readLock(readFileSync(lockPath, "utf8"));
  try {
    const updated = await fetchModels({
      lock,
      outDir: join(root, "src/generated/models"),
      cacheDir: join(root, ".cache/models"),
      record,
    });
    if (record) {
      writeFileSync(lockPath, `${JSON.stringify(updated, null, 2)}\n`);
      console.log("Recorded hashes in models.lock.json.");
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
