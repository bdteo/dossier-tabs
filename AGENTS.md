# AGENTS.md

## Project

Dossier Tabs is a small Vue 3 component library and demo app for tactile, orientation-aware dossier/index tabs. The package name is `@bdteo/dossier-tabs`; Vue is the only runtime peer dependency.

## Stack and Commands

- Use `pnpm` only. The repo is pinned through `packageManager` to `pnpm@10.15.1`.
- Install: `pnpm install`
- Demo dev server: `pnpm dev`
- Refresh README/demo screenshots: `pnpm screenshots`
- Full verification gate: `pnpm verify`
- Tests: `pnpm test`
- Type check: `pnpm typecheck`
- Library build: `pnpm build`
- Demo build: `pnpm build:demo`
- Demo geometry verification: `pnpm verify:demo`
- Screenshot freshness verification: `pnpm verify:screenshots`
- Package consumer verification: `pnpm verify:package`
- There is no lint script at the moment. Do not invent one in status reports; use the commands above as the verification surface.

## Source Layout

- `src/components/dossier-tabs/` is the canonical implementation.
  - `DossierIndex.vue` is the standalone accessible tab rail.
  - `DossierStack.vue` is the high-level physical dossier stack.
  - `DossierTray.vue` and `DossierFile.vue` model the physical holder and dossier surface.
  - `DossierFileStack.vue` is the compatibility wrapper around the tray/dossier pair.
  - `dossierGeometry.ts` contains exported physical edge, reach, slot, tuck, hover, and pull helpers.
  - `dossierTabs.ts` contains exported types and pure helpers.
  - `css.d.ts` keeps source-barrel CSS imports typed for copy-in and package source consumers.
  - `dossier-tabs.css` contains component styles and CSS variables.
  - `index.ts` is the public package entry.
- `src/vite-env.d.ts` provides Vite module typings for raw CSS imports used by tests; keep it tracked for clean-clone typechecks.
- `src/App.vue` and `src/demo/demo.css` are the local Vite demo.
- `tests/` contains Vitest/jsdom coverage for helpers, ARIA semantics, keyboard navigation, disabled tabs, and activation modes.
- `registry/vue/dossier-tabs/` is the shadcn-style copy-in registry package.
- `scripts/demo-cdp-utils.mjs` is the shared temporary Vite + Chrome DevTools harness for demo QA scripts.
- `scripts/demo-screenshot-utils.mjs` is the shared screenshot capture helper for mutating screenshot refreshes and non-mutating freshness checks, including overview and attached-stack crops.
- `scripts/capture-demo-screenshots.mjs` refreshes the README/demo PNGs through that harness.
- `scripts/check-demo-screenshots.mjs` captures screenshots into a temp directory and fails if `docs/screenshots/` is stale.
- `scripts/check-demo-geometry.mjs` verifies browser-rendered demo console cleanliness, geometry for side grab lanes, side icon paint visibility, active tab seams, hover handle-only tugging, dossier z-index contracts, and real demo click-to-pull behavior.
- `scripts/check-package-consumer.mjs` builds/packs the library and compiles throwaway consumers for package and registry copy-in imports.
- `scripts/verify-all.mjs` runs the full local gate, including source/registry sync, stale demo-browser process checks, tests, typecheck, demo geometry QA, screenshot freshness, package consumer verification, demo build, and `git diff --check`.
- `docs/screenshots/` contains README/demo images.
- `dist/`, `dist-demo/`, `node_modules/`, coverage, and test-report directories are generated/ignored.

## Maintenance Rules

- Keep the canonical component files in `src/components/dossier-tabs/` and the registry copies in `registry/vue/dossier-tabs/` in sync. Before finishing component work, run:

```bash
diff -rq src/components/dossier-tabs registry/vue/dossier-tabs -x README.md -x dossier-tabs.json
```

`pnpm verify` includes an equivalent source/registry sync check; the explicit
`diff -rq` command remains useful when you only need that one check while
iterating.

- When changing the public API, update exported types, README usage/props, registry README or metadata when relevant, and focused tests.
- Preserve accessibility behavior: `ariaLabel` is required for the tablist, tabs use roving focus, disabled tabs are skipped, manual activation moves focus without emitting model updates, and automatic activation emits `update:modelValue`.
- Keyboard navigation intentionally clamps at the first/last focusable tab instead of wrapping around the physical stack.
- Keep icon rendering dependency-free. The component accepts Vue icon components or the `icon` slot; do not add an icon package just for the library.
- Component CSS should remain portable: use scoped class names under `.dossier-tabs`, public-ish theming variables under `--dt-*`, and internal physical sizing variables under `--dossier-*` / `--dossier-attached-*`.
- If behavior changes, prefer helper-level tests for pure logic and component tests for DOM/ARIA/emits behavior.

## Release Notes for Agents

- `vite.lib.config.ts` builds the package entry from `src/components/dossier-tabs/index.ts`, externalizes Vue, disables CSS splitting, and emits declarations through `vite-plugin-dts`.
- Package exports include the main import, `./style.css`, and `./source`.
- The README frames this as both an npm package and a copy-in primitive; keep both usage paths healthy.
