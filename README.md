# Arcanigen

A browser-based, node-graph editor for building vector graphics. You wire nodes
together to describe how a piece of SVG art is generated, and the graph renders it
live. It runs entirely in the browser — there's no backend, and nothing leaves the
page.

https://arcanigen.thatrobhuman.com - live app

https://www.youtube.com/playlist?list=PLAKrIav6IfnEVC7URg6PoC1c9ym8pJQrj - vlog/tutorial playlist

## What it does

- Node-graph editor: shapes, transforms, effects, math, and logic nodes wired into a graph that outputs SVG.
- Boolean path operations (unify, subtract, intersect, exclude, divide) plus a Path Combine node that folds an ordered list of paths, via [paper.js](http://paperjs.org/).
- Layers with blend modes.
- Custom nodes — collapse a subgraph behind a reusable node with its own typed inputs and outputs.
- Export to SVG or PNG (with a configurable export DPI).
- Save/load projects as JSON; export/import custom nodes separately.

## Running it locally

Requirements:

- Node.js 20.19+ (or 22.12+) — required by Vite 7.
- [pnpm](https://pnpm.io/). The repo pins a version, so the easiest route is Corepack (bundled with Node).

```sh
corepack enable      # lets Node use the pnpm version this repo pins
pnpm install
pnpm dev             # starts the Vite dev server (default http://localhost:5173)
```

To produce a production build:

```sh
pnpm build           # type-checks, then builds a static bundle into dist/
pnpm preview         # serve that build locally to check it
```

The output in `dist/` is static files — host it on anything that serves static assets.

## Stack

React 19, TypeScript, Vite, styled-components, and paper.js for path math. No server component.

## Contributing

PRs welcome. Before opening one, make sure `pnpm build` passes — it runs the TypeScript
project build, so type errors will fail it. There's an ESLint config too if you want to
lint (`pnpm exec eslint .`).

## License

MIT.
