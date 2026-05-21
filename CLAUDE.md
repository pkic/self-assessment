# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`@pkic/self-assessment` is a **self-contained web component** (a UMD bundle, not an SPA) that embeds the PKI Consortium's PKI Maturity Model (PKIMM) self-assessment into any HTML page via a `<self-assessment>` custom element. Consumers load `dist/self-assessment.js` plus YAML data/config files and drop the tag in their page. Assessment data, config, and optional extensions are all fetched from URLs supplied as attributes (`dataUrl`, `configUrl`, `extensionsUrl`).

Because it is embedded in arbitrary host pages, design decisions revolve around isolation and theming: CSS class names are intentionally **un-hashed** but namespaced with a `pkimm-` prefix, and visual tokens are exposed as `--pkimm-*` CSS custom properties that hosts may override.

## Commands

Node version is pinned via `.node-version` (currently 22.x).

```bash
npm install          # install deps
npm run start        # webpack dev server on http://localhost:9000 (serves dist/)
npm run build        # production UMD build → dist/self-assessment.js
npm test             # jest (ts-jest, node env)
npm test -- src/utils/yamlParser.test.ts   # run a single test file
npm run lint         # eslint --fix
npm run lint:check   # eslint, no fix
npm run format       # prettier --write
npm run format:check # prettier --check
```

Note for local dev: `webpack-dev-server` serves the `dist/` directory. For the component to actually render, the dev page (`src/public/index.html`) and runtime YAML files (`src/public/pkimm-model-*.yaml`, `src/public/pkimm-references.yaml`, `src/public/config.yaml`) need to be in `dist/`. CI does this with explicit `cp` steps after `npm run build` — locally you may need to run `npm run build` once (or copy them manually) before `npm run start` will show data.

## Architecture

### Entry path

`src/index.tsx` → `src/SelfAssessmentComponent.tsx` (defines the `<self-assessment>` Custom Element, reads `dataUrl`/`configUrl`/`extensionsUrl` attributes, mounts via React 19 `createRoot`) → `src/App.tsx` → `src/components/Assessment/Assessment.tsx`.

Webpack outputs UMD with `library: "SelfAssessment"`. The bundle registers the custom element on import, so consumers just `<script src=…>` it.

### Where the state lives

`Assessment.tsx` is the workhorse component and owns all mutable widget state. Persistence and shape changed substantially in 2.0.0:

- **localStorage["pkimm-sa"]** holds a `SavedState`: `{ stateSchemaVersion, activeId, assessments[] }`. Each `Assessment` carries its own `progress`, `enabledExtensions` (id+version objects), `assessmentName`/`assessorName`/`useCaseDescription`, a `sourceStructure.byKey` snapshot used by the migration engine, and a `meta` block with `createdAt`/`updatedAt`/`importedFromId`. A `storage` event listener syncs across tabs.
- **localStorage["assessmentData"]** is the legacy 1.0.0 key. The widget detects it non-destructively and offers the user a one-time prompt to import or keep separate; it is never written to anymore, never auto-deleted.
- **URL hash** (`generateURL` / `decodeProgressHash` in `src/utils/urlGenerator.ts`) carries `stateSchemaVersion`, `dataVersion`, `progress`, `enabledExtensions[]`, and the three name fields. Hashes from the released 1.0.0 widget (no version fields) still decode as a `dataVersion: "1.0.0"` payload. Progress in the hash is **compacted** to `{ level, applicability }` per category (drops `result` and `description` because both are derivable). The load effect in `Assessment.tsx` re-hydrates the full ProgressData from the source YAML before placing the transient assessment into state. localStorage and exported YAML stay in the full shape — only the URL is compact.
- **QR code**: the Share modal renders the URL as a 200 px SVG QR (`qrcode.react`); both PDF reports embed a 140 px PNG QR on the cover page (`qrcode` library, error correction level M). Both gracefully fall back when the URL exceeds the ~2.9 KB QR upper bound.

A URL hash always renders as a **transient assessment** (id prefixed `transient-`); it lives in memory only, never auto-persists, and the `TransientAssessmentBanner` gives the user explicit Save/Discard.

Progress keys:

- Core categories: `${moduleId}.${categoryId}` (2.0.0 uses kebab ids, e.g. `G.strategy-and-vision`; 1.0.0 used positional `G.1`).
- Core requirements: `${moduleId}.${categoryId}.${requirementId}`.
- Extension-scoped entries: `${extensionId}.${moduleId}.${categoryId}`.

The four core modules are fixed and validated by the JSON schema: G (Governance), M (Management), O (Operations), R (Resources).

### Vendored schemas and YAMLs (`src/public/`)

Built-in schemas are imported by `yamlParser.ts` and inlined into the bundle by webpack; the runtime YAMLs are served from gh-pages.

- `pkimm-model.schema-1.0.0.json` (draft-07), `pkimm-model.schema-2.0.0.json` (draft-07)
- `pkimm-references.schema-1.0.0.json` (draft-07)
- `extension.schema-1.0.0.json` (draft 2020-12)
- `pkimm-model-1.0.0.yaml`, `pkimm-model-2.0.0.yaml`, `pkimm-references.yaml`

Two Ajv instances handle the mixed drafts — `Ajv` for draft-07 and `Ajv2020` for the extension schema. `yamlParser.validateSchema` dispatches via a `${kind}:${schemaVersion}` key.

### Schema-aware parser (`src/utils/yamlParser.ts`)

`yamlParser` discriminates between `AssessmentData` (`modules`), `ExtensionData` (`extension`), `ReferencesCatalog` (`references` without `modules`), and `ConfigData` (`email` / `overview`) by sniffing top-level keys. `validateSchema` is a separate exported helper; ConfigData is skipped (no schemaVersion); model/extension/references go to their respective compiled Ajv validator. Unknown schemaVersion throws a clear "upgrade the widget" error.

### Migration engine (`src/utils/stateMigration.ts`)

Pure function `migrate(source: Assessment, target: AssessmentData, loadedExtensions?: ExtensionData[]): MigrationResult` maps a saved assessment's progress to a different version's category/requirement ids by **name**, using the assessment's `sourceStructure.byKey` snapshot. Cases handled:

- Core categories/requirements: matched by `${moduleId}|${normalize(categoryName)}` and, for requirements, by description.
- Extension-scoped entries: same lookup, prefixed with the extension id; version bumps update the corresponding `enabledExtensions[]` record.
- Extensions referenced by saved progress but not loaded on this page: progress is preserved at the original key.
- Whitespace/case differences in names are tolerated; the legacy 1.0.0 typo `"he scope of policies..."` is preserved verbatim so it surfaces as `unmappedFromSource` rather than silently matching the 2.0.0 corrected wording.

The migration summary (`mapped`, `addedInTarget`, `unmappedFromSource`, `reclassifiedLevel1ToZero`) drives the `MigrationSummary` modal.

### Legacy reclassification (`src/utils/legacyReclassify.ts`)

`reclassifyUntouchedLevelOne(progress, sourceData)` resets entries with `level === 1` and unchanged level-1 description text back to `level === 0` (Not Assessed). This is called only on legacy import, never on subsequent saves.

### Bundled legacy names (`src/legacy/pkimm-model-1.0.0-names.ts`)

A frozen JSON-like map from the released 1.0.0 widget's progress keys (`G.1`, `G.1.1`, …) to `{ moduleId, categoryName, requirementName? }`. Used by `storage.importLegacyData` to populate `sourceStructure.byKey` without re-fetching the 1.0.0 YAML.

### Storage helpers (`src/utils/storage.ts`)

- `readSavedState` / `writeSavedState` — typed access to `pkimm-sa`; throws if `stateSchemaVersion` is newer than the widget supports.
- `detectLegacyAssessmentData` — returns the parsed `assessmentData` payload only when `pkimm-sa` is absent (used by the first-load auto-prompt).
- `readLegacyAssessmentData` — returns the parsed payload without the first-load guard (used by the AssessmentManager's explicit "Import legacy" button, which fires even when `pkimm-sa` already exists).
- `importLegacyData` — turns a legacy payload into an `Assessment` with a `sourceStructure` populated from `PKIMM_1_0_0_NAMES`.
- `removeLegacyAssessmentData` — explicit user action only.
- `importYAMLFile` — discriminates new exports (have `dataVersion` + new shape) from legacy single-assessment YAMLs.
- `newEmptyAssessment(dataVersion, sourceStructure)` and `buildStructureSnapshot(data)`. `newEmptyAssessment` seeds level-0 progress entries for every core category, so the rest of the widget never sees a missing progress entry.
- Ids use `crypto.randomUUID()` with a `id-${Date.now()}-…` fallback for environments without the web standard.

### Maturity math (`src/utils/maturityCalculations.ts`)

This file is where the model gets non-trivial — read it carefully before changing scoring behavior.

- `getEffectiveWeight` applies category-level overlays (`override` > `multiplier` > `addition`).
- `getWeightSum` (private) sums requirement weights for a category, applying any per-requirement overlays from active extensions.
- `calculateBlendedLevel` is the key formula: blends a core category's level with the extension's relevance level using `(Level_C * WeightSum_C + RelLevel_C * RelWeight_C) / (WeightSum_C + RelWeight_C)`. Returns `-1` for explicit Not Applicable; returns the core level when the extension dimension is unrated; returns 0 when the core itself is unrated.
- `calculateOverallMaturityLevel` / `calculateModuleMaturityLevels` produce floored weighted averages. Not Assessed (level 0) and Not Applicable categories are **excluded** from the rollup, matching the framework spec.
- `calculateExtensionMaturityLevels` computes per-extension overall maturity using `effective_category_weight` per the [scoring spec](https://pkic.org/wg/pkimm/extensions/scoring/).
- `calculateExtensionFloorScore` returns the minimum blended level across applicable, assessed categories — only when `extension.floorScore === true`.
- `calculateExtensionWeightedPKIMMScore` uses baseline `Level_C` with extension-adjusted weights (NOT blended) per spec.
- `getCategoryOverlayInfo` returns a structured `CategoryOverlayDetails` shape (`{ category?, requirements[] }`); each entry carries `operation`, `value`, `base`, and `effective`. The Report tab and PDF render the same data side-by-side and stay in sync.
- 52 spec-anchored tests live in `maturityCalculations.test.ts` — when changing scoring math, run them and update them; they should keep tracking the published worked examples.

Scores are always `Math.floor()`-ed before display. `LevelResult` enum maps `-1 → "Not Applicable"`, `0 → "Not Assessed"`, `1–5 → "Initial"…"Optimized"`. In 2.0.0 the level-2 label is **"Foundational"** (renamed from "Basic"); the legacy `"2 - Basic"` string still appears in 1.0.0 fixtures and is rewritten on migration.

### Extensions and the AssessmentTargetContext

`AssessmentTargetContext` (`src/contexts/AssessmentTargetContext.tsx`) does **not** own progress — it only tracks which target is currently being viewed (`{ kind: 'original' }` vs `{ kind: 'extension', id }`). Components consume it to decide whether to render the baseline UI or extension-specific UI. Enabling an extension is independent of selecting it as the active target.

Each extension YAML has:

1. **`extension`** — id, name, version, description, optional `documentation`, optional `compatibility: string[]` (compatible model versions), optional `floorScore`.
2. **`relevance.modules[].categories[]`** — categories the extension cares about, with its own `weight`, `levels`, `guidance`, `assessment`, `references`.
3. **`overlays.modules[].categories[]`** (optional) — modifiers (`type: multiplier | addition | override`) applied to the core category weight and/or its requirement weights.

The widget enforces `compatibility`: extensions whose array doesn't include the loaded model version are surfaced in the Extensions tab with a disabled toggle and an "incompatible" badge.

### References (`referencesUrl` attribute)

When the consumer sets `referencesUrl` on the custom element, the load effect fetches the catalog, parses it as a `ReferencesCatalog`, and builds a `Map<id, ReferenceEntry>` (`referencesLookup` state). Any extension-local `references[]` block declared in an extension YAML is merged into the same map (later entries win on collisions). The map is then:

- Passed down to each `Category` component — when the user opens a core category, a "References (N)" `<details>` disclosure renders below the level cards. Each row: title (linked to URL), authority, region pills. Extension category cards do the same against the extension's local references.
- Collected per-PDF — `Assessment.tsx`'s `collectReferencedEntries(modules)` walks the rendered modules, deduplicates ids, looks up each, and passes the resolved array into `exportToPDF` / `exportExtensionPDF`. Both PDFs add a sorted **References** appendix page (title / authority / regions columns) between the report body and the final About page.

Graceful degradation:

- `referencesUrl` not set → empty lookup → disclosure doesn't render, PDF appendix page returns `null`.
- A category cites an id that's missing from the catalog → silently filtered out; other references still render.

`RequirementData.references` and `ExtensionCategoryData.references` are typed as `string | string[]` to accommodate both the 1.0.0 markdown shape and the 2.0.0 id-array shape. Only the id-array shape is resolved against the catalog; the legacy markdown string is currently ignored by the disclosure.

### Tabs / new UI surfaces

- **Header** carries a privacy chip (`🔒 Stored in this browser only`) and, when >1 assessment is saved, an active-assessment label so the user always knows which one they're editing. On mobile, the label moves to a dedicated row below the header.
- **Nav** is split into two groups: content tabs (Overview, modules G/M/O/R, Report) and meta tabs (Extensions when loaded, Assessments), separated by a vertical divider on desktop and a horizontal one on mobile. Extensions tab is hidden entirely when `extensionsUrl` is empty or fails to load.
- **Right-rail progress panel** below the spider chart shows Overall + per-module + per-enabled-extension progress as labelled bars. Bar fill and level text are coloured by the achieved maturity level (`--pkimm-maturity-level-N`).
- **Assessments** tab → `AssessmentManager` (list, create, rename, duplicate, delete, download, upload; legacy import + remove actions). Per-row icon buttons; version shown as colour-coded compatibility badge.
- **LegacyImportPrompt** (red warning banner) appears on first load when `assessmentData` is present and `pkimm-sa` is empty.
- **TransientAssessmentBanner** appears when a `#progress=` URL hash is active; explicit Save persists, Discard drops.
- **MigrationBanner** detects per-axis version mismatches between the active assessment and the loaded model/extension versions; offers Migrate (runs the migration engine, surfaces the summary modal) or Start fresh (creates a new empty assessment).
- **MigrationSummary** modal lists mapped/added/unmapped/reclassified counts.
- **ForwardCompatRefusal** replaces the whole widget when the saved state's `stateSchemaVersion` is newer than the widget supports; offers a raw-JSON download so the user never loses data.
- **Hidden-extension notice** appears at the top when the active assessment references extensions not loaded on this page.
- **"Assessment in progress" notice** on the Report tab with a progress bar and explanation that Not Assessed / Not Applicable categories are excluded from the calculation.
- **"About these metrics"** disclosure on the Report tab — collapsed by default; expanded shows definitions for Overall, Extension Score, Floor Score, Extension-Weighted PKI Maturity.
- **Share modal** renders the assessment URL with a side-by-side QR code (drops to text-only fallback when URL > QR limit).
- **PDF cover page** centres a 140 px QR code below the title with caption "Scan to open the assessment".
- **Overlay Details** in the Report and PDF use a structured single-line layout per overlay: `[label] base → effective [operation badge]`. Operation badge colours: × multiplier = primary, + addition = success, = override = warning.

## Host theming

The widget is intentionally generic so it can ship into any host page. Hosts theme it by overriding `--pkimm-*` custom properties in their own CSS. Defaults are deliberately neutral; pick what you want to override.

Tokens worth overriding for brand alignment:

| Token                                                                                                         | What it controls                                           |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `--pkimm-font-family`                                                                                         | Whole widget's font stack (Roboto first by default)        |
| `--pkimm-primary-color`, `--pkimm-primary-color-hover`, `--pkimm-primary-color-lighter`                       | Brand colour for buttons, tabs, active rows, progress bars |
| `--pkimm-secondary-color`                                                                                     | Extension accent (badges, `ext` tag)                       |
| `--pkimm-text-color-dark`, `--pkimm-text-color-muted`, `--pkimm-text-color-light`                             | Body / caption / on-primary text                           |
| `--pkimm-background-color`, `--pkimm-surface-color`, `--pkimm-surface-color-alt`                              | Page bg / card bg / alt input fill                         |
| `--pkimm-border-color`, `--pkimm-border-radius-{sm,md,lg,badge,pill}`                                         | Card/row borders + radii                                   |
| `--pkimm-shadow-sm`, `--pkimm-shadow-md`, `--pkimm-shadow-header`                                             | Card / dropdown / sticky-header elevation                  |
| `--pkimm-banner-{bg,border,fg}`, `--pkimm-success-{bg,border,fg}`, `--pkimm-danger-{bg,border,fg}`            | Notice/banner/badge semantics                              |
| `--pkimm-overlay-color`                                                                                       | Modal overlay                                              |
| `--pkimm-hover-bg(-subtle)`, `--pkimm-hover-bg-extension(-subtle)`                                            | Interactive hover surfaces                                 |
| `--pkimm-table-stripe-bg`, `--pkimm-table-row-hover-bg`, `--pkimm-table-header-bg`, `--pkimm-table-header-fg` | Report table look                                          |
| `--pkimm-maturity-level-{1,2,3,4,5}`                                                                          | Per-level chart and badge colours                          |

Example — making the widget look native on **pkic.org** (Bootstrap-based, green primary, Roboto, dark table headers):

```css
self-assessment {
  --pkimm-primary-color: rgb(25, 135, 84);
  --pkimm-primary-color-hover: rgb(20, 108, 67);
  --pkimm-primary-color-lighter: rgb(212, 237, 218);
  --pkimm-secondary-color: rgb(255, 192, 0);
  --pkimm-table-header-bg: rgb(33, 37, 41);
  --pkimm-table-header-fg: #fff;
}
```

(The font stays Roboto without any override because the widget's default stack already lists Roboto first; pkic.org bundles Roboto, so the widget picks it up automatically.)

## Conventions & gotchas

- **CSS class names are NOT hashed.** Webpack uses `localIdentName: "[local]"` for `.module.scss` files. The `pkimm-` prefix is what prevents host-page collisions — use it for any new class. CSS variables exposed to hosts must be added in `src/index.module.scss`.
- **`src/version.ts` imports `package.json`.** The bundle includes the version string at build time and renders it in the spider-chart corner. Bumping `package.json#version` is the only step needed to roll the displayed version.
- **Empty dirs `src/components/ExtensionAssessment/`, `ExtensionReport/`, `ExtensionsView/`** are leftovers from a refactor. Extension support now lives inside the unified `Assessment`, `Module`, `Category`, `Report` components routed by `AssessmentTargetContext`. Don't add new code there; extend the unified components.
- **Test environment is `node`, not `jsdom`.** `jest.config.js` is intentionally minimal — keep new tests pure (no DOM). Tests live next to the unit they test (`src/utils/*.test.ts`, `src/legacy/*.test.ts`).
- **ESLint uses flat config** (`eslint.config.mjs`) and ignores `dist/`. Custom rules: `semi: error`, `prefer-const: error`, `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: ^_`.
- **PDF export trick:** `handleExportPDF`/`handleExportExtensionPDF` temporarily override `chartExtensionsOverride` and disable chart animation, wait for a paint, then capture the canvas. Don't remove the `setTimeout(100)` without verifying the chart canvas is fully painted.
- **Schemas stay build-time only.** The JSON schemas are imported by `yamlParser.ts` and inlined into the bundle. They're not copied into `dist/` — the pkimm repo is the canonical public source.

## CI / deployment

- **PRs → main**: `check_build.yml` (build sanity), `check_linting.yml`, `check_formatting.yml`, `test.yml`. Use `NODE_OPTIONS=--max_old_space_size=4096` for `npm run build` to match CI memory budget.
- **Push to main**: `deploy_gh_pages.yml` builds and copies `index.html`, `config.yaml`, and the three runtime YAMLs (`pkimm-model-1.0.0.yaml`, `pkimm-model-2.0.0.yaml`, `pkimm-references.yaml`) from `src/public/` into `dist/`, then publishes to the `gh-pages` branch under `develop/` — served at `pkic.github.io/self-assessment/develop/`.
- **Push tag (`*`)**: `release.yml` does the same, publishing under `gh-pages/<tag>/` — served at `pkic.github.io/self-assessment/<tag>/`.
- **GitHub Release published**: `release-package.yml` publishes the npm package `@pkic/self-assessment` to GitHub Packages (`npm.pkg.github.com`).
