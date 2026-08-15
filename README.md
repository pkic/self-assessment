# PKI Consortium Assessment Web Component

A self-contained, profile-driven web component for PKI Consortium assessments. The assessment profile selects the model, user experience, scoring methodology and parameters, subject fields, assurance policy, and report behavior. PKIMM and PQCMM are bundled profiles; adding another assessment does not require a new HTTP route or a model-id branch in the application.

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
| `profile`       | no       | Bundled assessment profile id. Defaults to `pkimm-self-assessment`.                                                                                                                                                                                                                                                            |
| `profileUrl`    | no       | URL of an assessment profile YAML. The profile selects the experience and methodology.                                                                                                                                                                                                                                         |
| `dataUrl`       | no       | Optional model YAML override. For PKIMM this defaults to the bundled 2.0.0 model; for PQCMM it defaults to the bundled 1.0.1 model.                                                                                                                                                                                            |
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

### Profile-selected assessments

Select PQCMM by profile on the same component and route. It uses the bundled PQCMM 1.0.1 data when `dataUrl` is absent and the supplied versioned model URL when it is present:

```html
<self-assessment
  profile="pqcmm-self-assessment"
  dataUrl="https://pkic.org/wg/pqc/pqcmm/data/pqcmm-model-1.0.1.yaml"
></self-assessment>
<script src="https://pkic.github.io/self-assessment/develop/self-assessment.js"></script>
```

PQCMM is product/service-centric and uses cumulative gates, not PKIMM's weighted category calculation. Level 0 is a self-declared baseline. For Levels 1 through 5, every criterion at the claimed level and every lower positive level must be marked met and supported by an evidence statement or file. Partial results remain gaps and never establish a level. Its profile also requires at least one canonical CPE 2.3 name or package URL (pURL). The credential exposes these as separate `credentialSubject.identifiers.cpe` and `.purl` properties for inventory matching.

Evidence-gated assessment records and uploaded evidence are stored in the `pkic-evidence-assessments` IndexedDB database. Portable JSON exports use the generic `pkic-assessment-package` schema: a W3C VC-shaped `AssessmentCredential` plus evidence attachments. Browser exports are explicitly marked `unsecured-draft`; only an external issuer/signing workflow may add a verifiable proof. Generated PDFs embed the package and original evidence files, record SHA-256 digests, and include a PDF signature field for an external PAdES workflow. Its durable report text remains valid before and after signing.

The intended canonical model source is the standalone `pkic/pqcmm` repository. Until that local repository has been published and pinned by consumers, update the bundled and website snapshots together with the canonical candidate. Do not edit one copy independently.

The PKIMM and PQCMM release files are bundled directly into the widget for zero-config use and served from gh-pages for hosts that override `dataUrl` or `referencesUrl`. Their schemas are precompiled into CSP-safe validators. PKIMM's canonical copies live in the [pkic/pkimm](https://github.com/pkic/pkimm) repository; PQCMM will follow the same pinned-repository model after publication.

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

Node version is pinned via `.node-version` (24.15.0).

```bash
pnpm install          # install deps
pnpm run build        # production UMD build → dist/self-assessment.js
pnpm run start        # webpack-dev-server on http://localhost:9000
pnpm test             # jest
pnpm run lint:check   # eslint (no fix)
pnpm run format:check # prettier (no fix)
```

Local dev note: the webpack-dev-server serves the `dist/` directory. After `pnpm run build`, the YAML/index files in `src/public/` are not automatically copied. Run once:

```bash
cp src/public/index.html src/public/pkimm-model-1.0.0.yaml \
   src/public/pkimm-model-2.0.0.yaml src/public/pkimm-references.yaml \
   src/public/pqcmm-model-1.0.1.yaml \
   src/public/pqcmm-model.schema-1.0.0.json \
   src/public/assessment-profile.schema-1.0.0.json \
   src/public/assessment-package.schema-1.0.0.json dist/
```

The single dev route accepts the same attributes as query parameters. For example, use `/?profile=pqcmm-self-assessment`; no separate assessment route is needed. Per-category reference disclosures appear from the bundled references catalog without any copy step; the `cp` above is only needed to exercise URL overrides locally.

CI workflows do this on every build. To try an extension, open the running widget's **Extensions** tab and upload an extension YAML — no build step or attribute is involved.

## License

MIT — see [LICENSE](LICENSE).
