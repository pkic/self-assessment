import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  fetchModels,
  lockedModels,
  modelIndexSource,
  readLock,
  sha256,
} from "./fetch-models.mjs";

const body = Buffer.from("schemaVersion: 2.0.0\n");
const lockFor = (hash = sha256(body)) => ({
  lockVersion: 1,
  sources: [
    {
      id: "pkimm",
      repository: "pkic/pkimm",
      releases: [
        { tag: "2.0.0", files: [{ path: "data/model.yaml", sha256: hash }] },
      ],
    },
  ],
});

const dirs = () => {
  const root = mkdtempSync(join(tmpdir(), "fetch-models-"));
  return { outDir: join(root, "out"), cacheDir: join(root, "cache"), root };
};

const respond = (bytes, calls) => async (url) => {
  calls.push(url);
  return { ok: true, status: 200, arrayBuffer: async () => bytes };
};

const quiet = () => {};

test("downloads a locked file at its tag and caches it", async () => {
  const { outDir, cacheDir } = dirs();
  const calls = [];
  await fetchModels({
    lock: lockFor(),
    outDir,
    cacheDir,
    env: {},
    fetchImpl: respond(body, calls),
    log: quiet,
  });
  assert.deepEqual(calls, [
    "https://raw.githubusercontent.com/pkic/pkimm/refs/tags/2.0.0/data/model.yaml",
  ]);
  assert.deepEqual(readFileSync(join(outDir, "model.yaml")), body);

  // A second run reads the cache and needs no network.
  await fetchModels({
    lock: lockFor(),
    outDir,
    cacheDir,
    env: {},
    fetchImpl: () => {
      throw new Error("offline");
    },
    log: quiet,
  });
  assert.deepEqual(readFileSync(join(outDir, "model.yaml")), body);
});

test("rejects a download that does not match the lock", async () => {
  const { outDir, cacheDir } = dirs();
  await assert.rejects(
    fetchModels({
      lock: lockFor("0".repeat(64)),
      outDir,
      cacheDir,
      env: {},
      fetchImpl: respond(body, []),
      log: quiet,
    }),
    /does not match the hash in models\.lock\.json/,
  );
});

test("explains how to recover when offline with nothing cached", async () => {
  const { outDir, cacheDir } = dirs();
  await assert.rejects(
    fetchModels({
      lock: lockFor(),
      outDir,
      cacheDir,
      env: {},
      fetchImpl: () => {
        throw new Error("offline");
      },
      log: quiet,
    }),
    /not cached/,
  );
});

test("reads a local checkout when MODEL_SOURCE_<ID> is set", async () => {
  const { outDir, cacheDir, root } = dirs();
  const checkout = join(root, "checkout");
  mkdirSync(join(checkout, "data"), { recursive: true });
  writeFileSync(join(checkout, "data/model.yaml"), "draft: true\n");
  const logs = [];
  await fetchModels({
    lock: lockFor(),
    outDir,
    cacheDir,
    env: { MODEL_SOURCE_PKIMM: checkout },
    fetchImpl: () => {
      throw new Error("must not fetch");
    },
    log: (line) => logs.push(line),
  });
  assert.equal(
    readFileSync(join(outDir, "model.yaml"), "utf8"),
    "draft: true\n",
  );
  assert.match(logs[0], /not verified/);
});

test("records hashes for new lock entries with --lock", async () => {
  const { outDir, cacheDir } = dirs();
  const lock = lockFor();
  delete lock.sources[0].releases[0].files[0].sha256;
  const updated = await fetchModels({
    lock,
    outDir,
    cacheDir,
    env: {},
    fetchImpl: respond(body, []),
    log: quiet,
    record: true,
  });
  assert.equal(updated.sources[0].releases[0].files[0].sha256, sha256(body));
});

test("refuses lock entries that could escape the output folder", () => {
  const bad = lockFor();
  bad.sources[0].releases[0].files[0].path = "../secrets.yaml";
  assert.throws(() => readLock(JSON.stringify(bad)), /invalid path/);
  const twice = lockFor();
  twice.sources[0].releases.push({
    tag: "2.0.1",
    files: [{ path: "data/model.yaml", sha256: sha256(body) }],
  });
  assert.throws(() => readLock(JSON.stringify(twice)), /listed twice/);
});

test("the committed lock file is valid", () => {
  const text = readFileSync(
    new URL("../models.lock.json", import.meta.url),
    "utf8",
  );
  assert.doesNotThrow(() => readLock(text));
  assert.ok(readLock(text).sources.length > 0);
});

test("writes an index that imports every locked model", async () => {
  const { outDir, cacheDir } = dirs();
  const lock = lockFor();
  lock.sources[0].releases[0].files[0].modelVersion = "2.0.0";
  await fetchModels({
    lock,
    outDir,
    cacheDir,
    env: {},
    fetchImpl: respond(body, []),
    log: quiet,
  });
  assert.deepEqual(lockedModels(lock), [
    { assessment: "pkimm", version: "2.0.0", fileName: "model.yaml" },
  ]);
  const index = readFileSync(join(outDir, "index.ts"), "utf8");
  assert.equal(index, modelIndexSource(lock));
  assert.match(index, /import model0 from "\.\/model\.yaml";/);
  assert.match(index, /assessment: "pkimm", version: "2\.0\.0", yaml: model0/);
});

test("refuses a model version that is malformed or listed twice", () => {
  const bad = lockFor();
  bad.sources[0].releases[0].files[0].modelVersion = "v2";
  assert.throws(() => readLock(JSON.stringify(bad)), /invalid modelVersion/);
  const twice = lockFor();
  twice.sources[0].releases[0].files[0].modelVersion = "2.0.0";
  twice.sources[0].releases.push({
    tag: "2.0.0-again",
    files: [
      { path: "data/other.yaml", sha256: sha256(body), modelVersion: "2.0.0" },
    ],
  });
  assert.throws(() => readLock(JSON.stringify(twice)), /listed twice/);
});
