# PKI Maturity Model Self-Assessment Web Component

A self-contained web component that embeds the [PKI Maturity Model (PKIMM)](https://pkic.org/wg/pkimm/) self-assessment into any HTML page via a `<self-assessment>` custom element. The model and references catalog are bundled into the component, so dropping one `<script>` tag and the `<self-assessment>` element is enough to get a working assessment — local-only data, no backend. A host can optionally point the component at a different data source.

## Quick start

Include the component in your HTML. Replace `<version>` with a published release (or `develop` for the latest unstable build). No attributes are needed — the widget renders the latest PKIMM model (2.0.0) with its references catalog out of the box:

```html
<self-assessment></self-assessment>
<script src="https://pkic.github.io/self-assessment/<version>/self-assessment.js"></script>
```

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
| `dataUrl`       | no       | Optional override. URL of the PKIMM model YAML (`pkimm-model-1.0.0.yaml` or `pkimm-model-2.0.0.yaml`). Defaults to the bundled latest model (2.0.0).                                                                                                                                                                           |
| `referencesUrl` | no       | Optional override. URL of the shared references catalog (`pkimm-references.yaml`). Defaults to the bundled references catalog (so category cards + the PDF References appendix appear by default); set this to point at a different catalog.                                                                                   |
| `modes`         | no       | Which assessment views are offered (comma-separated, case-insensitive): `self`, `full`, or `self,full`. Unset (default) offers both, opening in Self. `modes="self"` offers only the quick Self assessment; `modes="full"` opens in Full but keeps Self available. Self can never be disabled. See **Assessment modes** below. |

### Assessment modes (Self / Full)

The widget supports two depths of assessment, switchable in the header (subject to the `modes` attribute above):

- **Self** — a quick, self-declared maturity level per category. Rate each category, review the report, share a link. This is the default.
- **Full** — a requirement-level questionnaire that derives each category's level, plus planning surfaces: **Scope** (choose which categories/requirements apply), **Workspace** (intake notes, artifacts, points of contact, checklist), per-requirement evidence and workspace links, **Action plans**, an **Evaluation** dashboard (level distribution, completeness, gap-to-next-level, baseline comparison), and richer report tiers (Attestation / Assessment / Detailed / Custom). Full-assessment data travels only in the downloaded YAML file, not in share links.

Both modes read and write the same assessment record, so switching between them never loses data.

### Assessment data

The model and references YAMLs are bundled into `dist/self-assessment.js`, so the widget works out of the box with no data URLs at all. The widget can also load either version of the PKIMM model from a URL via `dataUrl`; the 2.0.0 file is preferred, and 1.0.0 files are accepted and silently migrated when imported into a saved assessment.

- `pkimm-model-2.0.0.yaml` — current model. Schema: [`pkimm-model.schema-2.0.0.json`](src/public/pkimm-model.schema-2.0.0.json).
- `pkimm-model-1.0.0.yaml` — released 1.0.0 model. Schema: [`pkimm-model.schema-1.0.0.json`](src/public/pkimm-model.schema-1.0.0.json).
- `pkimm-references.yaml` — shared references catalog (cited by both models). Schema: [`pkimm-references.schema-1.0.0.json`](src/public/pkimm-references.schema-1.0.0.json).
- Extension YAMLs (any name) — must validate against [`extension.schema-1.0.0.json`](src/public/extension.schema-1.0.0.json).

These files are bundled directly into the widget for zero-config use, and are also still served from gh-pages (alongside every release) for hosts that override `dataUrl`/`referencesUrl`. All schemas are also vendored in the bundle for validation at load time; the canonical copies live in the [pkic/pkimm](https://github.com/pkic/pkimm) repository.

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

Node version is pinned via `.node-version` (22.x).

```bash
npm install          # install deps
npm run build        # production UMD build → dist/self-assessment.js
npm run start        # webpack-dev-server on http://localhost:9000
npm test             # jest
npm run lint:check   # eslint (no fix)
npm run format:check # prettier (no fix)
```

Local dev note: the webpack-dev-server serves the `dist/` directory. After `npm run build`, the YAML/index files in `src/public/` are not automatically copied. Run once:

```bash
cp src/public/index.html src/public/pkimm-model-1.0.0.yaml \
   src/public/pkimm-model-2.0.0.yaml src/public/pkimm-references.yaml dist/
```

The dev fixture (`src/public/index.html`) is attribute-free (zero-config) — it no longer sets `dataUrl`/`referencesUrl`. Per-category reference disclosures appear from the bundled references catalog without any copy step; the `cp` above is only needed to exercise the `dataUrl`/`referencesUrl` override path locally.

CI workflows do this on every build. To try an extension, open the running widget's **Extensions** tab and upload an extension YAML — no build step or attribute is involved.

## License

MIT — see [LICENSE](LICENSE).
