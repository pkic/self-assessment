# PKI Consortium Assessment Web Component

A self-contained, profile-driven web component for PKI Consortium assessments. The assessment profile selects the model, user experience, scoring methodology and parameters, subject fields, assurance policy, and report behavior. PKIMM and PQCMM are bundled profiles; adding another assessment does not require a new HTTP route or a model-id branch in the application.

## Quick start

Include the component in your HTML. No attributes are needed — the widget renders the latest PKIMM model (2.0.0) with its references catalog out of the box:

```html
<self-assessment></self-assessment>
<script src="https://pkic.github.io/self-assessment/release/self-assessment.js"></script>
```

`release/` is the latest tool release. Folders published by earlier releases (`/v2.0.1/` and older) stay available if you need to pin one.

## Hosted pages

[pkic.github.io/self-assessment](https://pkic.github.io/self-assessment/) lists every published build:

- `release/{assessment}/{version}/`: the latest tool release with a given model release, for example `release/pkimm/2.0.0/`.
- `preview/branch/{branch}/{assessment}/{version}/`: a branch build. `main` is published on every push (`/develop/` redirects to it); other branches when the deploy workflow is run for them. The branch name becomes one path segment, with characters other than letters, digits, `.`, `_` and `-` replaced by `-`.
- `preview/pr/{number}/{assessment}/{version}/`: a build of a pull request from a branch of this repository, removed when the pull request closes. Pull requests from forks get no preview.

Previews also carry draft models from the lock file, marked "(draft)" on their index pages. `release/` never does.

Each build folder has an index page, and so do the site root, `preview/`, `preview/branch/` and `preview/pr/`.

### Override the bundled data

To assess against a different model version or point the widget at a different references catalog, set the corresponding attributes:

```html
<self-assessment
  dataUrl="…/pkimm-model-2.0.0.yaml"
  referencesUrl="…/pkimm-references.yaml"
></self-assessment>
```

Extensions are not configured by a host attribute — the user uploads and removes them in the **Extensions** tab (they are stored locally in the browser).

## Attributes

| Attribute       | Required | Description                                                                                                                                                                                                                                                                                                                    |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profile`       | no       | Bundled assessment profile id, for example `pqcmm-self-assessment`. Defaults to `pkimm-self-assessment`.                                                                                                                                                                                                                       |
| `profileUrl`    | no       | URL of an assessment profile YAML. The profile selects the experience and methodology.                                                                                                                                                                                                                                         |
| `model`         | no       | Model id, for example `pqcmm`: loads that model's bundled profile when `profile` is not set.                                                                                                                                                                                                                                   |
| `dataUrl`       | no       | Optional model YAML override. Defaults to the bundled model at `modelVersion`.                                                                                                                                                                                                                                                 |
| `referencesUrl` | no       | Optional override. URL of the shared references catalog (`pkimm-references.yaml`). Defaults to the bundled references catalog (so category cards + the PDF References appendix appear by default); set this to point at a different catalog.                                                                                   |
| `modes`         | no       | Which assessment views are offered (comma-separated, case-insensitive): `self`, `full`, or `self,full`. Unset (default) offers both, opening in Self. `modes="self"` offers only the quick Self assessment; `modes="full"` opens in Full but keeps Self available. Self can never be disabled. See **Assessment modes** below. |
| `modelVersion`  | no       | Which bundled model release to load, for example `2.0.0` for PKIMM or `1.0.1` for PQCMM. Defaults to the latest release in `models.lock.json` (never a draft). An unknown version falls back to the latest. Ignored when `dataUrl` is set.                                                                                     |

### Assessment modes (Self / Full)

The widget supports two depths of assessment, switchable in the header (subject to the `modes` attribute above):

- **Self** — a quick, self-declared maturity level per category. Rate each category, review the report, share a link. This is the default.
- **Full** — a requirement-level questionnaire that derives each category's level, plus planning surfaces: **Scope** (choose which categories/requirements apply), **Workspace** (intake notes, artifacts, points of contact, checklist), per-requirement evidence and workspace links, **Action plans**, an **Evaluation** dashboard (level distribution, completeness, gap-to-next-level, baseline comparison), and richer report tiers (Attestation / Assessment / Detailed / Custom). Full-assessment data travels only in the downloaded YAML file, not in share links.

Both modes read and write the same assessment record, so switching between them never loses data.

### Assessment data

The model and references YAMLs are bundled into `dist/self-assessment.js`, so the widget works out of the box with no data URLs at all. The widget can also load either version of the PKIMM model from a URL via `dataUrl`; the 2.0.0 file is preferred, and 1.0.0 files are accepted and silently migrated when imported into a saved assessment.

- `pkimm-model-2.0.0.yaml` — current model. Schema: [`pkimm-model.schema-2.0.0.json`](https://github.com/pkic/pkimm/blob/2.0.0/data/pkimm-model.schema-2.0.0.json).
- `pkimm-model-1.0.0.yaml` — released 1.0.0 model. Schema: [`pkimm-model.schema-1.0.0.json`](https://github.com/pkic/pkimm/blob/2.0.0/data/pkimm-model.schema-1.0.0.json).
- `pkimm-references.yaml` — shared references catalog (cited by both models). Schema: [`pkimm-references.schema-1.0.0.json`](https://github.com/pkic/pkimm/blob/2.0.0/data/pkimm-references.schema-1.0.0.json).

Released models are not kept in this repository. The build downloads the releases listed in [`models.lock.json`](models.lock.json) from their repositories at the release tag, checks each file against its SHA-256 and caches it in `.cache/models/`, so later builds work offline. To try an unreleased model, set `MODEL_SOURCE_PKIMM=/path/to/pkimm-checkout`; those files are not checked against the lock. After adding a release to the lock file, run `node scripts/fetch-models.mjs --lock` to record its hashes. A lock entry can also pin an unreleased draft to one commit (`"commit"` plus `"draft": true`, with `"as"` to name an unversioned file). Drafts are fetched and checked against their hashes like releases, but their models are only bundled and offered with `MODEL_DRAFTS=1`, which the branch and pull request previews set and release builds do not.

- Extension YAMLs (any name) — must validate against [`extension.schema-1.0.0.json`](src/public/extension.schema-1.0.0.json).

### Profile-selected assessments

Select PQCMM by profile, or by model, on the same component. Without `dataUrl` it uses the latest bundled PQCMM release (1.0.1); `modelVersion` picks another bundled release:

```html
<self-assessment model="pqcmm"></self-assessment>
<script src="https://pkic.github.io/self-assessment/release/self-assessment.js"></script>
```

The PQCMM 1.1.0 draft is bundled only in previews, for example `preview/branch/main/pqcmm/1.1.0/`.

The standalone preview page (`custom.html` in each build) exposes the same selection as query parameters:

- `?profile=pkimm-self-assessment` loads bundled PKIMM 2.0.0.
- `?profile=pqcmm-self-assessment&modelVersion=1.0.1` loads bundled PQCMM 1.0.1.
- `?profileUrl=<url>&dataUrl=<url>` loads another schema-compatible profile
  and model. The external server must permit browser access with CORS, and the
  model id and version must match the profile.

Visualizations follow the selected methodology. Weighted category assessments
use the radar view; cumulative assessments use a maturity-gate path in both the
browser and PDF so that the visualization cannot imply that an out-of-sequence
level has been established.

PQCMM is product/service-centric and uses cumulative gates, not PKIMM's weighted category calculation. Level 0 is a self-declared baseline. For Levels 1 through 5, every criterion at the claimed level and every lower positive level must be marked met and supported by an evidence statement or file. Partial results remain gaps and never establish a level. Its profile also requires at least one canonical CPE 2.3 name or package URL (pURL). The credential exposes these as separate `credentialSubject.identifiers.cpe` and `.purl` properties for inventory matching.

Evidence-gated assessment records and uploaded evidence are stored in the `pkic-evidence-assessments` IndexedDB database, per model version: an assessment saved against PQCMM 1.1.0 is not shown when 1.0.1 is loaded, and the reverse. Portable JSON exports use the generic `pkic-assessment-package` schema: a W3C VC-shaped `AssessmentCredential` plus evidence attachments. Browser exports are explicitly marked `unsecured-draft`; only an external issuer/signing workflow may add a verifiable proof. Generated PDFs embed the package and original evidence files, record SHA-256 digests, and include a PDF signature field for an external PAdES workflow. Its durable report text remains valid before and after signing.

The PKIMM and PQCMM model, profile and schema files come from [pkic/pkimm](https://github.com/pkic/pkimm) and [pkic/pqcmm](https://github.com/pkic/pqcmm) through `models.lock.json` (see above). They are bundled into the widget for zero-config use and served next to the bundle in every published build for hosts that override `dataUrl` or `referencesUrl`. Their schemas are precompiled into CSP-safe validators. Two schemas stay in this repository: `extension.schema-1.0.0.json`, and `assessment-profile.schema-1.0.0.json`, the released PQCMM 1.0.0 profile schema with the size limits 1.1.0 adds, so a profile loaded from `profileUrl` is bounded whichever version it uses. To try an unreleased PQCMM, set `MODEL_SOURCE_PQCMM=/path/to/pqcmm-checkout`.

## Data storage

The widget stores assessments **only in the user's browser** (IndexedDB store `pkimm-sa`; legacy `localStorage` `pkimm-sa` read once and migrated). Nothing is sent anywhere unless the user explicitly shares the assessment URL (which encodes progress in its `#progress=` hash fragment) or downloads an export file or PDF locally. Multiple assessments can be saved; switch between them via the **Assessments** tab.

Shared URLs encode the assessment progress in the URL hash fragment (`#progress=…`), compacted to fit comfortably under email/messaging and QR-code size limits. The Self-assessment and extension PDF reports include a QR code on the cover page linking back to the assessment; the fuller report tiers omit it, since a full assessment's content does not fit in a share link.

## Theming

Visual tokens are exposed as `--pkimm-*` CSS custom properties on the `<self-assessment>` element. Override them in your host page to brand-align the widget.

```css
self-assessment {
  --pkimm-primary-color: #1a73e8;
  --pkimm-primary-color-hover: #154c91;
  --pkimm-primary-color-lighter: #eef5ff;
  /* ...full token list in src/index.module.scss... */
}
```

The full token list lives in [`src/index.module.scss`](src/index.module.scss); pick what you want to override. Common starting points include the primary/secondary colours, banner/danger/success status tokens, table-header background, border radii, font family, and the per-level maturity colours.

## Development

Node version is pinned via `.node-version` (24.22.0).

```bash
npm install          # install deps
npm run build        # production UMD build and public preview files → dist/
npm run start        # webpack-dev-server on http://localhost:9000
npm test             # jest
npm run lint:check   # eslint (no fix)
npm run format:check # prettier (no fix)
```

The prebuild and prestart hooks fetch the locked model files and copy `src/public/` into `dist/`. The dev route accepts the same attributes as query parameters and provides controls for bundled or external data; no separate assessment route is needed. Set `MODEL_DRAFTS=1` to include draft models, as the previews do.

CI workflows do this on every build. To lay a build out the way the hosted pages do, run `node scripts/build-pages.mjs publish --site <folder> --target release` after `npm run build`. To try an extension, open the running widget's **Extensions** tab and upload an extension YAML — no build step or attribute is involved.

## License

MIT — see [LICENSE](LICENSE).
