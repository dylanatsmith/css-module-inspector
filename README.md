# CSS Module Inspector

Hover over `styles.className` in TSX/JSX files to see the applied CSS rules inline — no need to open the `.module.css` file.

<img width="861" height="286" alt="image" src="https://github.com/user-attachments/assets/5f0d73b2-2a6b-4ad5-b24f-605b8f9e9d82" />


## Features

- **Hover preview**: Hover any `styles.className` or `styles['class-name']` inside a `className` prop (or anywhere in the file) to see the resolved CSS rules in a tooltip.
- **Supports dot and bracket notation**: `styles.container` and `styles['my-class']` both work.
- **Shows `@media` context**: If a class appears inside a media query, the wrapping `@media` rule is shown too.
- **Works with any import name**: Detects the CSS module import variable name automatically (e.g. `import cx from './Foo.module.css'`).

## Usage

1. Install the extension
2. Open a `.tsx` or `.jsx` file that imports a `.module.css` file
3. Hover over any `styles.className` reference

## Development

```sh
cd css-module-inspector
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host and test.
