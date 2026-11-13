import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  branchSegment,
  publish,
  publishAlias,
  remove,
  writeSiteIndexes,
} from "./build-pages.mjs";

const now = new Date("2026-11-13T12:00:00Z");
const models = [
  { assessment: "pkimm", version: "2.0.0", draft: false },
  { assessment: "pqcmm", version: "1.0.1", draft: false },
];
const draft = { assessment: "pqcmm", version: "1.1.0", draft: true };

const setup = () => {
  const base = mkdtempSync(join(tmpdir(), "pages-"));
  const site = join(base, "site");
  const dist = join(base, "dist");
  mkdirSync(site);
  mkdirSync(dist);
  writeFileSync(join(dist, "self-assessment.js"), "bundle");
  writeFileSync(join(dist, "index.html"), "dev page");
  return { site, dist };
};

const read = (...parts) => readFileSync(join(...parts), "utf8");

test("publish writes the bundle, one page per model and an index", () => {
  const { site, dist } = setup();
  const manifest = publish({
    site,
    target: "preview/pr/42",
    dist,
    label: "Pull request #42",
    commit: "abcdef1234567",
    models,
    now,
  });
  const dir = join(site, "preview/pr/42");
  assert.equal(read(dir, "self-assessment.js"), "bundle");
  const page = read(dir, "pqcmm/1.0.1/index.html");
  assert.match(page, /<self-assessment modelVersion="1\.0\.1">/);
  assert.match(page, /src="\.\.\/\.\.\/self-assessment\.js"/);
  const index = read(dir, "index.html");
  assert.match(index, /href="pkimm\/2\.0\.0\/"/);
  assert.match(index, /Commit abcdef1/);
  assert.match(index, /href="\.\.\/\.\.\/\.\.\/"/);
  assert.deepEqual(JSON.parse(read(dir, "pages.json")), manifest);
});

test("publish replaces only its own folder", () => {
  const { site, dist } = setup();
  publish({ site, target: "preview/pr/1", dist, models, now });
  publish({ site, target: "preview/pr/2", dist, models, now });
  writeFileSync(join(site, "preview/pr/2/stale.txt"), "old");
  publish({
    site,
    target: "preview/pr/2",
    dist,
    models: models.slice(0, 1),
    now,
  });
  assert.ok(existsSync(join(site, "preview/pr/1/pqcmm/1.0.1/index.html")));
  assert.ok(!existsSync(join(site, "preview/pr/2/stale.txt")));
  assert.ok(!existsSync(join(site, "preview/pr/2/pqcmm")));
});

test("unsupported targets are refused", () => {
  const { site, dist } = setup();
  for (const target of [
    "",
    "develop",
    "preview/pr/abc",
    "preview/branch/../x",
    "preview/branch/..",
    "../out",
  ]) {
    assert.throws(
      () => publish({ site, target, dist, models, now }),
      /Unsupported target/,
    );
  }
  assert.throws(
    () => remove({ site, target: "release/../.." }),
    /Unsupported target/,
  );
});

test("branch names become one safe path segment", () => {
  assert.equal(branchSegment("feat/versioned-pages"), "feat-versioned-pages");
  assert.equal(branchSegment("main"), "main");
  assert.equal(branchSegment("../x"), "x");
  assert.equal(branchSegment("///"), "branch");
});

test("site indexes list releases, previews and earlier tool releases", () => {
  const { site, dist } = setup();
  publish({
    site,
    target: "release",
    dist,
    label: "Release 2.1.0",
    models,
    now,
  });
  publish({
    site,
    target: "preview/branch/main",
    dist,
    label: "main",
    commit: "1234567abc",
    models,
    now,
  });
  publish({
    site,
    target: "preview/pr/169",
    dist,
    label: "Pull request #169",
    models,
    now,
  });
  mkdirSync(join(site, "2.0.0"));
  writeFileSync(join(site, "2.0.0/index.html"), "old release");
  mkdirSync(join(site, "previews"));
  mkdirSync(join(site, ".git"));
  publishAlias({ site, alias: "develop", target: "preview/branch/main", dist });
  writeSiteIndexes(site);

  const root = read(site, "index.html");
  assert.match(root, /href="release\/pqcmm\/1\.0\.1\/"/);
  assert.match(root, /href="preview\/branch\/main\/">main \(1234567\)/);
  assert.match(root, /href="preview\/pr\/169\/"/);
  assert.match(root, /href="2\.0\.0\/"/);
  assert.match(root, /Release 2\.1\.0/);
  assert.doesNotMatch(root, /\.git|href="develop\/"|href="previews\/"/);
  assert.match(read(site, "preview/index.html"), /href="pr\/"/);
  assert.match(read(site, "preview/pr/index.html"), /href="169\/"/);
  assert.match(read(site, "preview/branch/index.html"), /href="main\/"/);

  const develop = read(site, "develop/index.html");
  assert.match(develop, /url=\.\.\/preview\/branch\/main\//);
  assert.equal(read(site, "develop/self-assessment.js"), "bundle");
});

test("an alias must be one top-level folder", () => {
  const { site, dist } = setup();
  for (const alias of [
    "",
    "a/b",
    "../x",
    ".hidden",
    "release",
    "Release 2.1.0",
  ]) {
    assert.throws(
      () => publishAlias({ site, alias, target: "release", dist }),
      /Unsupported alias/,
    );
  }
});

test("remove deletes a preview and the index no longer lists it", () => {
  const { site, dist } = setup();
  publish({ site, target: "preview/pr/7", dist, models, now });
  remove({ site, target: "preview/pr/7" });
  writeSiteIndexes(site);
  assert.ok(!existsSync(join(site, "preview/pr/7")));
  assert.doesNotMatch(read(site, "index.html"), /preview\/pr\/7/);
});

test("drafts are marked in previews and refused in a release", () => {
  const { site, dist } = setup();
  publish({
    site,
    target: "preview/pr/5",
    dist,
    models: [...models, draft],
    now,
  });
  assert.match(
    read(site, "preview/pr/5/index.html"),
    /Version 1\.1\.0 \(draft\)/,
  );
  assert.match(
    read(site, "preview/pr/5/pqcmm/1.1.0/index.html"),
    /PQCMM 1\.1\.0 \(draft\)/,
  );
  assert.throws(
    () =>
      publish({
        site,
        target: "release",
        dist,
        models: [...models, draft],
        now,
      }),
    /cannot include the draft PQCMM 1\.1\.0/,
  );
  assert.ok(!existsSync(join(site, "release")));
});

test("labels are escaped in the generated HTML", () => {
  const { site, dist } = setup();
  publish({
    site,
    target: "preview/pr/3",
    dist,
    label: "<script>x</script>",
    models,
    now,
  });
  assert.doesNotMatch(read(site, "preview/pr/3/index.html"), /<script>x/);
});
