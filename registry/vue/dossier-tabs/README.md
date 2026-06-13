# dossier-tabs registry seed

This directory is the copy-in seed for a shadcn-vue style registry entry.

Copy the component files into your app. The `index.ts` barrel imports
`dossier-tabs.css` for you, and the included `css.d.ts` shim keeps that
side-effect CSS import typed. Vue single-file-component typing should come from
your app's normal Vue/Vite setup. If you import individual `.vue` files directly
instead, import the CSS once from your app entry:

```ts
import '@/components/dossier-tabs/dossier-tabs.css';
```

Use `DossierStack` when the tab/tag should stay literally attached to its dossier. It renders one `DossierFile` per tab inside a `DossierTray`; each dossier owns its tab handle and the active dossier owns the visible content surface, so pull motion, z-index, edge direction, and tab placement move as one physical piece.

Each tab needs a unique `key` and `label`. Duplicate keys are ignored after the first match using the same string identity used for selection, which keeps Vue keys, ARIA ids, measurements, and physical dossier state aligned.

Pass the required tablist label as `ariaLabel` in Vue templates. `aria-label` is treated by Vue's type checker as a native ARIA attribute, not as this component prop.

Attached dossiers generate stable, collision-resistant tab/panel IDs by default: every tab points at a real panel shell with `aria-controls`, and each panel points back with `aria-labelledby`. Inactive panel shells stay hidden and empty; the active dossier mounts the visible slot content. Pass `panelIdForTab` or `tab.panelId` when you need an app-owned panel id. External panel IDs are tried as `panelIdForTab(tab)` first, then `tab.panelId`; invalid or duplicate external IDs fall back to generated IDs so the rendered panels stay unique.

Standalone `DossierIndex` also generates stable tab IDs, but it only sets `aria-controls` when you provide a valid, unique `panelIdForTab` or `tab.panelId` for an external panel. That keeps the rail accessible without pointing at panels it does not render.

If the controlled `modelValue` is disabled, missing, or null, the components fall back internally to the first enabled tab without emitting an update. If no tab is enabled, no tab is selected. That keeps the tablist accessible and prevents disabled tabs from becoming the selected physical dossier.

The selected dossier takes the front layer immediately. By default, the previous dossier folds back at 75% of the outward pull duration, giving the return a slightly quicker physical feel while preserving `returnDuration` as an explicit override. The newly selected dossier appears immediately in the pulled physical lane while the previous dossier returns into its remembered tucked offset, avoiding a snap through a stale midpoint. `pullDistance` defaults to `0`, so stack order changes without shifting the active content sheet; increase it only when the whole active dossier should visibly move outward. Initial dossiers start tucked, including the first enabled dossier that appears after an empty or all-disabled data load. Clicking the already-controlled active dossier is idempotent, so it does not re-enter pull motion or nudge the tab out of alignment; fallback selections can still emit when `modelValue` is missing or disabled. The tucked stack remembers selection history, so recently selected dossiers keep both a higher resting z-index and a shallower tuck offset. Tucked dossiers remain visible as muted physical sheets, so the dossier bodies/cards and tag handles display the same remembered pile; even deeply tucked dossiers keep an icon-safe handle lane exposed so the icon stays visible and the tab remains easy to grab.

Set `tone` on individual `DossierIndexItem` objects when a stack should show different dossier tints. The `DossierStack` `tone` prop remains the fallback and tray tint. For one-off colors, set `tint` and optionally `accent` on an attached tab item with any CSS color string.

Set `texture="paper"` when the stack should read as real paper/cardstock. The texture is generated with portable CSS gradients, so it tiles cleanly out of the box, and it applies to the tray layers, dossier sheets, content surface, and attached tab handles by default. Use `textureLayers` to choose where that paper appears: `all` preserves the full recipe, `shell` paints the sheets and handles while leaving slotted content clean, `content` paints only the active content surface, `tab` paints only handles, and explicit arrays such as `['sheet', 'tab']` are accepted. `shell` is usually the right integration setting for galleries, maps, and document previews where the content already owns its own visual surface. Standalone `DossierIndex`, `DossierTray`, `DossierFile`, and `DossierFileStack` accept the same `texture` and `textureLayers` props. This registry seed also includes high-detail image-backed paper assets and exports `getDossierPaperTextureStyle()`, `dossierPaperTexturePresets`, and `dossierPaperTexturePresetOptions` from `paperTextures.ts` when you want a stronger material texture. The high-detail presets repeat the restored originals at a compressed CSS scale, preserving the material bite without stretching the texture; the `Density4` and `Density9` presets are high-quality downsampled tiles rendered at their native repeat sizes, so their denser photographed-surface feel comes from downsampling only. Bind the returned style object to the component root alongside `texture="paper"`.

Set `edge` on individual `DossierIndexItem` objects when one attached tray should mix tab edges, such as alternating left/right tabs or a bottom/right corner index. The stack-level `edge` remains the fallback.

Set `gravity` on individual `DossierIndexItem` objects when one physical edge should split into separate slot lanes, such as top tabs grouped on the left and right sides of the same dossier. `start` and `end` groups get independent measured slots while sharing the same pull direction.

Use `stackRotation` on `DossierStack` when tucked/background dossiers should get a small mirrored rotation, like files pushed back into a real tray. `stackRotation="files"` rotates only the dossier sheets; `stackRotation="pieces"` rotates the whole dossier piece. `tabRotation="straight"` keeps handles optically upright, including by counter-rotating them in whole-piece mode, while `tabRotation="rotated"` lets inactive handles tilt with the dossier. In whole-piece mode, tab borders are suppressed so the tilted page reads as one continuous physical sheet. Active and pulled dossiers stay square. The legacy `tuckedTilt` boolean remains a shortcut for `stackRotation="pieces"` when `stackRotation` is omitted.

Hover behaves like touching or listing through a real dossier tab: only the handle tugs toward the tab edge, while clicking pulls the whole dossier. Use `emulatedHoverKey` only as a visual QA hook. It applies BEM hover-emulation classes and the same handle tug and displacement geometry as real hover, while label/slot expansion still follows `expandOn`. That makes overlap bugs easier to reproduce without holding the pointer over a moving tab.

Use `appearance="stack"` on vertical tabs when the side rail should read like a physical cascade of dossier dividers.

Use `DossierTray` around a `DossierFile` when the content area should show configurable stacked depth attached to the same edge as the tabs. The tray owns shared depth, tint, edge, and layer direction; `DossierStack` owns the tab-and-dossier pull motion. `DossierFileStack` remains available as a compatibility wrapper.

The `index.ts` barrel also exports the finite geometry helpers used by the physical stack. Import `getDossierEdgeVector`, `getDossierPieceTuckOffset`, `getDossierPullOffset`, `getDossierHoverOffset`, `getDossierStackSlots`, `getDossierIndexReachSize`, `getDossierVisibleGrabSize`, `getDossierMinimumGrabSize`, and `getDossierMinimumVisibleGrabSize` when custom styling or QA overlays need to stay aligned with the built-in dossier mechanics. These helpers normalize invalid runtime numbers into finite non-negative CSS measurements, and side edges reserve a larger icon-safe grab lane that also drives the side reveal gutter.

The stylesheet honors `prefers-reduced-motion: reduce` by disabling rail, dossier, tray, layer, and attached-tab transitions and animations while preserving the final layout state.

The canonical source currently lives in `src/components/dossier-tabs/`.
