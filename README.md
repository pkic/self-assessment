# PKI Maturity Model Self-Assessment Web Component

A self-contained web component that embeds the [PKI Maturity Model (PKIMM)](https://pkic.org/wg/pkimm/) self-assessment into any HTML page via a `<self-assessment>` custom element. Drop one `<script>` tag, point it at the model YAML, and the component does the rest — local-only data, no backend.

## Quick start

Include the bundled component and YAML data files in your HTML. Replace `<version>` with a published release (or `develop` for the latest unstable build).

```html
<script src="https://pkic.github.io/self-assessment/<version>/self-assessment.js"></script>

<self-assessment
  dataUrl="https://pkic.github.io/self-assessment/<version>/pkimm-model-2.0.0.yaml"
  configUrl="https://pkic.github.io/self-assessment/<version>/config.yaml"
></self-assessment>
```

Optional: load one or more extensions (comma-separated URLs) and the references catalog:

```html
<self-assessment
  dataUrl="…/pkimm-model-2.0.0.yaml"
  configUrl="…/config.yaml"
  extensionsUrl="…/pqc-extension.yaml,…/another-extension.yaml"
  referencesUrl="…/pkimm-references.yaml"
></self-assessment>
```

## Attributes

| Attribute       | Required | Description                                                                                                                                                                                                                                              |
| --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dataUrl`       | yes      | URL of the PKIMM model YAML (`pkimm-model-1.0.0.yaml` or `pkimm-model-2.0.0.yaml`).                                                                                                                                                                      |
| `configUrl`     | yes      | URL of the widget config YAML (overview Markdown + email-share template).                                                                                                                                                                                |
| `extensionsUrl` | no       | Comma-separated list of extension YAML URLs. When omitted, the **Extensions** tab is hidden.                                                                                                                                                             |
| `referencesUrl` | no       | URL of the shared references catalog (`pkimm-references.yaml`). When set, each category card surfaces the standards its requirements cite and the PDF gains a References appendix. Missing or omitted: references silently disappear from both surfaces. |

### Assessment data

The widget can load either version of the PKIMM model. The 2.0.0 file is preferred; 1.0.0 files are accepted and silently migrated when imported into a saved assessment.

- `pkimm-model-2.0.0.yaml` — current model. Schema: [`pkimm-model.schema-2.0.0.json`](src/public/pkimm-model.schema-2.0.0.json).
- `pkimm-model-1.0.0.yaml` — released 1.0.0 model. Schema: [`pkimm-model.schema-1.0.0.json`](src/public/pkimm-model.schema-1.0.0.json).
- `pkimm-references.yaml` — shared references catalog (cited by both models). Schema: [`pkimm-references.schema-1.0.0.json`](src/public/pkimm-references.schema-1.0.0.json).
- Extension YAMLs (any name) — must validate against [`extension.schema-1.0.0.json`](src/public/extension.schema-1.0.0.json).

All schemas are also vendored in the bundle for validation at load time; the canonical copies live in the [pkic/pkimm](https://github.com/pkic/pkimm) repository.

### Widget config

The `configUrl` YAML provides the overview markdown shown on the Overview tab plus the email-share template.

| Key             | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `overview.data` | Markdown body rendered on the Overview tab.                   |
| `email.enabled` | Show the email-share button in the report (`true` / `false`). |
| `email.subject` | Email subject when sharing.                                   |
| `email.body`    | Email body, may include `${progressUrl}` placeholder.         |

Schema: [`config.schema.json`](src/public/config.schema.json).

## Data storage

The widget stores assessments **only in the user's browser** (`localStorage`, key `pkimm-sa`). Nothing is sent anywhere unless the user explicitly shares via URL or email. Multiple assessments can be saved; switch between them via the **Assessments** tab.

Shared URLs encode the assessment progress in the URL hash fragment (`#progress=…`), compacted to fit comfortably under email/messaging and QR-code size limits. PDF reports include a QR code on the cover page linking back to the assessment.

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

Local dev note: the webpack-dev-server serves the `dist/` directory. After `npm run build`, the YAML/config/index files in `src/public/` are not automatically copied. Run once:

```bash
cp src/public/index.html src/public/config.yaml src/public/pkimm-model-1.0.0.yaml \
   src/public/pkimm-model-2.0.0.yaml src/public/pkimm-references.yaml dist/
```

The dev fixture (`src/public/index.html`) already sets `referencesUrl="pkimm-references.yaml"`, so per-category reference disclosures appear locally after the copy.

CI workflows do this on every build. To test with extensions locally, copy any extension YAML you want into `dist/` and add `extensionsUrl="…"` to `src/public/index.html` (the dev page) or to `dist/index.html` directly.

## License

MIT — see [LICENSE](LICENSE).
