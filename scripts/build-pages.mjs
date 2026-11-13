// Lays out a build on the GitHub Pages site (a checkout of the gh-pages
// branch) and regenerates the index pages that navigate it:
//
//   release/                         the latest tool release
//   preview/branch/{branch}/         a branch build (main, or on demand)
//   preview/pr/{number}/             a pull-request build
//
// Each of these holds the bundle plus one page per bundled model release at
// {assessment}/{version}/, which loads that release through the modelVersion
// attribute. Every folder level, and the site root, gets an index.html that
// lists what is below it; older top-level folders such as /<tag>/ are listed
// as earlier releases and left untouched.
//
// Usage:
//   node scripts/build-pages.mjs publish --site DIR --target PATH --dist DIR
//        [--label TEXT] [--commit SHA] [--alias NAME]
//   node scripts/build-pages.mjs remove --site DIR --target PATH
//   node scripts/build-pages.mjs index --site DIR
//
// --branch NAME can stand in for --target preview/branch/NAME; the name is
// turned into a single safe path segment first.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "pages.json";
const ALIAS = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const RESERVED = new Set(["release", "preview"]);
const TARGET =
  /^(release|preview\/branch\/[A-Za-z0-9_-][A-Za-z0-9._-]*|preview\/pr\/\d+)$/;

/** A branch name as a single safe path segment. */
export const branchSegment = (branch) =>
  branch.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^[.-]+/, "") || "branch";

const checkTarget = (target) => {
  if (!TARGET.test(target)) {
    throw new Error(
      `Unsupported target ${target}: use release, preview/branch/NAME or preview/pr/NUMBER.`,
    );
  }
};

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

// Index pages get a narrow reading column. Model pages get no page styles,
// like the build's own page, so the widget lays itself out at full width.
const INDEX_STYLE = `<style>
      body { font-family: Roboto, system-ui, sans-serif; margin: 2rem auto; max-width: 48rem; padding: 0 1rem; line-height: 1.5; color: #1f2933; }
      h1 { font-size: 1.5rem; }
      h2 { font-size: 1.1rem; margin-top: 2rem; }
      ul { padding-left: 1.25rem; }
      .meta { color: #616e7c; font-size: 0.9rem; }
    </style>`;

const htmlDocument = (title, body, head = "") => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    ${head}
  </head>
  <body>
${body}
  </body>
</html>
`;

const page = (title, body, head = "") =>
  htmlDocument(title, body, `${head}${INDEX_STYLE}`);

const list = (items) =>
  items.length === 0
    ? '    <p class="meta">Nothing published yet.</p>'
    : `    <ul>\n${items.map((item) => `      <li>${item}</li>`).join("\n")}\n    </ul>`;

const link = (href, text) =>
  `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

const modelName = (model) =>
  `${model.assessment.toUpperCase()} ${model.version}${model.draft ? " (draft)" : ""}`;

const modelPage = (model, label) =>
  htmlDocument(
    `${modelName(model)} self-assessment${label ? `, ${label}` : ""}`,
    `    <self-assessment model="${escapeHtml(model.assessment)}" modelVersion="${escapeHtml(model.version)}"></self-assessment>
    <script src="../../self-assessment.js"></script>`,
  );

const groupByAssessment = (models) => {
  const groups = new Map();
  for (const model of models) {
    groups.set(model.assessment, [
      ...(groups.get(model.assessment) ?? []),
      model,
    ]);
  }
  return groups;
};

const buildIndex = (manifest) => {
  const sections = [...groupByAssessment(manifest.models)].map(
    ([assessment, models]) =>
      `    <h2>${escapeHtml(assessment.toUpperCase())}</h2>\n${list(
        models.map((model) =>
          link(
            `${model.path}/`,
            `Version ${model.version}${model.draft ? " (draft)" : ""}`,
          ),
        ),
      )}`,
  );
  const meta = [
    manifest.commit ? `Commit ${manifest.commit.slice(0, 7)}` : null,
    `built ${manifest.builtAt}`,
  ]
    .filter(Boolean)
    .join(", ");
  return page(
    `Self-assessment ${manifest.label}`,
    `    <h1>Self-assessment: ${escapeHtml(manifest.label)}</h1>
    <p class="meta">${escapeHtml(meta)}</p>
${sections.join("\n")}
${manifest.custom ? `    <p>${link("custom.html", "Load another profile or model")}</p>\n` : ""}    <p>${link("../".repeat(manifest.target.split("/").length), "All builds")}</p>`,
  );
};

/** Copies a build to site/target and writes its model pages and index. */
export function publish({ site, target, dist, label, commit, models, now }) {
  checkTarget(target);
  const draft = models.find((model) => model.draft);
  if (target === "release" && draft) {
    throw new Error(
      `A release cannot include the draft ${modelName(draft)}; build without MODEL_DRAFTS.`,
    );
  }
  const dir = join(site, target);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(dist, dir, { recursive: true });
  // The build's own page (profile and model controls) stays as custom.html;
  // index.html becomes the list of model pages.
  const custom = existsSync(join(dir, "index.html"));
  if (custom) renameSync(join(dir, "index.html"), join(dir, "custom.html"));
  const manifest = {
    target,
    label: label ?? target,
    commit: commit ?? null,
    builtAt: now.toISOString(),
    custom,
    models: models.map((model) => ({
      assessment: model.assessment,
      version: model.version,
      draft: model.draft === true,
      path: `${model.assessment}/${model.version}`,
    })),
  };
  for (const model of models) {
    const modelDir = join(dir, model.assessment, model.version);
    mkdirSync(modelDir, { recursive: true });
    writeFileSync(
      join(modelDir, "index.html"),
      modelPage(model, manifest.label),
    );
  }
  writeFileSync(join(dir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(dir, "index.html"), buildIndex(manifest));
  return manifest;
}

/**
 * Keeps an older path (such as /develop/) working: the build's files are
 * copied there for embeds that load its bundle, and its index.html sends
 * visitors to the target.
 */
export function publishAlias({ site, alias, target, dist }) {
  checkTarget(target);
  if (!ALIAS.test(alias) || RESERVED.has(alias)) {
    throw new Error(
      `Unsupported alias ${alias}: use one top-level folder name.`,
    );
  }
  const dir = join(site, alias);
  mkdirSync(dir, { recursive: true });
  cpSync(dist, dir, { recursive: true });
  const href = `${relative(dir, join(site, target))}/`;
  writeFileSync(
    join(dir, "index.html"),
    page(
      "Moved",
      `    <p>This page moved to ${link(href, href)}.</p>`,
      `<meta http-equiv="refresh" content="0; url=${escapeHtml(href)}" />\n    `,
    ),
  );
}

export function remove({ site, target }) {
  checkTarget(target);
  rmSync(join(site, target), { recursive: true, force: true });
}

const readManifest = (dir) => {
  const file = join(dir, MANIFEST);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
};

const subfolders = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => statSync(join(dir, name)).isDirectory())
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    : [];

const buildList = (site, parent) =>
  subfolders(join(site, parent))
    .map((name) => ({ name, manifest: readManifest(join(site, parent, name)) }))
    .filter(({ manifest }) => manifest !== null);

const describe = ({ manifest }) =>
  manifest.commit
    ? `${manifest.label} (${manifest.commit.slice(0, 7)})`
    : manifest.label;

/** Rewrites the root, preview/, preview/branch/ and preview/pr/ indexes. */
export function writeSiteIndexes(site) {
  const release = readManifest(join(site, "release"));
  const branches = buildList(site, "preview/branch");
  const prs = buildList(site, "preview/pr");
  // Folders an earlier release workflow published at /<tag>/, newest first:
  // each has a page at its root. /develop/ is the redirect to the main preview.
  const earlier = subfolders(site)
    .filter(
      (name) =>
        !RESERVED.has(name) &&
        name !== "develop" &&
        existsSync(join(site, name, "index.html")),
    )
    .reverse();

  const releaseSection = release
    ? list(
        release.models.map((model) =>
          link(`release/${model.path}/`, modelName(model)),
        ),
      )
    : list([]);
  const previewItems = (prefix, items) =>
    items.map((item) => link(`${prefix}/${item.name}/`, describe(item)));

  writeFileSync(
    join(site, "index.html"),
    page(
      "PKI Consortium self-assessment",
      `    <h1>PKI Consortium self-assessment</h1>
    <h2>Released</h2>
${release ? `    <p class="meta">${escapeHtml(release.label)}</p>\n` : ""}${releaseSection}
    <h2>Previews of branches</h2>
${list(previewItems("preview/branch", branches))}
    <h2>Previews of pull requests</h2>
${list(previewItems("preview/pr", prs))}
    <h2>Earlier tool releases</h2>
${list(earlier.map((name) => link(`${name}/`, name)))}`,
    ),
  );
  if (!existsSync(join(site, "preview"))) return;
  writeFileSync(
    join(site, "preview", "index.html"),
    page(
      "Self-assessment previews",
      `    <h1>Previews</h1>
${list([link("branch/", "Branches"), link("pr/", "Pull requests")])}
    <p>${link("../", "All builds")}</p>`,
    ),
  );
  for (const [kind, items, title] of [
    ["branch", branches, "Branch previews"],
    ["pr", prs, "Pull request previews"],
  ]) {
    const dir = join(site, "preview", kind);
    if (!existsSync(dir)) continue;
    writeFileSync(
      join(dir, "index.html"),
      page(
        title,
        `    <h1>${title}</h1>
${list(items.map((item) => link(`${item.name}/`, describe(item))))}
    <p>${link("../../", "All builds")}</p>`,
      ),
    );
  }
}

const option = (args, name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, ...args] = process.argv.slice(2);
  const site = option(args, "site");
  const branch = option(args, "branch");
  const target =
    option(args, "target") ??
    (branch === undefined
      ? undefined
      : `preview/branch/${branchSegment(branch)}`);
  try {
    if (!site) throw new Error("--site is required.");
    if (command === "publish") {
      // The models this build bundled, as written by fetch-models.mjs.
      const models = JSON.parse(
        readFileSync(join(root, "src/generated/models/models.json"), "utf8"),
      );
      publish({
        site,
        target,
        dist: option(args, "dist") ?? join(root, "dist"),
        label: option(args, "label"),
        commit: option(args, "commit"),
        models,
        now: new Date(),
      });
      const alias = option(args, "alias");
      if (alias) {
        publishAlias({
          site,
          alias,
          target,
          dist: option(args, "dist") ?? join(root, "dist"),
        });
      }
    } else if (command === "remove") {
      remove({ site, target });
    } else if (command !== "index") {
      throw new Error(
        `Unknown command ${command}: use publish, remove or index.`,
      );
    }
    writeSiteIndexes(site);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
