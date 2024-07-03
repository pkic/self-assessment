# PKI Maturity Model Self-Assessment Web Component

This is a web component that allows users to self-assess their organization's PKI maturity level. The component is based on the [PKI Maturity Model](https://pkic.org/pkimm/) developed by the [PKI Consortium](https://pkic.org/).

## Quick Start

To use the component, include the following script in your HTML file. Replace `<version>` with the version number you want to use.

```html
<script src="https://pkic.github.io/self-assessment/<version>/bundle.js"></script>
```

Then, add the `<self-assessment>` tag to your HTML file.

```html
<self-assessment
  dataurl="https://pkic.github.io/self-assessment/<version>/assessment-data.yaml"
></self-assessment>
```

## Development

Install the dependencies by running the following command:

```bash
npm install
```

Build the component by running the following command:

```bash
npm run build
```

To start the development server, run the following command:

```bash
npm run start
```

The development server will be available at `http://localhost:9000`. You can use [`index.html`](src/public/index.html) and [`assessment-data.yaml`](src/public/assessment-data.yaml) in the [`src/public`](src/public) directory to test the component.

## Customization

You can customize the styles of the component by adding the following CSS to your HTML file. Default values are shown below. See [`index.module.scss`](src/components/index.module.scss) for more details.

```css
:root {
  --pkimm-primary-color: #{$primary-color};
  --pkimm-secondary-color: #{$secondary-color};
  --pkimm-tertiary-color: #{$tertiary-color};

  --pkimm-primary-color-hover: #{$primary-color-hover};
  --pkimm-primary-color-lighter: #{$primary-color-lighter};

  --pkimm-secondary-color-lighter: #{$secondary-color-lighter};

  --pkimm-maturity-level-1: #{$maturity-level-1};
  --pkimm-maturity-level-2: #{$maturity-level-2};
  --pkimm-maturity-level-3: #{$maturity-level-3};
  --pkimm-maturity-level-4: #{$maturity-level-4};
  --pkimm-maturity-level-5: #{$maturity-level-5};

  --pkimm-background-color: #{$background-color};

  --pkimm-text-color-dark: #{$text-color-dark};
  --pkimm-text-color-light: #{$text-color-light};

  --pkimm-sticky-top-offset: 0px;
  --pkimm-scroll-query-selector: window;
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
