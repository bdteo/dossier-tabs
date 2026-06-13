import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive, ref } from 'vue';
import {
  DossierFile,
  DossierStack,
  DossierTray,
  DossierFileStack,
  DossierIndex,
  getDossierMinimumVisibleGrabSize,
  getDossierPullOffset,
  getDossierVisibleGrabSize,
  normalizeDossierPullDistance,
  normalizeDossierSurfaceTextColor,
  normalizeDossierSurfaceTextureBlendMode,
  normalizeDossierSurfaceTexture,
  normalizeDossierSurfaceTextureLayers,
  normalizeDossierStackRotation,
  normalizeDossierIndexRotation,
  type DossierIndexItem,
  type DossierIndexKey,
} from '../src/components/dossier-tabs';
import dossierTabsCss from '../src/components/dossier-tabs/dossier-tabs.css?raw';
import demoCss from '../src/demo/demo.css?raw';
import appVueSource from '../src/App.vue?raw';
import sourceBarrel from '../src/components/dossier-tabs/index.ts?raw';
import indexHtml from '../index.html?raw';
import demoGeometryScript from '../scripts/check-demo-geometry.mjs?raw';
import screenshotCheckScript from '../scripts/check-demo-screenshots.mjs?raw';
import screenshotScript from '../scripts/capture-demo-screenshots.mjs?raw';
import demoCdpUtilsScript from '../scripts/demo-cdp-utils.mjs?raw';
import demoScreenshotUtilsScript from '../scripts/demo-screenshot-utils.mjs?raw';
import packageConsumerScript from '../scripts/check-package-consumer.mjs?raw';
import verifyAllScript from '../scripts/verify-all.mjs?raw';
import packageJson from '../package.json';
import readmeMarkdown from '../README.md?raw';
import registryReadmeMarkdown from '../registry/vue/dossier-tabs/README.md?raw';
import registryItem from '../registry/vue/dossier-tabs/dossier-tabs.json';

const registryFileModules = import.meta.glob('../registry/vue/dossier-tabs/*', {
  eager: true,
  import: 'default',
  query: '?raw',
});
const registryInstallableFileModules = import.meta.glob('../registry/vue/dossier-tabs/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
});

const Icon = defineComponent({
  name: 'TestIcon',
  render: () => h('svg', { viewBox: '0 0 24 24' }, [h('path', { d: 'M4 12h16' })]),
});

const tabs: DossierIndexItem[] = [
  { key: 'photos', label: 'Object photos', shortLabel: 'Photos', icon: Icon, count: 1, totalCount: 15 },
  { key: 'plans', label: 'Floor plans', shortLabel: 'Plans', icon: Icon, count: 2 },
  { key: 'maps', label: 'Maps', shortLabel: 'Maps', icon: Icon, disabled: true },
  { key: 'docs', label: 'Documents', shortLabel: 'Docs', icon: Icon, count: 12 },
];

async function waitForMotionFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await nextTick();
}

function dossierPieceStyleNumber(wrapper: ReturnType<typeof mount>, index: number, property: string): number {
  const style = wrapper.findAll('.dossier-stack__file')[index].attributes('style') ?? '';
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = style.match(new RegExp(`${escapedProperty}:\\s*(-?\\d+(?:\\.\\d+)?)`));

  return Number(match?.[1] ?? Number.NaN);
}

function dossierPieceZ(wrapper: ReturnType<typeof mount>, index: number): number {
  return dossierPieceStyleNumber(wrapper, index, '--dossier-piece-z');
}

function dispatchKeyboardEvent(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  }));
}

describe('DossierIndex', () => {
  it('wires a demo favicon so the runtime console stays clean', () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
  });

  it('publishes README screenshot assets referenced by the package readme', () => {
    expect(readmeMarkdown).toContain('docs/screenshots/demo-attached-desktop.png');
    expect(readmeMarkdown).toContain('docs/screenshots/demo-attached-mobile.png');
    expect(readmeMarkdown).toContain('docs/screenshots/demo-desktop.png');
    expect(readmeMarkdown).toContain('pnpm screenshots');
    expect(readmeMarkdown).toContain('CHROME_PATH');
    expect(readmeMarkdown).toContain('DOSSIERTABS_SCREENSHOT_PORT');
    expect(packageJson.files).toContain('docs/screenshots');
    expect(packageJson.files).toContain('scripts/check-demo-geometry.mjs');
    expect(packageJson.files).toContain('scripts/check-demo-screenshots.mjs');
    expect(packageJson.files).toContain('scripts/capture-demo-screenshots.mjs');
    expect(packageJson.files).toContain('scripts/demo-cdp-utils.mjs');
    expect(packageJson.files).toContain('scripts/demo-screenshot-utils.mjs');
    expect(packageJson.files).toContain('scripts/check-package-consumer.mjs');
    expect(packageJson.files).toContain('scripts/verify-all.mjs');
    expect(packageJson.scripts.screenshots).toBe('node scripts/capture-demo-screenshots.mjs');
    expect(packageJson.scripts.verify).toBe('node scripts/verify-all.mjs');
    expect(packageJson.scripts['verify:demo']).toBe('node scripts/check-demo-geometry.mjs');
    expect(packageJson.scripts['verify:screenshots']).toBe('node scripts/check-demo-screenshots.mjs');
    expect(packageJson.scripts['verify:package']).toBe('node scripts/check-package-consumer.mjs');
    expect(readmeMarkdown).toContain('pnpm verify');
    expect(readmeMarkdown).toContain('pnpm verify:demo');
    expect(readmeMarkdown).toContain('pnpm verify:screenshots');
    expect(readmeMarkdown).toContain('DOSSIERTABS_DEMO_QA_PORT');
    expect(readmeMarkdown).toContain('DOSSIERTABS_SCREENSHOT_CHECK_PORT');
  });

  it('defines one full verification gate for release-grade local checks', () => {
    expect(verifyAllScript).toContain("['pnpm', ['test']]");
    expect(verifyAllScript).toContain("['pnpm', ['typecheck']]");
    expect(verifyAllScript).toContain("['pnpm', ['verify:demo']]");
    expect(verifyAllScript).toContain("['pnpm', ['verify:screenshots']]");
    expect(verifyAllScript).toContain("['pnpm', ['verify:package']]");
    expect(verifyAllScript).toContain("['pnpm', ['build:demo']]");
    expect(verifyAllScript).toContain("['git', ['diff', '--check']]");
    expect(verifyAllScript).toContain('verifyRegistrySync();');
    expect(verifyAllScript).toContain("verifyNoStaleDemoBrowserProcesses('before browser QA');");
    expect(verifyAllScript).toContain("verifyNoStaleDemoBrowserProcesses('after browser QA');");
    expect(verifyAllScript).toContain("const registryOnlyFiles = new Set(['README.md', 'dossier-tabs.json']);");
    expect(verifyAllScript).toContain('/dossiertabs-screenshots/');
    expect(verifyAllScript).toContain('/dossiertabs-screenshot-check/');
    expect(verifyAllScript).toContain('/dossiertabs-demo-geometry/');
    expect(verifyAllScript).toContain('--remote-debugging-port=9342');
    expect(verifyAllScript).toContain('--remote-debugging-port=9341');
    expect(verifyAllScript).toContain('content differs:');
    expect(readmeMarkdown).toContain('stale headless Chrome');
  });

  it('shares a hardened demo CDP harness across browser QA scripts', () => {
    expect(screenshotScript).toContain("from './demo-screenshot-utils.mjs';");
    expect(screenshotCheckScript).toContain("from './demo-screenshot-utils.mjs';");
    expect(screenshotCheckScript).toContain('README/demo screenshots are stale');
    expect(screenshotCheckScript).toContain("import { inflateSync } from 'node:zlib';");
    expect(screenshotCheckScript).toContain('function decodePng(buffer) {');
    expect(screenshotCheckScript).toContain('function comparePngPixels(expected, fresh) {');
    expect(screenshotCheckScript).toContain('maxAverageChannelDelta');
    expect(demoScreenshotUtilsScript).toContain("from './demo-cdp-utils.mjs';");
    expect(demoScreenshotUtilsScript).toContain('export const demoScreenshotSpecs = [');
    expect(demoScreenshotUtilsScript).toContain('demo-attached-desktop.png');
    expect(demoScreenshotUtilsScript).toContain('demo-attached-mobile.png');
    expect(demoScreenshotUtilsScript).toContain("scrollSelector: '.demo-workbench'");
    expect(demoScreenshotUtilsScript).toContain('async function scrollToScreenshotTarget');
    expect(demoScreenshotUtilsScript).toContain('pathAndQuery: physicalStackPath');
    expect(demoScreenshotUtilsScript).toContain('window.scrollTo(0,');
    expect(demoScreenshotUtilsScript).toContain('export async function captureDemoScreenshots');
    expect(demoGeometryScript).toContain("from './demo-cdp-utils.mjs';");
    expect(demoGeometryScript).toContain('waitForDemoFrame');
    expect(demoGeometryScript).toContain('function assertNoInteractionFailures');
    expect(demoGeometryScript).toContain('async function inspectDemoClickPull');
    expect(demoGeometryScript).toContain('Demo click-pull passed');
    expect(demoGeometryScript).toContain("rootSelector: '.demo-stage--primary'");
    expect(demoGeometryScript).toContain("rootSelector: '.demo-stage--workbench'");
    expect(demoGeometryScript).toContain('function assertNoConsoleFailures');
    expect(demoGeometryScript).toContain('function createConsoleErrorCollector');
    expect(demoGeometryScript).toContain("client.on('Runtime.consoleAPICalled'");
    expect(demoGeometryScript).toContain("client.on('Runtime.exceptionThrown'");
    expect(demoGeometryScript).toContain("client.on('Log.entryAdded'");
    expect(demoGeometryScript).toContain('Demo console passed');
    expect(demoGeometryScript).toContain('clicked dossier did not become active');
    expect(demoGeometryScript).toContain('clicked dossier offset');
    expect(demoGeometryScript).toContain('visible panel did not move into the clicked dossier');
    expect(demoGeometryScript).toContain('minSideVisibleGrabLane = 110');
    expect(demoGeometryScript).toContain('qaScenarios = [');
    expect(demoGeometryScript).toContain("name: 'buried side icons'");
    expect(demoGeometryScript).toContain('async function assertSideIconPaint');
    expect(demoGeometryScript).toContain('side icon is visually covered');
    expect(demoGeometryScript).toContain('maxActiveSeamGap = 0.75');
    expect(demoGeometryScript).toContain('maxActiveSeamOverlap = 1.5');
    expect(demoGeometryScript).toContain('maxHoverMotionDelta = 0.75');
    expect(demoGeometryScript).toContain('minHoverOutwardTug = 4');
    expect(demoGeometryScript).toContain('const parseTranslate = (transform) => {');
    expect(demoGeometryScript).toContain("activeDossier.querySelector('.dossier-stack__content:not([hidden])')");
    expect(demoGeometryScript).toContain('const activePanelRect = activeContent.getBoundingClientRect();');
    expect(demoGeometryScript).toContain('active tab leaves a');
    expect(demoGeometryScript).toContain('active tab overlaps its dossier panel');
    expect(demoGeometryScript).toContain('hovered dossier sheet moved');
    expect(demoGeometryScript).toContain('hovered tab transform');
    expect(demoGeometryScript).toContain('hovered tab tugs only');
    expect(demoGeometryScript).toContain('!isActive && visibleOutsideActivePanel < minSideVisibleGrabLane');
    expect(demoGeometryScript).toContain('icon overlaps active dossier panel');
    expect(demoGeometryScript).toContain('hovered dossier z-index');
    expect((demoGeometryScript.match(/missing visible active dossier panel/g) ?? [])).toHaveLength(1);
    expect(demoCdpUtilsScript).toContain('this.eventWaiters = new Set();');
    expect(demoCdpUtilsScript).toContain('this.readySettled = false;');
    expect(demoCdpUtilsScript).toContain('this.rejectReady = (error) => {');
    expect(demoCdpUtilsScript).toContain("this.webSocket.addEventListener('close', () => {");
    expect(demoCdpUtilsScript).toContain("this.webSocket.addEventListener('error', () => {");
    expect(demoCdpUtilsScript).toContain('this.rejectReady(error);');
    expect(demoCdpUtilsScript).toContain('rejectOpenWork(error) {');
    expect(demoCdpUtilsScript).toContain('this.pending.clear();');
    expect(demoCdpUtilsScript).toContain('waiter.reject(error);');
    expect(demoCdpUtilsScript).toContain('  on(method, listener) {');
    expect(demoCdpUtilsScript).toContain("Cannot listen for ${method}; Chrome DevTools websocket is already closed.");
    expect(demoCdpUtilsScript).toContain("await client.send('Log.enable');");
  });

  it('keeps temp-owning verification scripts cleanup-safe on failure', () => {
    expect(screenshotCheckScript).toContain('let exitCode = 0;');
    expect(screenshotCheckScript).toContain('process.exitCode = exitCode;');
    expect(screenshotCheckScript).not.toContain('process.exit(1);');
    expect(packageConsumerScript).toContain('class CommandFailure extends Error');
    expect(packageConsumerScript).toContain('throw new CommandFailure(result.status ?? 1);');
    expect(packageConsumerScript).toContain('const requiredPackedFiles = [');
    expect(packageConsumerScript).toContain('dist/dossier-tabs.js');
    expect(packageConsumerScript).toContain('dist/assets/paper/paper-watercolor-rough.jpg');
    expect(packageConsumerScript).toContain('docs/screenshots/demo-attached-desktop.png');
    expect(packageConsumerScript).toContain('docs/screenshots/demo-attached-mobile.png');
    expect(packageConsumerScript).toContain('docs/screenshots/demo-desktop.png');
    expect(packageConsumerScript).toContain('scripts/capture-demo-screenshots.mjs');
    expect(packageConsumerScript).toContain('scripts/copy-package-assets.mjs');
    expect(packageConsumerScript).toContain('scripts/verify-all.mjs');
    expect(packageConsumerScript).toContain('const forbiddenPackedFiles = [');
    expect(packageConsumerScript).toContain('src/App.vue');
    expect(packageConsumerScript).toContain('registry/vue/dossier-tabs/vue.d.ts');
    expect(packageConsumerScript).toContain('verifyPackedPackageContents(packResult);');
    expect(packageConsumerScript).toContain('rmSync(tempRoot, { force: true, recursive: true });');
    expect(packageConsumerScript).toContain('process.exitCode = exitCode;');
    expect(packageConsumerScript).not.toContain('process.exit(result.status ?? 1);');
  });

  it('keeps the registry manifest aligned with the copy-in files on disk', () => {
    const registryFiles = registryItem.files.map((file) => file.path);
    const registryTargets = registryItem.files.map((file) => file.target);
    const installableFiles = Object.keys(registryInstallableFileModules)
      .map((filePath) => filePath.replace('../registry/vue/dossier-tabs/', ''))
      .filter((file) => file !== 'README.md' && file !== 'dossier-tabs.json')
      .sort();

    expect([...registryFiles].sort()).toEqual(installableFiles);
    expect(new Set(registryFiles).size).toBe(registryFiles.length);
    expect(new Set(registryTargets).size).toBe(registryTargets.length);

    for (const file of registryItem.files) {
      expect(file.target).toBe(`components/ui/dossier-tabs/${file.path}`);

      if (file.path.endsWith('.vue')) {
        expect(file.type).toBe('registry:ui');
      } else if (file.path.endsWith('.css')) {
        expect(file.type).toBe('registry:style');
      } else if (file.path.endsWith('.png') || file.path.endsWith('.jpg')) {
        expect(file.type).toBe('registry:file');
      } else {
        expect(file.type).toBe('registry:lib');
      }
    }
  });

  it('keeps the registry README aligned with the physical copy-in mental model', () => {
    expect(registryReadmeMarkdown).toContain('`DossierStack`');
    expect(registryReadmeMarkdown).toContain('one `DossierFile` per tab inside a `DossierTray`');
    expect(registryReadmeMarkdown).toContain('each dossier owns its tab handle');
    expect(registryReadmeMarkdown).toContain('recently selected dossiers keep both a higher resting z-index and a shallower tuck offset');
    expect(registryReadmeMarkdown).toContain('icon-safe handle lane exposed so the icon stays visible');
    expect(registryReadmeMarkdown).toContain('only the handle tugs toward the tab edge');
    expect(registryReadmeMarkdown).toContain('Use `emulatedHoverKey` only as a visual QA hook');
    expect(registryReadmeMarkdown).toContain('The canonical source currently lives in `src/components/dossier-tabs/`.');
  });

  it('documents DossierTray as the holder layer, not the pull transform owner', () => {
    expect(readmeMarkdown).toContain('`DossierStack` can pull dossiers out in the configured edge direction');
    expect(readmeMarkdown).toContain('Raises the tray/front layer for a pulled stack.');
    expect(readmeMarkdown).toContain('`DossierStack` owns the tab-and-dossier pull motion.');
    expect(readmeMarkdown).toContain('Tray layers recede away from this edge; `DossierStack` applies active dossier pull motion.');
    expect(readmeMarkdown).not.toContain('Moves the dossier outward along the edge for a short');
    expect(readmeMarkdown).not.toContain('The active dossier pulls toward this edge while stack layers recede away from it.');
  });

  it('keeps the source barrel self-contained for CSS imports without shipping a conflicting Vue shim', () => {
    const registryFiles = registryItem.files.map((file) => file.path);
    const registryTargets = registryItem.files.map((file) => file.target);

    expect(sourceBarrel).toContain('/// <reference path="./css.d.ts" />');
    expect(sourceBarrel).not.toContain('/// <reference path="./vue.d.ts" />');
    expect(readmeMarkdown).toContain('src/components/dossier-tabs/css.d.ts');
    expect(readmeMarkdown).not.toContain('src/components/dossier-tabs/vue.d.ts');
    expect(registryFiles).toContain('css.d.ts');
    expect(registryFiles).not.toContain('vue.d.ts');
    expect(registryTargets).toContain('components/ui/dossier-tabs/css.d.ts');
    expect(registryTargets).not.toContain('components/ui/dossier-tabs/vue.d.ts');
    expect(packageJson.exports['./source'].types).toBe('./dist/index.d.ts');
    expect(packageJson.exports['./source'].import).toBe('./src/components/dossier-tabs/index.ts');
    expect(packageJson.files).toContain('src/vite-env.d.ts');
  });

  it('keeps the consolidated demo focused on three component exhibits', () => {
    expect(appVueSource).toContain('class="demo-stage demo-stage--primary"');
    expect(appVueSource).toContain('class="demo-stage demo-stage--workbench"');
    expect(appVueSource).toContain('class="demo-rail-stage"');
    expect(appVueSource).not.toContain('activeStandaloneSide');
    expect(appVueSource).not.toContain('class="demo-rail-specimen"');
    expect(appVueSource).not.toContain('class="demo-rail-side"');
    expect(demoCss).toContain('.demo-rail-stage {');
    expect(demoCss).not.toContain('.demo-rail-specimen');
    expect(demoCss).not.toContain('.demo-rail-side');
    expect(demoCss).not.toContain('.demo-stage--split');
    expect(demoCss).not.toContain('.demo-stage--compact');
    expect(demoCss).not.toContain('.demo-stage--right');
  });

  it('keeps demo prose from clipping on narrow screenshots', () => {
    expect(demoCss).toContain([
      '.demo-lede {',
      '  max-inline-size: 34rem;',
      '  margin: 0;',
      '  color: #cac3b6;',
      '  font-size: clamp(1.05rem, 1.6vw, 1.32rem);',
      '  line-height: 1.55;',
      '  overflow-wrap: anywhere;',
      '}',
    ].join('\n'));
    expect(demoCss).toContain([
      '.demo-section-copy p:last-child {',
      '  max-inline-size: 43rem;',
      '  margin-block: 0.9rem 0;',
      '  font-size: 1.08rem;',
      '}',
    ].join('\n'));
    expect(demoCss).toContain([
      '.demo-dossier p,',
      '.demo-section-copy p {',
      '  color: var(--dossier-ink-muted, #c9c2b6);',
      '  line-height: 1.6;',
      '  overflow-wrap: anywhere;',
      '}',
    ].join('\n'));
    expect(demoCss).toContain([
      '.demo-media__copy p {',
      '  max-inline-size: 33rem;',
      '  margin-block: 1rem 0;',
      '  font-size: clamp(0.98rem, 1.3vw, 1.12rem);',
      '}',
    ].join('\n'));
  });

  it('reserves visible inward gutters for side-edge physical dossier stacks', () => {
    const leftEdgeRule = [
      '.dossier-stack--edge-left {',
      '  padding-inline-start: var(--dossier-side-tab-outset);',
      '  padding-inline-end: var(--dossier-side-stack-reveal);',
      '  overflow-x: visible;',
    ].join('\n');
    const rightEdgeRule = [
      '.dossier-stack--edge-right {',
      '  --dt-label-rotation: 90deg;',
      '',
      '  padding-inline-start: var(--dossier-side-stack-reveal);',
      '  padding-inline-end: var(--dossier-side-tab-outset);',
      '  overflow-x: visible;',
    ].join('\n');

    expect(dossierTabsCss).toContain('--dossier-side-stack-reveal: 6rem;');
    expect(dossierTabsCss).toContain('--dossier-side-tab-outset: max(');
    expect(dossierTabsCss).toContain(leftEdgeRule);
    expect(dossierTabsCss).toContain(rightEdgeRule);
    expect(dossierTabsCss).toContain('.dossier-stack--mixed-edge.dossier-stack--has-edge-left.dossier-stack--has-edge-right');
    expect(dossierTabsCss).toContain('  padding-inline-start: var(--dossier-side-tab-outset);\n  padding-inline-end: var(--dossier-side-tab-outset);');
  });

  it('keeps hover motion on the tab handle instead of the dossier sheet', () => {
    expect(dossierTabsCss).toContain('.dossier-stack__file:not(.is-active).is-hovered .dossier-stack__tab');
    expect(dossierTabsCss).toContain('.dossier-stack__file:not(.is-active).is-focused .dossier-stack__tab');
    expect(dossierTabsCss).toContain('--dossier-index-transform-x: var(--dossier-index-hover-x);');
    expect(dossierTabsCss).toContain('--dossier-index-transform-y: var(--dossier-index-hover-y);');
    expect(dossierTabsCss).toContain('transform: translate3d(var(--dossier-index-transform-x), var(--dossier-index-transform-y), 0px) rotate(var(--dossier-index-rotate));');
    expect(dossierTabsCss).not.toContain('transform: translate3d(var(--dossier-piece-hover-x), var(--dossier-piece-hover-y), 0px);');
  });

  it('renders dossier position from component-owned physical offset variables', () => {
    expect(dossierTabsCss).toContain('--dossier-piece-x: 0px;');
    expect(dossierTabsCss).toContain('--dossier-piece-y: 0px;');
    expect(dossierTabsCss).toContain('--dossier-piece-rotate: 0deg;');
    expect(dossierTabsCss).toContain('--dossier-index-transform-x: 0px;');
    expect(dossierTabsCss).toContain('--dossier-index-transform-y: 0px;');
    expect(dossierTabsCss).toContain('--dossier-index-rotate: 0deg;');
    expect(dossierTabsCss).toContain([
      '.dossier-stack__file {',
      '  --dossier-attached-tab-border: var(--dossier-border);',
    ].join('\n'));
    expect(dossierTabsCss).toContain('transform: translate3d(var(--dossier-piece-x), var(--dossier-piece-y), 0px);');
    expect(dossierTabsCss).toContain([
      '.dossier-stack--stack-rotation-pieces .dossier-stack__file {',
      '  transform: translate3d(var(--dossier-piece-x), var(--dossier-piece-y), 0px) rotate(var(--dossier-piece-rotate));',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).not.toContain('transform: translate3d(var(--dossier-piece-rest-x), var(--dossier-piece-rest-y), 0px);');
    expect(dossierTabsCss).not.toContain('transform: translate3d(var(--dossier-piece-pull-x), var(--dossier-piece-pull-y), 0px);');
  });

  it('lets integrations tune the physical pull distance explicitly', () => {
    expect(getDossierPullOffset('top')).toEqual({ x: 0, y: 0 });
    expect(getDossierPullOffset('top', 8)).toEqual({ x: 0, y: -8 });
    expect(getDossierPullOffset('right', 12)).toEqual({ x: 12, y: 0 });
    expect(getDossierPullOffset('bottom', 0)).toEqual({ x: 0, y: 0 });
    expect(getDossierPullOffset('left', -4)).toEqual({ x: 0, y: 0 });
    expect(normalizeDossierPullDistance(Number.NaN)).toBe(0);
    expect(normalizeDossierPullDistance(5.5)).toBe(5.5);
  });

  it('can rotate tucked dossier sheets and tab handles independently', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-stack__sheet {',
      '  position: absolute;',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-stack--stack-rotation-files .dossier-stack__sheet {',
      '  transform: rotate(var(--dossier-piece-rotate));',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-stack--stack-rotation-files.dossier-stack--tab-rotation-rotated .dossier-stack__file:not(.is-active) {',
      '  --dossier-index-rotate: var(--dossier-index-piece-rotate);',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-stack--stack-rotation-pieces.dossier-stack--tab-rotation-straight .dossier-stack__file:not(.is-active) {',
      '  --dossier-index-rotate: var(--dossier-index-counter-rotate);',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).not.toContain('.dossier-stack--stack-rotation-files .dossier-stack__file {\n  transform: translate3d(var(--dossier-piece-x), var(--dossier-piece-y), 0px) rotate(var(--dossier-piece-rotate));');
  });

  it('removes attached tab borders when whole physical pieces rotate', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab,',
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab:hover,',
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab:focus-visible,',
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab.is-active,',
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab.is-expanded,',
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab.is-hovered,',
      '.dossier-stack--stack-rotation-pieces .dossier-stack__tab.is-open {',
      '  border-color: transparent;',
      '}',
    ].join('\n'));
  });

  it('keeps active pulled dossiers visually pinned without waiting for motion', () => {
    expect(dossierTabsCss).toContain('.dossier-stack__file.is-active.is-pulled');
    expect(dossierTabsCss).toContain([
      '.dossier-stack__file.is-active.is-pulled,',
      '.dossier-stack__file.is-active.is-pulled .dossier-stack__sheet,',
      '.dossier-stack__file.is-active.is-pulled .dossier-stack__tab {',
      '  transition-duration: 0ms;',
      '}',
    ].join('\n'));
  });

  it('shows newly selected dossiers immediately while the outgoing dossier returns', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-stack__file.is-selecting,',
      '.dossier-stack__file.is-selecting .dossier-stack__sheet,',
      '.dossier-stack__file.is-selecting .dossier-stack__tab {',
      '  transition-duration: 0ms;',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain('.dossier-stack__file.is-returning {');
    expect(dossierTabsCss).toContain('transition-duration: var(--dossier-motion-return-duration);');
  });

  it('keeps tucked dossiers pinned to their current remembered rest variables', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-stack__file.is-tucked {',
      '  transition-duration: 0ms;',
      '}',
    ].join('\n'));
  });

  it('uses physical size fallbacks so side reach lanes cannot collapse to compact width', () => {
    expect(dossierTabsCss).toContain('height var(--dossier-motion-duration) var(--dossier-motion-ease),');
    expect(dossierTabsCss).toContain('width var(--dossier-motion-duration) var(--dossier-motion-ease),');
    expect(dossierTabsCss).toContain([
      '.dossier-stack__file--vertical .dossier-stack__tab {',
      '  width: var(--dossier-attached-tab-reach-size);',
      '  height: var(--dossier-attached-tab-compact-size);',
      '  inline-size: var(--dossier-attached-tab-reach-size);',
      '  block-size: var(--dossier-attached-tab-compact-size);',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-stack__file--vertical .dossier-stack__tab.is-open,',
      '.dossier-stack__file--vertical .dossier-stack__tab.is-expanded,',
      '.dossier-stack--expand-always .dossier-stack__file--vertical .dossier-stack__tab {',
      '  width: var(--dossier-attached-tab-reach-size);',
      '  height: var(--dossier-attached-tab-open-size);',
      '  inline-size: var(--dossier-attached-tab-reach-size);',
      '  block-size: var(--dossier-attached-tab-open-size);',
      '}',
    ].join('\n'));
  });

  it('keeps attached dossier expansion owned by component state classes', () => {
    expect(dossierTabsCss).toContain('.dossier-stack__file--horizontal .dossier-stack__tab.is-expanded,');
    expect(dossierTabsCss).toContain('.dossier-stack__file--vertical .dossier-stack__tab.is-expanded,');
    expect(dossierTabsCss).not.toContain('.dossier-stack--expand-hover .dossier-stack__file--horizontal .dossier-stack__tab:hover');
    expect(dossierTabsCss).not.toContain('.dossier-stack--expand-hover .dossier-stack__file--vertical .dossier-stack__tab:hover');
    expect(dossierTabsCss).not.toContain('.dossier-stack--expand-focus .dossier-stack__file--horizontal .dossier-stack__tab:focus-visible');
    expect(dossierTabsCss).not.toContain('.dossier-stack--expand-focus .dossier-stack__file--vertical .dossier-stack__tab:focus-visible');
  });

  it('keeps hidden attachment measurement tabs from forming a horizontal overflow rail', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-stack__measurer {',
      '  position: fixed;',
      '  inset: 0 auto auto 0;',
      '  z-index: -1;',
      '  display: grid;',
      '  grid-auto-flow: row;',
    ].join('\n'));
    expect(dossierTabsCss).not.toContain([
      '.dossier-stack__measurer {',
      '  position: fixed;',
      '  inset: 0 auto auto 0;',
      '  z-index: -1;',
      '  display: flex;',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-stack__measure-tab .dossier-stack__tab-icon,',
      '.dossier-stack__measure-tab .dossier-stack__tab-label,',
      '.dossier-stack__measure-tab .dossier-stack__tab-count,',
      '.dossier-stack__measure-tab .dossier-stack__tab-lock {',
      '  position: static;',
      '  opacity: 1;',
      '  transform: none;',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).not.toContain('  transform: none;\n  visibility: visible;\n}');
  });

  it('keeps reduced-motion overrides after physical dossier transitions', () => {
    const dossierTransitionRuleIndex = dossierTabsCss.indexOf('.dossier {\n  position: relative;');
    const reducedMotionPhysicalRuleIndex = dossierTabsCss.lastIndexOf('@media (prefers-reduced-motion: reduce) {');
    const reducedMotionPhysicalRule = dossierTabsCss.slice(reducedMotionPhysicalRuleIndex);

    expect(dossierTransitionRuleIndex).toBeGreaterThan(-1);
    expect(reducedMotionPhysicalRuleIndex).toBeGreaterThan(dossierTransitionRuleIndex);
    expect(dossierTabsCss).toContain('  .dossier-tabs__tab::before,');
    expect(dossierTabsCss).toContain('  .dossier-tabs__tab::after,');
    expect(reducedMotionPhysicalRule).toContain('.dossier-stack__tab-icon,');
    expect(reducedMotionPhysicalRule).toContain('.dossier-stack__tab-label,');
    expect(reducedMotionPhysicalRule).toContain('.dossier-stack__tab-count,');
    expect(reducedMotionPhysicalRule).toContain('    transition: none !important;');
    expect(reducedMotionPhysicalRule).toContain('    animation: none !important;');
    expect(dossierTabsCss).not.toContain('    transition: none;\n');
  });

  it('keeps standalone horizontal tabs free of panel-seam underlines', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-tabs--horizontal .dossier-tabs__tab::before {',
      '  inset-inline: 0.5rem;',
      '  inset-block-end: 0;',
      '  block-size: 1px;',
      '  display: none;',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-tabs--horizontal .dossier-tabs__tab::after {',
      '  inset-inline: 0;',
      '  inset-block-end: -1px;',
      '  block-size: 1px;',
      '  display: none;',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain([
      '.dossier-tabs--horizontal .dossier-tabs__tab:hover {',
      '  box-shadow:',
      '    0 0.65rem 1.45rem rgba(0, 0, 0, 0.18),',
      '    inset 0 1px 0 rgba(255, 255, 255, 0.055);',
      '  transform: translateY(var(--dt-hover-lift));',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).not.toContain('box-shadow: inset 0 -1px 0 var(--dt-surface-active), var(--dt-shadow);');
  });

  it('lets each attached dossier piece own tab geometry independently of root orientation', () => {
    expect(dossierTabsCss).toContain('.dossier-stack__file--vertical .dossier-stack__tab {');
    expect(dossierTabsCss).toContain('.dossier-stack__file--edge-right .dossier-stack__tab {');
    expect(dossierTabsCss).toContain('--dossier-index-slot: var(--dossier-piece-slot);');
    expect(dossierTabsCss).toContain('inset-block-start: calc(var(--dossier-index-slot) - var(--dossier-stack-border-width));');
    expect(dossierTabsCss).toContain('inset-inline-start: calc(var(--dossier-index-slot) - var(--dossier-stack-border-width));');
    expect(dossierTabsCss).toContain('.dossier-stack__file--horizontal .dossier-stack__tab.is-open');
    expect(dossierTabsCss).toContain('.dossier-stack__file--vertical .dossier-stack__tab.is-open');
    expect(dossierTabsCss).toContain('--dossier-attached-tab-grab-size: var(--dossier-attached-tab-cross-size);');
    expect(dossierTabsCss).toContain('block-size: var(--dossier-attached-tab-reach-size);');
    expect(dossierTabsCss).toContain('inline-size: var(--dossier-attached-tab-reach-size);');
    expect(dossierTabsCss).toContain('inset-inline-start: calc(var(--dossier-attached-tab-reach-size) - (var(--dossier-attached-tab-grab-size) / 2));');
    expect(dossierTabsCss).not.toMatch(/\.dossier-stack--(?:horizontal|vertical|mixed-edge)[^{]*\.dossier-stack__tab/);
    expect(dossierTabsCss).not.toMatch(/\.dossier-stack--edge-(?:top|bottom|left|right)[^{]*\.dossier-stack__tab/);
  });

  it('keeps vertical attached tab counts in a bottom lane instead of stretching through labels', () => {
    const verticalCountRule = [
      '.dossier-stack__file--vertical .dossier-stack__tab-count {',
      '  inset-block-start: auto;',
      '  inset-block-end: var(--dossier-attached-tab-vertical-count-offset);',
      '  inset-inline-start: 50%;',
      '  inset-inline-end: auto;',
    ].join('\n');

    expect(dossierTabsCss).toContain('--dossier-attached-tab-vertical-label-size: max(4.75rem, calc(var(--dossier-attached-tab-open-size) - 4.9rem));');
    expect(dossierTabsCss).toContain('--dossier-attached-tab-vertical-icon-offset: 0.78rem;');
    expect(dossierTabsCss).toContain('--dossier-attached-tab-vertical-count-offset: 0.72rem;');
    expect(dossierTabsCss).toContain(verticalCountRule);
    expect(dossierTabsCss).toContain('  min-inline-size: 1.35rem;\n  text-align: center;');
  });

  it('renders accessible tablist semantics and compact active labels', () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    expect(wrapper.attributes('role')).toBe('tablist');
    expect(wrapper.attributes('aria-label')).toBe('Media dossiers');
    expect(wrapper.find('[role="tab"]').attributes('aria-label')).toBe('Object photos, 1/15');
    expect(wrapper.find('[role="tab"]').attributes('id')).toMatch(/^dossier-tabs-/);
    expect(wrapper.find('[role="tab"]').attributes('aria-controls')).toBeUndefined();
    expect(wrapper.find('.dossier-tabs__label').text()).toBe('Photos');
  });

  it('renders attachment measurement controls as an inert hidden subtree', () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });
    const measurer = wrapper.find('.dossier-stack__measurer');

    expect(measurer.attributes('aria-hidden')).toBe('true');
    expect(measurer.attributes()).toHaveProperty('inert');
    expect(measurer.findAll('.dossier-stack__measure-tab'))
      .toHaveLength(tabs.length * 2);
    for (const measureTab of measurer.findAll('.dossier-stack__measure-tab')) {
      expect(measureTab.attributes('tabindex')).toBe('-1');
    }
  });

  it('renders explicit countLabel-only counts visibly as well as accessibly', () => {
    const explicitCountTabs: DossierIndexItem[] = [
      { key: 'docs', label: 'Documents', shortLabel: 'Docs', countLabel: '12' },
      { key: 'notes', label: 'Notes', shortLabel: 'Notes' },
    ];

    const rail = mount(DossierIndex, {
      props: {
        tabs: explicitCountTabs,
        modelValue: 'docs',
        ariaLabel: 'Document dossiers',
      },
    });

    expect(rail.find('[role="tab"]').attributes('aria-label')).toBe('Documents, 12');
    expect(rail.find('.dossier-tabs__count').text()).toBe('12');

    const attached = mount(DossierStack, {
      props: {
        tabs: explicitCountTabs,
        modelValue: 'docs',
        ariaLabel: 'Attached document dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(attached.find('[role="tab"]').attributes('aria-label')).toBe('Documents, 12');
    expect(attached.find('.dossier-stack__tab-count').text()).toBe('12');
  });

  it('treats countLabel as the complete visible count instead of appending total suffixes', () => {
    const overrideTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Object photos', shortLabel: 'Photos', count: 1, totalCount: 15, countLabel: '15' },
    ];

    const rail = mount(DossierIndex, {
      props: {
        tabs: overrideTabs,
        modelValue: 'photos',
        ariaLabel: 'Photo dossiers',
      },
    });

    expect(rail.find('[role="tab"]').attributes('aria-label')).toBe('Object photos, 15');
    expect(rail.find('.dossier-tabs__count').text()).toBe('15');
    expect(rail.find('.dossier-tabs__lock').exists()).toBe(false);

    const attached = mount(DossierStack, {
      props: {
        tabs: overrideTabs,
        modelValue: 'photos',
        ariaLabel: 'Attached photo dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(attached.find('[role="tab"]').attributes('aria-label')).toBe('Object photos, 15');
    expect(attached.find('.dossier-stack__tab-count').text()).toBe('15');
    expect(attached.find('.dossier-stack__tab-lock').exists()).toBe(false);
  });

  it('does not render invalid runtime label or count values as object text', () => {
    const runtimeTextTabs = [
      {
        key: 'photos',
        label: 'Object photos',
        shortLabel: {},
        srLabel: {},
        count: 1,
        totalCount: 15,
        countLabel: {},
      },
      {
        key: 'plans',
        label: 'Floor plans',
        count: {},
        totalCount: 8,
      },
      {
        key: 'audit',
        label: 'Audit',
        count: 3,
        totalCount: 'Infinity',
      },
    ] as any;

    const rail = mount(DossierIndex, {
      props: {
        tabs: runtimeTextTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime text dossiers',
      },
    });

    const attached = mount(DossierStack, {
      props: {
        tabs: runtimeTextTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime attached text dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(rail.find('[role="tab"]').attributes('aria-label')).toBe('Object photos, 1/15');
    expect(rail.find('.dossier-tabs__label').text()).toBe('Object photos');
    expect(rail.find('.dossier-tabs__count').text()).toBe('1/15');
    expect(rail.html()).not.toContain('[object Object]');
    expect(attached.find('[role="tab"]').attributes('aria-label')).toBe('Object photos, 1/15');
    expect(attached.find('.dossier-stack__tab-label').text()).toBe('Object photos');
    expect(attached.find('.dossier-stack__tab-count').text()).toBe('1/15');
    expect(attached.find('.dossier-stack__tab-lock').text()).toBe('/15');
    expect(attached.html()).not.toContain('[object Object]');
    expect(attached.html()).not.toContain('Infinity');
  });

  it('sizes standalone tab labels from measured pixel geometry', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    Object.defineProperty(wrapper.find('.dossier-tabs__label').element, 'scrollWidth', {
      configurable: true,
      value: 96,
    });
    Object.defineProperty(wrapper.find('.dossier-tabs__count').element, 'scrollWidth', {
      configurable: true,
      value: 32,
    });

    window.dispatchEvent(new Event('resize'));
    await waitForMotionFrame();

    const activeTabStyle = wrapper.find('[role="tab"]').attributes('style') ?? '';

    expect(activeTabStyle).toContain('--dossier-index-label-size: 96.00px');
    expect(activeTabStyle).toContain('--dossier-index-count-size: 32.00px');
    expect(activeTabStyle).not.toContain('ch');
  });

  it('keeps standalone measured CSS variables finite when DOM metrics are non-finite', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    Object.defineProperty(wrapper.find('.dossier-tabs__label').element, 'scrollWidth', {
      configurable: true,
      value: Number.POSITIVE_INFINITY,
    });
    Object.defineProperty(wrapper.find('.dossier-tabs__count').element, 'scrollWidth', {
      configurable: true,
      value: Number.NaN,
    });

    window.dispatchEvent(new Event('resize'));
    await waitForMotionFrame();

    const activeTabStyle = wrapper.find('[role="tab"]').attributes('style') ?? '';

    expect(activeTabStyle).toContain('--dossier-index-label-size: 88.00px');
    expect(activeTabStyle).toContain('--dossier-index-count-size: 28.00px');
    expect(activeTabStyle).not.toContain('Infinity');
    expect(activeTabStyle).not.toContain('NaN');
  });

  it('does not reuse stale standalone measurements when a removed tab key returns', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    Object.defineProperty(wrapper.findAll('.dossier-tabs__label')[1].element, 'scrollWidth', {
      configurable: true,
      value: 180,
    });

    window.dispatchEvent(new Event('resize'));
    await waitForMotionFrame();

    expect(wrapper.findAll('[role="tab"]')[1].attributes('style'))
      .toContain('--dossier-index-label-size: 180.00px');

    await wrapper.setProps({ tabs: tabs.filter((tab) => tab.key !== 'plans') });
    await nextTick();
    await wrapper.setProps({ tabs });
    await nextTick();

    expect(wrapper.findAll('[role="tab"]')[1].attributes('style'))
      .toContain('--dossier-index-label-size: 88.00px');
    expect(wrapper.findAll('[role="tab"]')[1].attributes('style'))
      .not.toContain('--dossier-index-label-size: 180.00px');
  });

  it('does not schedule standalone measurement frames after immediate unmount', async () => {
    const requestFrameSpy = vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 456);
    const cancelFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    try {
      const wrapper = mount(DossierIndex, {
        props: {
          tabs,
          modelValue: 'photos',
          ariaLabel: 'Media dossiers',
        },
      });

      expect(requestFrameSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
      expect(cancelFrameSpy).toHaveBeenCalledWith(456);

      await nextTick();

      expect(requestFrameSpy).toHaveBeenCalledTimes(1);
    } finally {
      requestFrameSpy.mockRestore();
      cancelFrameSpy.mockRestore();
    }
  });

  it('keeps attached measured CSS variables finite when DOM metrics are non-finite', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    for (const measureTab of wrapper.findAll('.dossier-stack__measure-tab')) {
      Object.defineProperty(measureTab.element, 'scrollHeight', {
        configurable: true,
        value: Number.POSITIVE_INFINITY,
      });
      Object.defineProperty(measureTab.element, 'scrollWidth', {
        configurable: true,
        value: Number.NaN,
      });
      measureTab.element.getBoundingClientRect = () => ({
        bottom: Number.POSITIVE_INFINITY,
        height: Number.POSITIVE_INFINITY,
        left: 0,
        right: Number.POSITIVE_INFINITY,
        top: 0,
        width: Number.POSITIVE_INFINITY,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
    }

    window.dispatchEvent(new Event('resize'));
    await waitForMotionFrame();

    const activeDossierStyle = wrapper.find('.dossier-stack__file.is-active').attributes('style') ?? '';
    const activeTabStyle = wrapper.find('[role="tab"][aria-selected="true"]').attributes('style') ?? '';

    expect(activeDossierStyle).toContain('--dossier-attached-tab-grab-size: 44.00px');
    expect(activeDossierStyle).toContain('--dossier-attached-tab-reach-size: 44.00px');
    expect(activeTabStyle).toContain('--dossier-attached-tab-compact-size: 44.00px');
    expect(activeTabStyle).toContain('--dossier-attached-tab-open-size: 60.00px');
    expect(`${activeDossierStyle}${activeTabStyle}`).not.toContain('Infinity');
    expect(`${activeDossierStyle}${activeTabStyle}`).not.toContain('NaN');
  });

  it('does not reuse stale attached measurements when a removed dossier key returns', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const plansOpenMeasure = wrapper.findAll('.dossier-stack__measure-tab--open')[1].element;

    plansOpenMeasure.getBoundingClientRect = () => ({
      bottom: 44,
      height: 44,
      left: 0,
      right: 180,
      top: 0,
      width: 180,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    window.dispatchEvent(new Event('resize'));
    await waitForMotionFrame();

    expect(wrapper.findAll('[role="tab"]')[1].attributes('style'))
      .toContain('--dossier-attached-tab-open-size: 196.00px');

    await wrapper.setProps({ tabs: tabs.filter((tab) => tab.key !== 'plans') });
    await nextTick();
    await wrapper.setProps({ tabs });
    await nextTick();

    expect(wrapper.findAll('[role="tab"]')[1].attributes('style'))
      .toContain('--dossier-attached-tab-open-size: 156.00px');
    expect(wrapper.findAll('[role="tab"]')[1].attributes('style'))
      .not.toContain('--dossier-attached-tab-open-size: 196.00px');
  });

  it('uses explicit external panel ids on the standalone rail without generating internal panels', () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        panelIdForTab: (tab: DossierIndexItem) => ` standalone-panel-${tab.key} `,
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('aria-controls')).toBe('standalone-panel-photos');
    expect(renderedTabs[1].attributes('aria-controls')).toBe('standalone-panel-plans');
    expect(renderedTabs[0].attributes('id')).toMatch(/^dossier-tabs-/);
    expect(renderedTabs[1].attributes('id')).toMatch(/^dossier-tabs-/);
    expect(renderedTabs[0].attributes('id')).not.toBe(renderedTabs[1].attributes('id'));
    expect(wrapper.find('[role="tabpanel"]').exists()).toBe(false);
  });

  it('omits duplicate standalone aria-controls instead of pointing multiple tabs at one panel id', () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Duplicate external panel dossiers',
        panelIdForTab: () => 'shared-panel',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('aria-controls')).toBe('shared-panel');
    expect(renderedTabs[1].attributes('aria-controls')).toBeUndefined();
    expect(renderedTabs[2].attributes('aria-controls')).toBeUndefined();
    expect(renderedTabs[3].attributes('aria-controls')).toBeUndefined();
    expect(renderedTabs.map((tab) => tab.attributes('aria-controls')).filter(Boolean)).toEqual(['shared-panel']);
  });

  it('falls back to tab panel ids when standalone callback panel ids collide', () => {
    const panelFallbackTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Photos', panelId: 'tab-panel-photos' },
      { key: 'plans', label: 'Plans', panelId: 'tab-panel-plans' },
      { key: 'docs', label: 'Docs', panelId: 'shared-panel' },
    ];
    const wrapper = mount(DossierIndex, {
      props: {
        tabs: panelFallbackTabs,
        modelValue: 'photos',
        ariaLabel: 'Fallback external panel dossiers',
        panelIdForTab: () => 'shared-panel',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('aria-controls')).toBe('shared-panel');
    expect(renderedTabs[1].attributes('aria-controls')).toBe('tab-panel-plans');
    expect(renderedTabs[2].attributes('aria-controls')).toBeUndefined();
    expect(new Set(renderedTabs.map((tab) => tab.attributes('aria-controls')).filter(Boolean)).size).toBe(2);
  });

  it('ignores invalid runtime panel ids on the standalone rail', () => {
    const runtimePanelTabs = [
      { key: 'photos', label: 'Photos', panelId: {} },
      { key: 'plans', label: 'Plans', panelId: 'external panel plans' },
      { key: 'docs', label: 'Docs', panelId: 'external-panel-docs' },
    ] as any;

    const wrapper = mount(DossierIndex, {
      props: {
        tabs: runtimePanelTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime panel dossiers',
        panelIdForTab: (tab: DossierIndexItem) => (tab.key === 'photos' ? { id: 'bad' } : ''),
      } as any,
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('aria-controls')).toBeUndefined();
    expect(renderedTabs[1].attributes('aria-controls')).toBeUndefined();
    expect(renderedTabs[2].attributes('aria-controls')).toBe('external-panel-docs');
    expect(renderedTabs.map((tab) => tab.attributes('aria-controls') ?? ''))
      .not.toContain('[object Object]');
    expect(renderedTabs.map((tab) => tab.attributes('aria-controls') ?? ''))
      .not.toContain('external panel plans');
  });

  it('ignores invalid standalone panel id callback props at runtime', () => {
    const runtimePanelTabs = [
      { key: 'photos', label: 'Photos', panelId: 'external-panel-photos' },
      { key: 'plans', label: 'Plans' },
    ] as any;

    const wrapper = mount(DossierIndex, {
      props: {
        tabs: runtimePanelTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime panel callback dossiers',
        panelIdForTab: { id: 'bad-callback' },
      } as any,
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('aria-controls')).toBe('external-panel-photos');
    expect(renderedTabs[1].attributes('aria-controls')).toBeUndefined();
    expect(renderedTabs.map((tab) => tab.attributes('aria-controls') ?? '')).not.toContain('bad-callback');
  });

  it('deduplicates rendered tabs by string key identity', () => {
    const duplicateTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Original photos' },
      { key: 'photos', label: 'Duplicate photos' },
      { key: 12, label: 'Numeric report' },
      { key: '12', label: 'String duplicate report' },
    ];

    const wrapper = mount(DossierIndex, {
      props: {
        tabs: duplicateTabs,
        modelValue: 'photos',
        ariaLabel: 'Duplicate-safe dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    expect(renderedTabs).toHaveLength(2);
    expect(renderedTabs.map((tab) => tab.attributes('aria-label'))).toEqual(['Original photos', 'Numeric report']);
    expect(renderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(1);
  });

  it('skips invalid runtime tab keys before rendering tablist state', () => {
    const runtimeTabs = [
      { key: 'photos', label: 'Photos' },
      { key: {}, label: 'Object key' },
      { key: false, label: 'Boolean key' },
      { key: Symbol('symbol'), label: 'Symbol key' },
      { key: () => 'function', label: 'Function key' },
      { key: 0, label: 'Zero key' },
    ] as any;

    const rail = mount(DossierIndex, {
      props: {
        tabs: runtimeTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime-safe dossiers',
      },
    });

    const attachment = mount(DossierStack, {
      props: {
        tabs: runtimeTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime-safe attached dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(rail.findAll('[role="tab"]').map((tab) => tab.attributes('aria-label')))
      .toEqual(['Photos', 'Zero key']);
    expect(attachment.findAll('[role="tab"]').map((tab) => tab.attributes('aria-label')))
      .toEqual(['Photos', 'Zero key']);
    expect(attachment.findAll('.dossier-stack__file')).toHaveLength(2);
  });

  it('renders reactive icon components without Vue component proxy warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reactiveTabs = reactive(tabs.map((tab) => ({ ...tab }))) as DossierIndexItem[];

    try {
      const rail = mount(DossierIndex, {
        props: {
          tabs: reactiveTabs,
          modelValue: 'photos',
          ariaLabel: 'Media dossiers',
        },
      });

      const attachment = mount(DossierStack, {
        props: {
          tabs: reactiveTabs,
          modelValue: 'photos',
          ariaLabel: 'Media dossiers',
        },
        slots: {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        },
      });

      const warningText = warn.mock.calls.flat().map((entry) => String(entry)).join('\n');
      expect(warningText).not.toContain('Vue received a Component that was made a reactive object');
      rail.unmount();
      attachment.unmount();
    } finally {
      warn.mockRestore();
    }
  });

  it('ignores invalid runtime icon values instead of rendering dynamic elements', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const invalidIconTabs = [
      { key: 'photos', label: 'Photos', icon: 'article' },
      { key: 'plans', label: 'Plans', icon: {} },
    ] as any;

    try {
      const rail = mount(DossierIndex, {
        props: {
          tabs: invalidIconTabs,
          modelValue: 'photos',
          ariaLabel: 'Runtime icon dossiers',
        },
      });

      const attachment = mount(DossierStack, {
        props: {
          tabs: invalidIconTabs,
          modelValue: 'photos',
          ariaLabel: 'Runtime attached icon dossiers',
        },
        slots: {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        },
      });

      const warningText = warn.mock.calls.flat().map((entry) => String(entry)).join('\n');
      expect(warningText).not.toContain('Component is missing template or render function');
      expect(warningText).not.toContain('Invalid vnode type');
      expect(rail.html()).not.toContain('<article');
      expect(attachment.html()).not.toContain('<article');
      rail.unmount();
      attachment.unmount();
    } finally {
      warn.mockRestore();
    }
  });

  it('supports stacked vertical dossier appearance without changing tab semantics', () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        appearance: 'stack',
      },
    });

    expect(wrapper.classes()).toContain('dossier-tabs--appearance-stack');
    expect(wrapper.find('[role="tab"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[role="tab"]').attributes('aria-label')).toBe('Object photos, 1/15');
  });

  it('does not let external pulled state visually pull a disabled standalone tab', () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        pulledKey: 'maps',
        ariaLabel: 'Media dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    expect(renderedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(renderedTabs[2].classes()).not.toContain('is-pulled');
    expect(renderedTabs.some((tab) => tab.classes().includes('is-pulled'))).toBe(false);
  });

  it('keeps disabled standalone tabs inert for keyboard events fired directly on them', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[2].trigger('keydown', { key: 'ArrowRight' });
    await renderedTabs[2].trigger('keydown', { key: 'Enter' });

    expect(renderedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
    expect(renderedTabs[0].attributes('tabindex')).toBe('0');
    expect(renderedTabs[2].attributes('tabindex')).toBe('-1');
  });

  it('treats non-boolean runtime disabled values as enabled in rendered tabs', async () => {
    const runtimeDisabledTabs = [
      { key: 'photos', label: 'Photos' },
      { key: 'plans', label: 'Plans', disabled: 'false' },
      { key: 'docs', label: 'Docs', disabled: true },
    ] as any;

    const rail = mount(DossierIndex, {
      props: {
        tabs: runtimeDisabledTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime disabled dossiers',
      },
    });
    const attached = mount(DossierStack, {
      props: {
        tabs: runtimeDisabledTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime disabled attached dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const railTabs = rail.findAll('[role="tab"]');
    const attachedTabs = attached.findAll('[role="tab"]');
    await railTabs[1].trigger('click');
    await attachedTabs[1].trigger('click');

    expect(railTabs[1].attributes('aria-disabled')).toBeUndefined();
    expect(railTabs[1].classes()).not.toContain('is-disabled');
    expect(railTabs[2].attributes('aria-disabled')).toBe('true');
    expect(rail.emitted('update:modelValue')).toEqual([['plans']]);
    expect(attachedTabs[1].attributes('aria-disabled')).toBeUndefined();
    expect(attachedTabs[1].classes()).not.toContain('is-disabled');
    expect(attachedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(attached.emitted('update:modelValue')).toEqual([['plans']]);
  });

  it('falls back unknown runtime enum props before generating classes or behavior', async () => {
    const rail = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime-safe rail',
        orientation: 'diagonal',
        edge: 'corner',
        density: 'loose',
        activation: 'instant',
        expandOn: 'touch',
        gravity: 'middle',
        appearance: 'accordion',
        texture: 'linen',
        textureBlendMode: 'smudge',
        textColor: 'invisible',
      } as any,
    });

    expect(rail.classes()).toContain('dossier-tabs--horizontal');
    expect(rail.classes()).toContain('dossier-tabs--edge-top');
    expect(rail.classes()).toContain('dossier-tabs--density-spread');
    expect(rail.classes()).toContain('dossier-tabs--activation-automatic');
    expect(rail.classes()).toContain('dossier-tabs--expand-hover');
    expect(rail.classes()).toContain('dossier-tabs--gravity-center');
    expect(rail.classes()).toContain('dossier-tabs--appearance-rail');
    expect(rail.classes()).toContain('dossier-tabs--texture-none');
    expect(rail.classes()).toContain('dossier-tabs--texture-layer-sheet');
    expect(rail.classes()).toContain('dossier-tabs--texture-layer-content');
    expect(rail.classes()).toContain('dossier-tabs--texture-layer-tab');
    expect(rail.classes()).toContain('dossier-tabs--texture-blend-auto');
    expect(rail.classes()).toContain('dossier-tabs--text-color-auto');
    expect(rail.classes().some((className) => className.includes('diagonal') || className.includes('corner'))).toBe(false);
    expect(rail.attributes('aria-orientation')).toBe('horizontal');

    await rail.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(rail.emitted('update:modelValue')).toEqual([['plans']]);

    const attached = mount(DossierStack, {
      props: {
        tabs: tabs.map((tab, index) => (index === 0 ? { ...tab, edge: 'corner' as any, tone: 'neon' as any } : tab)),
        modelValue: 'photos',
        ariaLabel: 'Runtime-safe attachment',
        orientation: 'diagonal',
        edge: 'corner',
        density: 'loose',
        activation: 'instant',
        expandOn: 'touch',
        gravity: 'middle',
        appearance: 'accordion',
        depth: 'sunken',
        tone: 'neon',
        texture: 'linen',
        textureBlendMode: 'smudge',
        textColor: 'invisible',
        tabRotation: 'sideways',
        layers: Number.NaN,
      } as any,
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(attached.classes()).toContain('dossier-stack--horizontal');
    expect(attached.classes()).toContain('dossier-stack--edge-top');
    expect(attached.classes()).toContain('dossier-stack--density-spread');
    expect(attached.classes()).toContain('dossier-stack--activation-automatic');
    expect(attached.classes()).toContain('dossier-stack--expand-hover');
    expect(attached.classes()).toContain('dossier-stack--gravity-center');
    expect(attached.classes()).toContain('dossier-stack--appearance-rail');
    expect(attached.classes()).toContain('dossier-stack--texture-none');
    expect(attached.classes()).toContain('dossier-stack--texture-layer-sheet');
    expect(attached.classes()).toContain('dossier-stack--texture-layer-content');
    expect(attached.classes()).toContain('dossier-stack--texture-layer-tab');
    expect(attached.classes()).toContain('dossier-stack--texture-blend-auto');
    expect(attached.classes()).toContain('dossier-stack--text-color-auto');
    expect(attached.classes()).toContain('dossier-stack--tab-rotation-straight');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--depth-raised');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--layers-2');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--tone-slate');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--texture-none');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-sheet');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-content');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-tab');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--texture-blend-auto');
    expect(attached.find('.dossier-tray').classes()).toContain('dossier-tray--text-color-auto');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--tone-slate');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-none');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-layer-sheet');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-layer-content');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-layer-tab');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-blend-auto');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier--text-color-auto');
    expect(attached.find('.dossier-stack__file.is-active').classes()).toContain('dossier-stack__file--edge-top');

    const tray = mount({
      render: () => h(DossierTray, {
        orientation: 'diagonal',
        edge: 'corner',
        depth: 'sunken',
        layers: Number.NaN,
        activeIndex: Number.POSITIVE_INFINITY,
        tone: 'neon',
        texture: 'linen',
        textureBlendMode: 'smudge',
        textColor: 'invisible',
        pulled: 'false',
      } as any, {
        default: () => h(DossierFile, {
          tone: 'neon' as any,
          texture: 'linen' as any,
          textureBlendMode: 'smudge' as any,
          textColor: 'invisible' as any,
        }, () => 'Dossier content'),
      }),
    });

    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--edge-top');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--depth-raised');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--layers-2');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--tone-slate');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-none');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-sheet');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-content');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-tab');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-blend-auto');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--text-color-auto');
    expect(tray.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(tray.find('.dossier-tray').attributes('style')).toContain('--dossier-tray-active-index: 0');
    expect(tray.find('.dossier').classes()).toContain('dossier--tone-slate');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-none');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-layer-sheet');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-layer-content');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-layer-tab');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-blend-auto');
    expect(tray.find('.dossier').classes()).toContain('dossier--text-color-auto');

    const panelStack = mount(DossierFileStack, {
      props: {
        orientation: 'diagonal',
        edge: 'corner',
        depth: 'sunken',
        layers: Number.NaN,
        activeIndex: Number.POSITIVE_INFINITY,
        tone: 'neon',
        texture: 'linen',
        textureBlendMode: 'smudge',
        textColor: 'invisible',
        pulled: 'false',
      } as any,
      slots: {
        default: 'Panel content',
      },
    });

    expect(panelStack.classes()).toContain('dossier-file-stack--edge-top');
    expect(panelStack.classes()).toContain('dossier-file-stack--depth-raised');
    expect(panelStack.classes()).toContain('dossier-file-stack--layers-2');
    expect(panelStack.classes()).toContain('dossier-file-stack--tone-slate');
    expect(panelStack.classes()).toContain('dossier-file-stack--texture-none');
    expect(panelStack.classes()).toContain('dossier-file-stack--texture-layer-sheet');
    expect(panelStack.classes()).toContain('dossier-file-stack--texture-layer-content');
    expect(panelStack.classes()).toContain('dossier-file-stack--texture-layer-tab');
    expect(panelStack.classes()).toContain('dossier-file-stack--texture-blend-auto');
    expect(panelStack.classes()).toContain('dossier-file-stack--text-color-auto');
    expect(panelStack.classes()).not.toContain('is-pulled');
    expect(panelStack.attributes('style')).toContain('--dossier-index-panel-active-index: 0');
  });

  it('emits v-model updates when automatic keyboard activation is enabled', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    await wrapper.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['plans']);
    expect(wrapper.emitted('activate')).toHaveLength(1);
    expect(wrapper.emitted('activate')?.[0]?.[0]).toBe('plans');
  });

  it('only consumes arrow keys that match the rendered standalone tablist orientation', async () => {
    const horizontal = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Horizontal media dossiers',
        orientation: 'horizontal',
      },
    });

    await horizontal.find('[role="tab"]').trigger('keydown', { key: 'ArrowDown' });
    expect(horizontal.emitted('update:modelValue')).toBeUndefined();

    await horizontal.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(horizontal.emitted('update:modelValue')).toEqual([['plans']]);

    const vertical = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Vertical media dossiers',
        orientation: 'vertical',
      },
    });

    await vertical.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(vertical.emitted('update:modelValue')).toBeUndefined();

    await vertical.find('[role="tab"]').trigger('keydown', { key: 'ArrowDown' });
    expect(vertical.emitted('update:modelValue')).toEqual([['plans']]);
  });

  it('keeps standalone boundary keys from re-activating the current tab', async () => {
    const firstTabWrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Boundary media dossiers',
      },
    });

    const firstTab = firstTabWrapper.findAll('[role="tab"]')[0];
    await firstTab.trigger('keydown', { key: 'ArrowLeft' });
    await firstTab.trigger('keydown', { key: 'Home' });

    expect(firstTabWrapper.emitted('update:modelValue')).toBeUndefined();
    expect(firstTabWrapper.emitted('activate')).toBeUndefined();
    expect(firstTab.classes()).not.toContain('is-grabbing');
    expect(firstTabWrapper.findAll('[role="tab"]')[1].attributes('tabindex')).toBe('-1');

    const lastTabWrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'docs',
        ariaLabel: 'Boundary media dossiers',
      },
    });

    const lastTab = lastTabWrapper.findAll('[role="tab"]')[3];
    await lastTab.trigger('keydown', { key: 'ArrowRight' });
    await lastTab.trigger('keydown', { key: 'End' });

    expect(lastTabWrapper.emitted('update:modelValue')).toBeUndefined();
    expect(lastTabWrapper.emitted('activate')).toBeUndefined();
    expect(lastTab.classes()).not.toContain('is-grabbing');
    expect(lastTabWrapper.findAll('[role="tab"]')[0].attributes('tabindex')).toBe('-1');
  });

  it('keeps standalone same-value activation idempotent while fallback selections can commit', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Same tab media dossiers',
      },
    });

    const firstTab = wrapper.findAll('[role="tab"]')[0];
    await firstTab.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
    expect(firstTab.classes()).not.toContain('is-grabbing');
    expect(wrapper.findAll('[role="tab"]')[1].classes()).not.toContain('is-receding');

    const manual = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Same tab manual media dossiers',
        activation: 'manual',
      },
    });

    await manual.findAll('[role="tab"]')[0].trigger('keydown', { key: 'Enter' });
    await manual.findAll('[role="tab"]')[0].trigger('keydown', { key: ' ' });

    expect(manual.emitted('update:modelValue')).toBeUndefined();
    expect(manual.emitted('activate')).toBeUndefined();
    expect(manual.findAll('[role="tab"]')[0].classes()).not.toContain('is-grabbing');

    const fallback = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'missing',
        ariaLabel: 'Fallback media dossiers',
      },
    });

    await fallback.findAll('[role="tab"]')[0].trigger('click');

    expect(fallback.emitted('update:modelValue')).toEqual([['photos']]);
    expect(fallback.emitted('activate')?.[0]?.[0]).toBe('photos');
    expect(fallback.findAll('[role="tab"]')[0].classes()).toContain('is-grabbing');
  });

  it('marks the selected tab as grabbed while the previous tab recedes', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[1].trigger('click');

    expect(renderedTabs[1].classes()).toContain('is-grabbing');
    expect(renderedTabs[0].classes()).toContain('is-receding');
  });

  it('keeps manual activation to focus movement only', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        activation: 'manual',
      },
      attachTo: document.body,
    });

    await wrapper.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Floor plans, 2');
    wrapper.unmount();
  });

  it('does not focus stale standalone tabs after unmounting before queued focus flushes', async () => {
    const focusSpy = vi.spyOn(HTMLButtonElement.prototype, 'focus')
      .mockImplementation(() => undefined);
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        activation: 'manual',
      },
    });

    try {
      dispatchKeyboardEvent(wrapper.find('[role="tab"]').element, 'ArrowRight');
      wrapper.unmount();
      await nextTick();

      expect(focusSpy).not.toHaveBeenCalled();
    } finally {
      focusSpy.mockRestore();
    }
  });

  it('only consumes arrow keys that match the rendered attached tablist orientation', async () => {
    const horizontal = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Horizontal attached dossiers',
        orientation: 'horizontal',
        edge: 'top',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await horizontal.find('[role="tab"]').trigger('keydown', { key: 'ArrowDown' });
    expect(horizontal.emitted('update:modelValue')).toBeUndefined();

    await horizontal.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(horizontal.emitted('update:modelValue')).toEqual([['plans']]);

    const vertical = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Vertical attached dossiers',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await vertical.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(vertical.emitted('update:modelValue')).toBeUndefined();

    await vertical.find('[role="tab"]').trigger('keydown', { key: 'ArrowDown' });
    expect(vertical.emitted('update:modelValue')).toEqual([['plans']]);
  });

  it('keeps attached boundary keys from re-pulling the current dossier', async () => {
    const firstDossierWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Boundary attached dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const firstTab = firstDossierWrapper.findAll('[role="tab"]')[0];
    await firstTab.trigger('keydown', { key: 'ArrowUp' });
    await firstTab.trigger('keydown', { key: 'Home' });

    expect(firstDossierWrapper.emitted('update:modelValue')).toBeUndefined();
    expect(firstDossierWrapper.emitted('activate')).toBeUndefined();
    expect(firstDossierWrapper.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');
    expect(firstTab.classes()).not.toContain('is-open');
    expect(firstDossierWrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(firstDossierWrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Object photos');

    const lastDossierWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'docs',
        ariaLabel: 'Boundary attached dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const lastTab = lastDossierWrapper.findAll('[role="tab"]')[3];
    await lastTab.trigger('keydown', { key: 'ArrowDown' });
    await lastTab.trigger('keydown', { key: 'End' });

    expect(lastDossierWrapper.emitted('update:modelValue')).toBeUndefined();
    expect(lastDossierWrapper.emitted('activate')).toBeUndefined();
    expect(lastDossierWrapper.findAll('.dossier-stack__file')[3].classes()).not.toContain('is-pulling');
    expect(lastTab.classes()).not.toContain('is-open');
    expect(lastDossierWrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(lastDossierWrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Documents');
  });

  it('keeps attached same-value activation idempotent while fallback selections can commit', async () => {
    const topRightTabs: DossierIndexItem[] = tabs.map((tab, index) => ({
      ...tab,
      edge: 'top',
      gravity: index < 2 ? 'start' : 'end',
    }));
    const wrapper = mount(DossierStack, {
      props: {
        tabs: topRightTabs,
        modelValue: 'docs',
        ariaLabel: 'Same attached dossier',
        orientation: 'horizontal',
        edge: 'top',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const activeDossierBefore = wrapper.findAll('.dossier-stack__file')[3];
    expect(activeDossierBefore.classes()).toContain('is-active');
    expect(activeDossierBefore.classes()).not.toContain('is-pulling');
    expect(activeDossierBefore.attributes('style')).toContain('--dossier-piece-y: 0.00px');

    await wrapper.findAll('[role="tab"]')[3].trigger('click');
    await nextTick();

    const activeDossierAfter = wrapper.findAll('.dossier-stack__file')[3];
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
    expect(activeDossierAfter.classes()).toContain('is-active');
    expect(activeDossierAfter.classes()).not.toContain('is-pulling');
    expect(activeDossierAfter.classes()).not.toContain('is-pulled');
    expect(activeDossierAfter.attributes('style')).toContain('--dossier-piece-y: 0.00px');

    const manual = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Same attached manual dossier',
        activation: 'manual',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await manual.findAll('[role="tab"]')[0].trigger('keydown', { key: 'Enter' });
    await manual.findAll('[role="tab"]')[0].trigger('keydown', { key: ' ' });

    expect(manual.emitted('update:modelValue')).toBeUndefined();
    expect(manual.emitted('activate')).toBeUndefined();
    expect(manual.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');

    const fallback = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'missing',
        ariaLabel: 'Fallback attached dossier',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await fallback.findAll('[role="tab"]')[0].trigger('click');

    expect(fallback.emitted('update:modelValue')).toEqual([['photos']]);
    expect(fallback.emitted('activate')?.[0]?.[0]).toBe('photos');
    expect(fallback.findAll('.dossier-stack__file')[0].classes()).toContain('is-pulling');
  });

  it('does not focus stale attached tabs after unmounting before queued focus flushes', async () => {
    const focusSpy = vi.spyOn(HTMLButtonElement.prototype, 'focus')
      .mockImplementation(() => undefined);
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        activation: 'manual',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    try {
      dispatchKeyboardEvent(wrapper.find('[role="tab"]').element, 'ArrowDown');
      wrapper.unmount();
      await nextTick();

      expect(focusSpy).not.toHaveBeenCalled();
    } finally {
      focusSpy.mockRestore();
    }
  });

  it('does not revive stale standalone focus or grab state when a tab key returns', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        activation: 'manual',
      },
    });

    await wrapper.findAll('[role="tab"]')[0].trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    expect(wrapper.findAll('[role="tab"]')[1].attributes('tabindex')).toBe('0');

    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    await nextTick();
    expect(wrapper.findAll('[role="tab"]')[1].classes()).toContain('is-grabbing');

    await wrapper.setProps({ tabs: tabs.filter((tab) => tab.key !== 'plans') });
    await nextTick();
    expect(wrapper.findAll('[role="tab"]')[0].attributes('tabindex')).toBe('0');

    await wrapper.setProps({ tabs });
    await nextTick();

    const restoredTabs = wrapper.findAll('[role="tab"]');
    expect(restoredTabs[0].attributes('tabindex')).toBe('0');
    expect(restoredTabs[1].attributes('tabindex')).toBe('-1');
    expect(restoredTabs[1].classes()).not.toContain('is-grabbing');
    expect(restoredTabs[0].classes()).not.toContain('is-receding');
  });

  it('clears standalone activation timers when a grabbed tab is removed', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    try {
      const wrapper = mount(DossierIndex, {
        props: {
          tabs,
          modelValue: 'photos',
          ariaLabel: 'Media dossiers',
          activationMotionDuration: 1000,
        },
      });

      await nextTick();
      vi.advanceTimersByTime(20);
      await nextTick();

      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();
      vi.advanceTimersByTime(20);
      await nextTick();

      expect(wrapper.findAll('[role="tab"]')[1].classes()).toContain('is-grabbing');

      clearTimeoutSpy.mockClear();
      await wrapper.setProps({ tabs: tabs.filter((tab) => tab.key !== 'plans') });
      await nextTick();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.advanceTimersByTime(20);
      await nextTick();

      expect(wrapper.findAll('[role="tab"]').some((tab) => (
        tab.classes().includes('is-grabbing') || tab.classes().includes('is-receding')
      ))).toBe(false);

      wrapper.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('activates the focused standalone tab with Enter or Space in manual mode', async () => {
    const enterWrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        activation: 'manual',
      },
      attachTo: document.body,
    });

    await enterWrapper.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    await enterWrapper.findAll('[role="tab"]')[1].trigger('keydown', { key: 'Enter' });

    expect(enterWrapper.emitted('update:modelValue')).toEqual([['plans']]);
    expect(enterWrapper.emitted('activate')?.[0]?.[0]).toBe('plans');
    enterWrapper.unmount();

    const spaceWrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        activation: 'manual',
      },
    });

    await spaceWrapper.findAll('[role="tab"]')[3].trigger('keydown', { key: ' ' });

    expect(spaceWrapper.emitted('update:modelValue')).toEqual([['docs']]);
    expect(spaceWrapper.emitted('activate')?.[0]?.[0]).toBe('docs');
  });

  it('falls back to one selected standalone tab when the controlled active key is disabled or missing', async () => {
    const wrapper = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'maps',
        ariaLabel: 'Media dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('tabindex')).toBe('0');
    expect(renderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(renderedTabs[2].attributes('aria-selected')).toBe('false');
    expect(renderedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(renderedTabs[2].attributes('tabindex')).toBe('-1');
    expect(renderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
    expect(renderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();

    await wrapper.setProps({ modelValue: 'missing' });

    const rerenderedTabs = wrapper.findAll('[role="tab"]');
    expect(rerenderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(rerenderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
    expect(rerenderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('does not string-coerce invalid standalone control keys into object-looking tabs', () => {
    const objectLikeTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Object photos' },
      { key: '[object Object]', label: 'Object-looking string key' },
    ];
    const wrapper = mount(DossierIndex, {
      props: {
        tabs: objectLikeTabs,
        modelValue: {} as any,
        pulledKey: {} as any,
        ariaLabel: 'Runtime key dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(renderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(renderedTabs[0].attributes('tabindex')).toBe('0');
    expect(renderedTabs[1].attributes('aria-selected')).toBe('false');
    expect(renderedTabs[1].attributes('tabindex')).toBe('-1');
    expect(renderedTabs[1].classes()).not.toContain('is-pulled');
    expect(renderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('leaves all-disabled standalone tabs unselected and untabbable', () => {
    const disabledTabs = tabs.map((tab) => ({ ...tab, disabled: true }));
    const wrapper = mount(DossierIndex, {
      props: {
        tabs: disabledTabs,
        modelValue: 'photos',
        ariaLabel: 'Disabled media dossiers',
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    expect(renderedTabs).toHaveLength(disabledTabs.length);
    expect(renderedTabs.every((tab) => tab.attributes('aria-disabled') === 'true')).toBe(true);
    expect(renderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(0);
    expect(renderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(0);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('renders configurable stacked content panels in the requested direction', () => {
    const wrapper = mount(DossierFileStack, {
      props: {
        orientation: 'horizontal',
        edge: 'right',
        depth: 'deep',
        layers: 5,
        activeIndex: 3,
        pulled: true,
      },
      slots: {
        default: 'Panel content',
      },
    });

    expect(wrapper.classes()).toContain('dossier-file-stack--edge-right');
    expect(wrapper.classes()).toContain('dossier-file-stack--vertical');
    expect(wrapper.classes()).not.toContain('dossier-file-stack--horizontal');
    expect(wrapper.classes()).toContain('dossier-file-stack--depth-deep');
    expect(wrapper.classes()).toContain('dossier-file-stack--layers-2');
    expect(wrapper.classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--vertical');
    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.attributes('style')).toContain('--dossier-index-panel-active-index: 3');
    expect(wrapper.text()).toBe('Panel content');
  });

  it('renders tintable dossiers inside a directional tray pull state', () => {
    const wrapper = mount({
      render: () => h(DossierTray, {
        orientation: 'vertical',
        edge: 'left',
        depth: 'deep',
        layers: 2,
        pulled: true,
        tone: 'teal',
      }, {
        default: () => h(DossierFile, { tone: 'teal' }, () => 'Dossier content'),
      }),
    });

    const tray = wrapper.find('.dossier-tray');
    expect(tray.classes()).toContain('dossier-tray--edge-left');
    expect(tray.classes()).toContain('dossier-tray--vertical');
    expect(tray.classes()).toContain('dossier-tray--tone-teal');
    expect(tray.classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier').classes()).toContain('dossier--tone-teal');
    expect(wrapper.text()).toBe('Dossier content');
  });

  it('applies paper texture classes across rails, trays, dossiers, and compatibility stacks', () => {
    expect(dossierTabsCss).toContain([
      '.dossier-tray--texture-paper,',
      '.dossier-file-stack--texture-paper,',
      '.dossier--texture-paper {',
      '  --dossier-border: color-mix(in srgb, var(--dossier-tint) 44%, #8a8374);',
      '  --dossier-layer-border: color-mix(in srgb, var(--dossier-tint) 44%, rgba(226, 219, 201, 0.28));',
      '  --dossier-paper-sheet-opacity: var(--dossier-paper-sheet-opacity-custom, 0.5);',
      '  --dossier-paper-content-opacity: var(--dossier-paper-content-opacity-custom, 0.3);',
      '  --dossier-paper-tab-opacity: var(--dossier-paper-tab-opacity-custom, 0.42);',
      '}',
    ].join('\n'));
    expect(dossierTabsCss).toContain('.dossier-tabs--texture-paper.dossier-tabs--texture-layer-tab .dossier-tabs__tab {');
    expect(dossierTabsCss).toContain('.dossier-tray--texture-paper.dossier-tray--texture-layer-sheet::before,');
    expect(dossierTabsCss).toContain('.dossier-stack--texture-paper.dossier-stack--texture-layer-sheet .dossier-stack__sheet::after {');
    expect(dossierTabsCss).toContain('.dossier-stack--texture-paper.dossier-stack--texture-layer-content .dossier-stack__content::before {');
    expect(dossierTabsCss).toContain('.dossier-stack--texture-paper.dossier-stack--texture-layer-tab .dossier-stack__tab::before {');

    const rail = mount(DossierIndex, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Paper rail',
        texture: 'paper',
        textureLayers: 'tab',
        textureBlendMode: 'multiply',
        textColor: 'dark',
      },
    });

    expect(rail.classes()).toContain('dossier-tabs--texture-paper');
    expect(rail.classes()).toContain('dossier-tabs--texture-layer-tab');
    expect(rail.classes()).not.toContain('dossier-tabs--texture-layer-sheet');
    expect(rail.classes()).not.toContain('dossier-tabs--texture-layer-content');
    expect(rail.classes()).toContain('dossier-tabs--texture-blend-multiply');
    expect(rail.classes()).toContain('dossier-tabs--text-color-dark');

    const attachment = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Paper attachment',
        texture: 'paper',
        textureLayers: 'shell',
        textureBlendMode: 'multiply',
        textColor: 'dark',
      },
      slots: {
        default: 'Paper attachment content',
      },
    });

    expect(attachment.classes()).toContain('dossier-stack--texture-paper');
    expect(attachment.classes()).toContain('dossier-stack--texture-layer-sheet');
    expect(attachment.classes()).toContain('dossier-stack--texture-layer-tab');
    expect(attachment.classes()).not.toContain('dossier-stack--texture-layer-content');
    expect(attachment.classes()).toContain('dossier-stack--texture-blend-multiply');
    expect(attachment.classes()).toContain('dossier-stack--text-color-dark');
    expect(attachment.find('.dossier-tray').classes()).toContain('dossier-tray--texture-paper');
    expect(attachment.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-sheet');
    expect(attachment.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-tab');
    expect(attachment.find('.dossier-tray').classes()).not.toContain('dossier-tray--texture-layer-content');
    expect(attachment.find('.dossier-tray').classes()).toContain('dossier-tray--texture-blend-multiply');
    expect(attachment.find('.dossier-tray').classes()).toContain('dossier-tray--text-color-dark');
    expect(attachment.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-paper');
    expect(attachment.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-layer-sheet');
    expect(attachment.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-layer-tab');
    expect(attachment.find('.dossier-stack__file.is-active').classes()).not.toContain('dossier--texture-layer-content');
    expect(attachment.find('.dossier-stack__file.is-active').classes()).toContain('dossier--texture-blend-multiply');
    expect(attachment.find('.dossier-stack__file.is-active').classes()).toContain('dossier--text-color-dark');

    const tray = mount({
      render: () => h(DossierTray, {
        texture: 'paper',
        textureLayers: ['sheet'],
        textureBlendMode: 'multiply',
        textColor: 'dark',
      }, {
        default: () => h(DossierFile, {
          texture: 'paper',
          textureLayers: ['sheet'],
          textureBlendMode: 'multiply',
          textColor: 'dark',
        }, () => 'Dossier content'),
      }),
    });

    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-paper');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-layer-sheet');
    expect(tray.find('.dossier-tray').classes()).not.toContain('dossier-tray--texture-layer-content');
    expect(tray.find('.dossier-tray').classes()).not.toContain('dossier-tray--texture-layer-tab');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--texture-blend-multiply');
    expect(tray.find('.dossier-tray').classes()).toContain('dossier-tray--text-color-dark');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-paper');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-layer-sheet');
    expect(tray.find('.dossier').classes()).not.toContain('dossier--texture-layer-content');
    expect(tray.find('.dossier').classes()).not.toContain('dossier--texture-layer-tab');
    expect(tray.find('.dossier').classes()).toContain('dossier--texture-blend-multiply');
    expect(tray.find('.dossier').classes()).toContain('dossier--text-color-dark');

    const panelStack = mount(DossierFileStack, {
      props: {
        texture: 'paper',
        textureLayers: 'none',
        textureBlendMode: 'multiply',
        textColor: 'dark',
      },
      slots: {
        default: 'Panel stack content',
      },
    });

    expect(panelStack.classes()).toContain('dossier-file-stack--texture-paper');
    expect(panelStack.classes()).not.toContain('dossier-file-stack--texture-layer-sheet');
    expect(panelStack.classes()).not.toContain('dossier-file-stack--texture-layer-content');
    expect(panelStack.classes()).not.toContain('dossier-file-stack--texture-layer-tab');
    expect(panelStack.classes()).toContain('dossier-file-stack--texture-blend-multiply');
    expect(panelStack.classes()).toContain('dossier-file-stack--text-color-dark');
    expect(panelStack.find('.dossier-tray').classes()).toContain('dossier-tray--texture-paper');
    expect(panelStack.find('.dossier-tray').classes()).not.toContain('dossier-tray--texture-layer-sheet');
    expect(panelStack.find('.dossier-tray').classes()).not.toContain('dossier-tray--texture-layer-content');
    expect(panelStack.find('.dossier-tray').classes()).not.toContain('dossier-tray--texture-layer-tab');
    expect(panelStack.find('.dossier-tray').classes()).toContain('dossier-tray--texture-blend-multiply');
    expect(panelStack.find('.dossier-tray').classes()).toContain('dossier-tray--text-color-dark');
    expect(panelStack.find('.dossier').classes()).toContain('dossier--texture-paper');
    expect(panelStack.find('.dossier').classes()).not.toContain('dossier--texture-layer-sheet');
    expect(panelStack.find('.dossier').classes()).not.toContain('dossier--texture-layer-content');
    expect(panelStack.find('.dossier').classes()).not.toContain('dossier--texture-layer-tab');
    expect(panelStack.find('.dossier').classes()).toContain('dossier--texture-blend-multiply');
    expect(panelStack.find('.dossier').classes()).toContain('dossier--text-color-dark');
  });

  it('derives standalone tray physical orientation from edge rather than the default-edge hint', () => {
    const wrapper = mount({
      render: () => h(DossierTray, {
        orientation: 'horizontal',
        edge: 'right',
      }, {
        default: () => h(DossierFile, null, () => 'Right dossier content'),
      }),
    });

    const tray = wrapper.find('.dossier-tray');
    expect(tray.classes()).toContain('dossier-tray--edge-right');
    expect(tray.classes()).toContain('dossier-tray--vertical');
    expect(tray.classes()).not.toContain('dossier-tray--horizontal');
  });

  it('keeps the tab grab and dossier pull attached through one activation', async () => {
    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs,
          modelValue: active.value,
          ariaLabel: 'Media dossiers',
          orientation: 'vertical',
          edge: 'left',
          appearance: 'stack',
          tone: 'teal',
          pullDuration: 480,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    const wrapper = mount(Harness);
    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[1].trigger('click');
    await nextTick();
    await waitForMotionFrame();

    const attachment = wrapper.findComponent(DossierStack);

    expect(attachment.emitted('update:modelValue')?.[0]).toEqual(['plans']);
    expect(attachment.emitted('activate')).toHaveLength(1);
    expect(attachment.emitted('activate')?.[0]?.[0]).toBe('plans');
    expect(wrapper.find('.dossier .dossier-stack__tab').exists()).toBe(true);
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__tab').exists()).toBe(true);
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text()).toBe('Floor plans');
    expect(renderedTabs[1].classes()).toContain('is-pulling');
    expect(renderedTabs[1].classes()).toContain('is-pulled');
    expect(renderedTabs[1].classes()).not.toContain('is-handoff');
    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--edge-left');
    expect(wrapper.find('.dossier').classes()).toContain('dossier--tone-teal');
  });

  it('starts tucked until a dossier is explicitly pulled', () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
        tone: 'teal',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(wrapper.find('[role="tab"]').classes()).not.toContain('is-open');
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text()).toBe('Object photos');
  });

  it('generates attached tab and panel ids with a two-way ARIA relationship', () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const activeTab = wrapper.find('[role="tab"][aria-selected="true"]');
    const panels = wrapper.findAll('[role="tabpanel"]');
    const activePanel = panels.find((panel) => panel.attributes('hidden') === undefined);

    expect(activeTab.attributes('id')).toMatch(/^dossier-stack-v-[a-z0-9-]+-photos-[a-z0-9]+-tab$/);
    expect(panels).toHaveLength(tabs.length);
    expect(activePanel?.attributes('id')).toMatch(/^dossier-stack-v-[a-z0-9-]+-photos-[a-z0-9]+-panel$/);
    expect(activeTab.attributes('aria-controls')).toBe(activePanel?.attributes('id'));
    expect(activePanel?.attributes('aria-labelledby')).toBe(activeTab.attributes('id'));

    for (const tab of renderedTabs) {
      const controlledPanel = panels.find((panel) => panel.attributes('id') === tab.attributes('aria-controls'));
      expect(controlledPanel?.attributes('aria-labelledby')).toBe(tab.attributes('id'));
    }

    const hiddenPanels = panels.filter((panel) => panel.attributes('hidden') !== undefined);
    expect(hiddenPanels).toHaveLength(tabs.length - 1);
    expect(hiddenPanels.every((panel) => panel.text() === '')).toBe(true);
  });

  it('deduplicates attached dossiers so tab and panel ids stay unique', () => {
    const duplicateTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Original photos' },
      { key: 'photos', label: 'Duplicate photos' },
      { key: 12, label: 'Numeric report' },
      { key: '12', label: 'String duplicate report' },
    ];

    const wrapper = mount(DossierStack, {
      props: {
        tabs: duplicateTabs,
        modelValue: 'photos',
        ariaLabel: 'Duplicate-safe dossiers',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');
    const tabIds = renderedTabs.map((tab) => tab.attributes('id'));
    const panelIds = panels.map((panel) => panel.attributes('id'));

    expect(renderedTabs).toHaveLength(2);
    expect(panels).toHaveLength(2);
    expect(renderedTabs.map((tab) => tab.attributes('aria-label'))).toEqual(['Original photos', 'Numeric report']);
    expect(new Set(tabIds).size).toBe(tabIds.length);
    expect(new Set(panelIds).size).toBe(panelIds.length);
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text())
      .toBe('Original photos');
  });

  it('preserves explicit attached panel ids over generated defaults', () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        panelIdForTab: (tab: DossierIndexItem) => ` external-panel-${tab.key} `,
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const activeTab = wrapper.find('[role="tab"][aria-selected="true"]');
    const panels = wrapper.findAll('[role="tabpanel"]');
    const panel = panels.find((candidate) => candidate.attributes('hidden') === undefined);

    expect(activeTab.attributes('aria-controls')).toBe('external-panel-photos');
    expect(panels).toHaveLength(tabs.length);
    expect(panel?.attributes('id')).toBe('external-panel-photos');
    expect(panel?.attributes('aria-labelledby')).toBe(activeTab.attributes('id'));
  });

  it('keeps callback-provided attached panel ids stable across tab and panel bindings', () => {
    let panelIdCounter = 0;
    const panelIdForTab = vi.fn((tab: DossierIndexItem) => `external-panel-${tab.key}-${++panelIdCounter}`);
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Volatile panel dossiers',
        panelIdForTab,
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');

    expect(panelIdForTab).toHaveBeenCalledTimes(tabs.length);

    for (const tab of renderedTabs) {
      const controlledPanel = panels.find((panel) => panel.attributes('id') === tab.attributes('aria-controls'));

      expect(controlledPanel).toBeTruthy();
      expect(controlledPanel?.attributes('aria-labelledby')).toBe(tab.attributes('id'));
    }
  });

  it('keeps attached tab and panel ids unique when external panel ids collide', () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Duplicate attached panel dossiers',
        panelIdForTab: () => 'shared-panel',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');
    const tabControls = renderedTabs.map((tab) => tab.attributes('aria-controls'));
    const panelIds = panels.map((panel) => panel.attributes('id'));

    expect(tabControls[0]).toBe('shared-panel');
    expect(tabControls[1]).toMatch(/^dossier-stack-v-[a-z0-9-]+-plans-[a-z0-9]+-panel$/);
    expect(tabControls[2]).toMatch(/^dossier-stack-v-[a-z0-9-]+-maps-[a-z0-9]+-panel$/);
    expect(tabControls[3]).toMatch(/^dossier-stack-v-[a-z0-9-]+-docs-[a-z0-9]+-panel$/);
    expect(new Set(tabControls).size).toBe(tabControls.length);
    expect(new Set(panelIds).size).toBe(panelIds.length);

    for (const tab of renderedTabs) {
      const controlledPanel = panels.find((panel) => panel.attributes('id') === tab.attributes('aria-controls'));

      expect(controlledPanel).toBeTruthy();
      expect(controlledPanel?.attributes('aria-labelledby')).toBe(tab.attributes('id'));
    }
  });

  it('falls back through tab panel ids and generated ids when attached callback panel ids collide', () => {
    const panelFallbackTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Photos', panelId: 'tab-panel-photos' },
      { key: 'plans', label: 'Plans', panelId: 'tab-panel-plans' },
      { key: 'docs', label: 'Docs', panelId: 'shared-panel' },
    ];
    const wrapper = mount(DossierStack, {
      props: {
        tabs: panelFallbackTabs,
        modelValue: 'photos',
        ariaLabel: 'Fallback attached panel dossiers',
        panelIdForTab: () => 'shared-panel',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');
    const tabControls = renderedTabs.map((tab) => tab.attributes('aria-controls'));
    const panelIds = panels.map((panel) => panel.attributes('id'));

    expect(tabControls[0]).toBe('shared-panel');
    expect(tabControls[1]).toBe('tab-panel-plans');
    expect(tabControls[2]).toMatch(/^dossier-stack-v-[a-z0-9-]+-docs-[a-z0-9]+-panel$/);
    expect(new Set(tabControls).size).toBe(tabControls.length);
    expect(new Set(panelIds).size).toBe(panelIds.length);

    for (const tab of renderedTabs) {
      const controlledPanel = panels.find((panel) => panel.attributes('id') === tab.attributes('aria-controls'));

      expect(controlledPanel).toBeTruthy();
      expect(controlledPanel?.attributes('aria-labelledby')).toBe(tab.attributes('id'));
    }
  });

  it('falls back to generated attached panel ids for invalid runtime panel ids', () => {
    const runtimePanelTabs = [
      { key: 'photos', label: 'Photos', panelId: {} },
      { key: 'plans', label: 'Plans', panelId: 'external panel plans' },
      { key: 'docs', label: 'Docs', panelId: 'external-panel-docs' },
    ] as any;

    const wrapper = mount(DossierStack, {
      props: {
        tabs: runtimePanelTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime panel dossiers',
        panelIdForTab: (tab: DossierIndexItem) => (tab.key === 'photos' ? { id: 'bad' } : ''),
      } as any,
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');

    expect(renderedTabs[0].attributes('aria-controls'))
      .toMatch(/^dossier-stack-v-[a-z0-9-]+-photos-[a-z0-9]+-panel$/);
    expect(panels[0].attributes('id')).toBe(renderedTabs[0].attributes('aria-controls'));
    expect(renderedTabs[1].attributes('aria-controls'))
      .toMatch(/^dossier-stack-v-[a-z0-9-]+-plans-[a-z0-9]+-panel$/);
    expect(panels[1].attributes('id')).toBe(renderedTabs[1].attributes('aria-controls'));
    expect(renderedTabs[2].attributes('aria-controls')).toBe('external-panel-docs');
    expect(panels[2].attributes('id')).toBe('external-panel-docs');
    expect(panels.map((panel) => panel.attributes('id') ?? '')).not.toContain('[object Object]');
    expect(panels.map((panel) => panel.attributes('id') ?? '')).not.toContain('external panel plans');
  });

  it('ignores invalid attached panel id callback props at runtime', () => {
    const runtimePanelTabs = [
      { key: 'photos', label: 'Photos', panelId: 'external-panel-photos' },
      { key: 'plans', label: 'Plans' },
    ] as any;

    const wrapper = mount(DossierStack, {
      props: {
        tabs: runtimePanelTabs,
        modelValue: 'photos',
        ariaLabel: 'Runtime attached panel callback dossiers',
        panelIdForTab: { id: 'bad-callback' },
      } as any,
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');

    expect(renderedTabs[0].attributes('aria-controls')).toBe('external-panel-photos');
    expect(panels[0].attributes('id')).toBe('external-panel-photos');
    expect(renderedTabs[1].attributes('aria-controls'))
      .toMatch(/^dossier-stack-v-[a-z0-9-]+-plans-[a-z0-9]+-panel$/);
    expect(panels[1].attributes('id')).toBe(renderedTabs[1].attributes('aria-controls'));
    expect(panels.map((panel) => panel.attributes('id') ?? '')).not.toContain('bad-callback');
  });

  it('does not let a disabled attached tab steal the roving tab stop', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[2].trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(renderedTabs[0].attributes('tabindex')).toBe('0');
    expect(renderedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(renderedTabs[2].attributes('tabindex')).toBe('-1');
    expect(renderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
  });

  it('keeps disabled attached tabs inert for keyboard events fired directly on them', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[2].trigger('keydown', { key: 'ArrowDown' });
    await renderedTabs[2].trigger('keydown', { key: 'Enter' });

    expect(renderedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
    expect(renderedTabs[0].attributes('tabindex')).toBe('0');
    expect(renderedTabs[2].attributes('tabindex')).toBe('-1');
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text())
      .toBe('Object photos');
  });

  it('falls back attached selection and content when the controlled key is disabled or missing', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'maps',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const dossiers = wrapper.findAll('.dossier-stack__file');
    const visiblePanels = wrapper.findAll('[role="tabpanel"]').filter((panel) => panel.attributes('hidden') === undefined);

    expect(renderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(renderedTabs[2].attributes('aria-selected')).toBe('false');
    expect(renderedTabs[2].attributes('aria-disabled')).toBe('true');
    expect(renderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
    expect(renderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(1);
    expect(dossiers[0].classes()).toContain('is-active');
    expect(dossiers[2].classes()).not.toContain('is-active');
    expect(visiblePanels).toHaveLength(1);
    expect(visiblePanels[0].text()).toBe('Object photos');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();

    await wrapper.setProps({ modelValue: 'missing' });

    const rerenderedTabs = wrapper.findAll('[role="tab"]');
    const rerenderedPanels = wrapper.findAll('[role="tabpanel"]').filter((panel) => panel.attributes('hidden') === undefined);
    expect(rerenderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(rerenderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
    expect(rerenderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(1);
    expect(rerenderedPanels).toHaveLength(1);
    expect(rerenderedPanels[0].text()).toBe('Object photos');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('does not string-coerce invalid attached control or hover keys into object-looking dossiers', () => {
    const objectLikeTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Object photos' },
      { key: '[object Object]', label: 'Object-looking string key' },
    ];
    const wrapper = mount(DossierStack, {
      props: {
        tabs: objectLikeTabs,
        modelValue: {} as any,
        emulatedHoverKey: {} as any,
        ariaLabel: 'Runtime attached key dossiers',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const dossiers = wrapper.findAll('.dossier-stack__file');
    const visiblePanels = wrapper.findAll('[role="tabpanel"]').filter((panel) => panel.attributes('hidden') === undefined);

    expect(wrapper.classes()).not.toContain('dossier-stack--hover-emulated');
    expect(renderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(renderedTabs[0].attributes('tabindex')).toBe('0');
    expect(renderedTabs[1].attributes('aria-selected')).toBe('false');
    expect(renderedTabs[1].attributes('tabindex')).toBe('-1');
    expect(renderedTabs[1].classes()).not.toContain('is-hovered');
    expect(dossiers[0].classes()).toContain('is-active');
    expect(dossiers[1].classes()).not.toContain('is-active');
    expect(dossiers[1].classes()).not.toContain('is-hovered');
    expect(visiblePanels).toHaveLength(1);
    expect(visiblePanels[0].text()).toBe('Object photos');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('leaves all-disabled attached dossiers without an active panel or ghost slot content', () => {
    const disabledTabs = tabs.map((tab) => ({ ...tab, disabled: true }));
    const wrapper = mount(DossierStack, {
      props: {
        tabs: disabledTabs,
        modelValue: 'photos',
        ariaLabel: 'Disabled media dossiers',
        orientation: 'vertical',
        edge: 'left',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', { class: 'slot-content' }, activeTab?.label ?? 'No active dossier'),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const visiblePanels = wrapper.findAll('[role="tabpanel"]').filter((panel) => panel.attributes('hidden') === undefined);
    expect(renderedTabs).toHaveLength(disabledTabs.length);
    expect(renderedTabs.every((tab) => tab.attributes('aria-disabled') === 'true')).toBe(true);
    expect(renderedTabs.filter((tab) => tab.attributes('aria-selected') === 'true')).toHaveLength(0);
    expect(renderedTabs.filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(0);
    expect(wrapper.findAll('.dossier-stack__file.is-active')).toHaveLength(0);
    expect(visiblePanels).toHaveLength(0);
    expect(wrapper.find('.slot-content').exists()).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('treats the first enabled attached dossier after all-disabled data as initial tucked state', async () => {
    const disabledTabs = tabs.map((tab) => ({ ...tab, disabled: true }));
    const wrapper = mount(DossierStack, {
      props: {
        tabs: disabledTabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(wrapper.findAll('[role="tab"]').filter((tab) => tab.attributes('aria-selected') === 'true'))
      .toHaveLength(0);
    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');

    await wrapper.setProps({ tabs });
    await nextTick();

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const activeDossier = wrapper.find('.dossier-stack__file.is-active');
    expect(renderedTabs[0].attributes('aria-selected')).toBe('true');
    expect(activeDossier.exists()).toBe(true);
    expect(activeDossier.classes()).not.toContain('is-pulling');
    expect(activeDossier.classes()).not.toContain('is-pulled');
    expect(renderedTabs[0].classes()).not.toContain('is-open');
    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text())
      .toBe('Object photos');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('returns to tucked initial behavior when enabled attached dossiers reappear after all-disabled data', async () => {
    const disabledTabs = tabs.map((tab) => ({ ...tab, disabled: true }));
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(wrapper.find('.dossier-stack__file.is-active').classes()).not.toContain('is-pulling');
    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');

    await wrapper.setProps({ tabs: disabledTabs });
    await nextTick();

    expect(wrapper.findAll('.dossier-stack__file.is-active')).toHaveLength(0);
    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');

    await wrapper.setProps({ tabs });
    await nextTick();

    const restoredActiveDossier = wrapper.find('.dossier-stack__file.is-active');
    const restoredActiveTab = wrapper.find('[role="tab"][aria-selected="true"]');
    expect(restoredActiveDossier.exists()).toBe(true);
    expect(restoredActiveDossier.classes()).not.toContain('is-pulling');
    expect(restoredActiveDossier.classes()).not.toContain('is-pulled');
    expect(restoredActiveTab.classes()).not.toContain('is-open');
    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Object photos');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('activate')).toBeUndefined();
  });

  it('expands active attached tabs without entering the pull state', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'horizontal',
        edge: 'bottom',
        expandOn: 'active',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const renderedTabs = wrapper.findAll('[role="tab"]');
    expect(renderedTabs[0].classes()).toContain('is-expanded');
    expect(renderedTabs[0].classes()).toContain('dossier-stack__tab--has-total');
    expect(renderedTabs[0].classes()).not.toContain('is-open');
    expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
    expect(wrapper.findAll('.dossier-stack__file')[1].attributes('style'))
      .toContain('--dossier-piece-slot: 156.00px');
  });

  it('keeps attached hover compact when expansion is active-only', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'docs',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
        expandOn: 'active',
        emulatedHoverKey: 'plans',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const dossiers = wrapper.findAll('.dossier-stack__file');

    expect(dossiers[1].classes()).toContain('is-hovered');
    expect(dossiers[1].classes()).not.toContain('is-expanded');
    expect(renderedTabs[1].classes()).toContain('is-hovered');
    expect(renderedTabs[1].classes()).not.toContain('is-expanded');
    expect(dossiers[2].attributes('style')).toContain('--dossier-piece-slot: 88.00px');
  });

  it('expands attached tabs on focus only when focus expansion is requested', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'docs',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
        expandOn: 'focus',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[1].trigger('focus');
    await nextTick();

    const dossiers = wrapper.findAll('.dossier-stack__file');

    expect(dossiers[1].classes()).not.toContain('is-hovered');
    expect(dossiers[1].classes()).toContain('is-expanded');
    expect(renderedTabs[1].classes()).toContain('is-expanded');
    expect(dossiers[2].attributes('style')).toContain('--dossier-piece-slot: 200.00px');

    await renderedTabs[1].trigger('blur');
    await nextTick();

    expect(wrapper.findAll('.dossier-stack__file')[1].classes()).not.toContain('is-expanded');
  });

  it('writes expanded side slots directly on tab handles so open tags displace neighbors', async () => {
    const sideTabs: DossierIndexItem[] = [
      ...tabs,
      { key: 'review', label: 'Counsel review', shortLabel: 'Review', icon: Icon, count: 2 },
    ];
    const wrapper = mount(DossierStack, {
      props: {
        tabs: sideTabs,
        modelValue: 'docs',
        ariaLabel: 'Right media dossiers',
        orientation: 'vertical',
        edge: 'right',
        appearance: 'stack',
        expandOn: 'active',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const dossiers = wrapper.findAll('.dossier-stack__file');
    const renderedTabs = wrapper.findAll('[role="tab"]');

    expect(dossiers[3].classes()).toContain('is-expanded');
    expect(renderedTabs[3].attributes('style')).toContain('--dossier-index-slot: 132.00px');
    expect(dossiers[4].attributes('style')).toContain('--dossier-piece-slot: 288.00px');
    expect(renderedTabs[4].attributes('style')).toContain('--dossier-index-slot: 288.00px');
  });

  it('folds returning dossiers slightly faster than new dossiers unfold by default', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        pullDuration: 600,
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    expect(wrapper.attributes('style')).toContain('--dossier-motion-duration: 600ms');
    expect(wrapper.attributes('style')).toContain('--dossier-motion-return-duration: 450ms');

    await wrapper.setProps({ returnDuration: 180 });

    expect(wrapper.attributes('style')).toContain('--dossier-motion-return-duration: 180ms');
  });

  it('keeps zero and non-finite attached durations from leaving transitional state stuck', async () => {
    vi.useFakeTimers();

    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs,
          modelValue: active.value,
          ariaLabel: 'Media dossiers',
          pullDuration: Number.NaN,
          returnDuration: 0,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    try {
      const wrapper = mount(Harness);
      const renderedTabs = wrapper.findAll('[role="tab"]');

      expect(wrapper.findComponent(DossierStack).attributes('style'))
        .toContain('--dossier-motion-duration: 0ms');
      expect(wrapper.findComponent(DossierStack).attributes('style'))
        .toContain('--dossier-motion-return-duration: 0ms');

      await renderedTabs[1].trigger('click');
      await nextTick();
      expect(renderedTabs[1].classes()).toContain('is-pulling');

      vi.runAllTimers();
      await nextTick();
      expect(wrapper.findAll('[role="tab"]')[1].classes()).toContain('is-pulled');
      expect(wrapper.findAll('[role="tab"]')[1].classes()).not.toContain('is-pulling');

      await wrapper.findAll('[role="tab"]')[3].trigger('click');
      await nextTick();
      expect(wrapper.findAll('.dossier-stack__file')[3].attributes('style'))
        .toContain('--dossier-piece-z: 300');

      vi.runAllTimers();
      await nextTick();

      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Documents');
      expect(wrapper.findAll('[role="tab"]')[3].classes()).toContain('is-pulled');
      expect(wrapper.findAll('[role="tab"]')[3].classes()).not.toContain('is-returning');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears attached motion timers when unmounted mid-transition', async () => {
    vi.useFakeTimers();

    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs,
          modelValue: active.value,
          ariaLabel: 'Media dossiers',
          pullDuration: 40,
          returnDuration: 60,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    try {
      const wrapper = mount(Harness);
      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();

      expect(vi.getTimerCount()).toBeGreaterThan(0);

      wrapper.unmount();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not schedule attached measurement frames after immediate unmount', async () => {
    const requestFrameSpy = vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 123);
    const cancelFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    try {
      const wrapper = mount(DossierStack, {
        props: {
          tabs,
          modelValue: 'photos',
          ariaLabel: 'Media dossiers',
        },
        slots: {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        },
      });

      expect(requestFrameSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
      expect(cancelFrameSpy).toHaveBeenCalledWith(123);

      await nextTick();

      expect(requestFrameSpy).toHaveBeenCalledTimes(1);
    } finally {
      requestFrameSpy.mockRestore();
      cancelFrameSpy.mockRestore();
    }
  });

  it('fronts externally controlled model value changes immediately', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'right',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await wrapper.setProps({ modelValue: 'plans' });
    await nextTick();

    const dossiers = wrapper.findAll('.dossier-stack__file');
    expect(dossiers[1].classes()).toContain('is-active');
    expect(dossiers[1].classes()).toContain('is-pulling');
    expect(dossiers[1].attributes('style')).toContain('--dossier-piece-z: 300');
    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Floor plans');
  });

  it('keeps externally controlled dossier handoffs in the pulled lane while the previous dossier returns', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
        returnDuration: 20,
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await wrapper.setProps({ modelValue: 'plans' });
    await nextTick();
    await waitForMotionFrame();

    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Floor plans');

    await wrapper.setProps({ modelValue: 'docs' });
    await nextTick();

    const dossiers = wrapper.findAll('.dossier-stack__file');
    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Documents');
    expect(dossiers[1].classes()).toContain('is-returning');
    expect(dossiers[1].attributes('style')).toContain('--dossier-piece-z: 240');
    expect(dossierPieceStyleNumber(wrapper, 1, '--dossier-piece-x'))
      .toBe(dossierPieceStyleNumber(wrapper, 1, '--dossier-piece-rest-x'));
    expect(dossierPieceStyleNumber(wrapper, 1, '--dossier-piece-y'))
      .toBe(dossierPieceStyleNumber(wrapper, 1, '--dossier-piece-rest-y'));
    expect(dossiers[3].classes()).toContain('is-active');
    expect(dossiers[3].classes()).toContain('is-selecting');
    expect(dossiers[3].classes()).toContain('is-handoff');
    expect(dossiers[3].classes()).not.toContain('is-pulling');
    expect(dossiers[3].attributes('style')).toContain('--dossier-piece-z: 300');
    expect(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-x'))
      .toBe(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-pull-x'));
    expect(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-y'))
      .toBe(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-pull-y'));
    expect(wrapper.findAll('[role="tab"]')[3].classes()).toContain('is-open');
    expect(wrapper.findAll('[role="tab"]')[3].classes()).toContain('is-handoff');

    await new Promise((resolve) => window.setTimeout(resolve, 25));
    await nextTick();
    await waitForMotionFrame();

    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(dossiers[3].classes()).toContain('is-pulling');
  });

  it('cancels stale controlled handoff timers when active dossiers disappear mid-return', async () => {
    vi.useFakeTimers();

    const disabledTabs = tabs.map((tab) => ({ ...tab, disabled: true }));
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
        pullDuration: 20,
        returnDuration: 60,
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    try {
      await wrapper.setProps({ modelValue: 'plans' });
      await nextTick();

      vi.advanceTimersByTime(20);
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-pulled');
      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');

      await wrapper.setProps({ modelValue: 'docs' });
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-returning');
      expect(wrapper.findAll('.dossier-stack__file')[3].classes()).toContain('is-handoff');

      await wrapper.setProps({ tabs: disabledTabs });
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file.is-active')).toHaveLength(0);
      expect(wrapper.findAll('.dossier-stack__file.is-returning')).toHaveLength(0);
      expect(wrapper.findAll('.dossier-stack__file.is-handoff')).toHaveLength(0);
      expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');

      await wrapper.setProps({ tabs, modelValue: 'docs' });
      await nextTick();

      const restoredDocsDossier = wrapper.findAll('.dossier-stack__file')[3];
      expect(restoredDocsDossier.classes()).toContain('is-active');
      expect(restoredDocsDossier.classes()).not.toContain('is-pulling');
      expect(restoredDocsDossier.classes()).not.toContain('is-pulled');
      expect(restoredDocsDossier.classes()).not.toContain('is-handoff');
      expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');

      vi.advanceTimersByTime(60);
      await nextTick();

      expect(restoredDocsDossier.classes()).toContain('is-active');
      expect(restoredDocsDossier.classes()).not.toContain('is-pulling');
      expect(restoredDocsDossier.classes()).not.toContain('is-pulled');
      expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');
      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Documents');
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a tab item tone for its attached dossier before the fallback tone', async () => {
    const tintedTabs: DossierIndexItem[] = tabs.map((tab) => (
      tab.key === 'plans' ? { ...tab, tone: 'copper' } : tab
    ));

    const wrapper = mount(DossierStack, {
      props: {
        tabs: tintedTabs,
        modelValue: 'plans',
        ariaLabel: 'Media dossiers',
        tone: 'teal',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    expect(wrapper.find('.dossier-stack__file.is-active').classes()).toContain('dossier--tone-copper');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--tone-teal');
  });

  it('uses custom tab item tint and accent colors for attached dossiers', async () => {
    const customTintTabs: DossierIndexItem[] = tabs.map((tab) => (
      tab.key === 'plans'
        ? { ...tab, accent: '#d7e9f7', tint: '#5f7896', tone: 'steel' }
        : tab
    ));

    const wrapper = mount(DossierStack, {
      props: {
        tabs: customTintTabs,
        modelValue: 'plans',
        ariaLabel: 'Media dossiers',
        tone: 'teal',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const activeDossier = wrapper.find('.dossier-stack__file.is-active');

    expect(activeDossier.classes()).toContain('dossier--tone-steel');
    expect(activeDossier.attributes('style')).toContain('--dossier-tint: #5f7896');
    expect(activeDossier.attributes('style')).toContain('--dossier-accent: #d7e9f7');
  });

  it('supports mixed per-dossier edges inside one attached tray', async () => {
    const mixedTabs: DossierIndexItem[] = [
      { ...tabs[0], edge: 'left' },
      { ...tabs[1], edge: 'right' },
      { ...tabs[2], edge: 'bottom' },
      { ...tabs[3], edge: 'right' },
    ];

    const wrapper = mount(DossierStack, {
      props: {
        tabs: mixedTabs,
        modelValue: 'plans',
        ariaLabel: 'Mixed media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const dossiers = wrapper.findAll('.dossier-stack__file');

    expect(wrapper.classes()).toContain('dossier-stack--mixed-edge');
    expect(wrapper.classes()).toContain('dossier-stack--has-edge-left');
    expect(wrapper.classes()).toContain('dossier-stack--has-edge-right');
    expect(wrapper.classes()).toContain('dossier-stack--has-edge-bottom');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--edge-right');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--vertical');
    expect(wrapper.find('.dossier-stack__stack').attributes('aria-orientation')).toBeUndefined();
    expect(dossiers[0].classes()).toContain('dossier-stack__file--edge-left');
    expect(dossiers[0].classes()).toContain('dossier-stack__file--vertical');
    expect(dossiers[1].classes()).toContain('dossier-stack__file--edge-right');
    expect(dossiers[1].classes()).toContain('dossier-stack__file--vertical');
    expect(dossiers[2].classes()).toContain('dossier-stack__file--edge-bottom');
    expect(dossiers[2].classes()).toContain('dossier-stack__file--horizontal');
    expect(dossiers[0].attributes('style')).toContain('--dossier-piece-slot: 0.00px');
    expect(dossiers[1].attributes('style')).toContain('--dossier-piece-slot: 0.00px');
    expect(dossiers[2].attributes('style')).toContain('--dossier-piece-slot: 0.00px');
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text()).toBe('Floor plans');
  });

  it('supports start and end tab groups on the same attached edge', async () => {
    const wraparoundTabs: DossierIndexItem[] = [
      { ...tabs[0], edge: 'top', gravity: 'start' },
      { ...tabs[1], edge: 'top', gravity: 'start' },
      { ...tabs[2], disabled: false, edge: 'top', gravity: 'end' },
      { ...tabs[3], edge: 'top', gravity: 'end' },
    ];

    const wrapper = mount(DossierStack, {
      props: {
        tabs: wraparoundTabs,
        modelValue: 'photos',
        ariaLabel: 'Wraparound media dossiers',
        orientation: 'horizontal',
        edge: 'top',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const dossiers = wrapper.findAll('.dossier-stack__file');

    expect(wrapper.classes()).not.toContain('dossier-stack--mixed-edge');
    expect(wrapper.classes()).toContain('dossier-stack--has-edge-top');
    expect(wrapper.classes()).toContain('dossier-stack--active-edge-top');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--edge-top');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--horizontal');
    expect(wrapper.find('.dossier-stack__stack').attributes('aria-orientation')).toBe('horizontal');
    expect(dossiers[0].classes()).toContain('dossier-stack__file--edge-top');
    expect(dossiers[0].classes()).toContain('dossier-stack__file--horizontal');
    expect(dossiers[0].classes()).toContain('dossier-stack__file--gravity-start');
    expect(dossiers[1].classes()).toContain('dossier-stack__file--gravity-start');
    expect(dossiers[2].classes()).toContain('dossier-stack__file--edge-top');
    expect(dossiers[2].classes()).toContain('dossier-stack__file--horizontal');
    expect(dossiers[2].classes()).toContain('dossier-stack__file--gravity-end');
    expect(dossiers[3].classes()).toContain('dossier-stack__file--gravity-end');
    expect(dossiers[0].attributes('style')).toContain('--dossier-piece-slot: 0.00px');
    expect(dossiers[2].attributes('style')).toContain('--dossier-piece-slot: 0.00px');
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text()).toBe('Object photos');

    await wrapper.setProps({ modelValue: 'docs' });
    await nextTick();

    expect(wrapper.classes()).toContain('dossier-stack--active-edge-top');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--edge-top');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--horizontal');
    expect(wrapper.find('.dossier-stack__file.is-active').classes()).toContain('dossier-stack__file--edge-top');
    expect(wrapper.find('.dossier-stack__file.is-active').classes()).toContain('dossier-stack__file--gravity-end');
    expect(wrapper.find('.dossier-stack__file.is-active .dossier-stack__content').text()).toBe('Documents');
    expect(wrapper.find('.dossier-stack__file.is-active').attributes('style')).toContain('--dossier-piece-z: 300');
  });

  it('keeps tucked dossier rotation opt-in', async () => {
    const squareWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'plans',
        ariaLabel: 'Square dossiers',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });
    const tiltedWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'plans',
        ariaLabel: 'Tilted dossiers',
        appearance: 'stack',
        tuckedTilt: true,
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });
    const sheetTiltWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'plans',
        ariaLabel: 'Sheet-tilted dossiers',
        appearance: 'stack',
        stackRotation: 'files',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });
    const pieceTiltWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'plans',
        ariaLabel: 'Piece-tilted dossiers',
        appearance: 'stack',
        stackRotation: 'pieces',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });
    const rotatedTabsWrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'plans',
        ariaLabel: 'Rotated tab handles',
        appearance: 'stack',
        stackRotation: 'files',
        tabRotation: 'rotated',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    expect(squareWrapper.classes()).not.toContain('dossier-stack--tucked-tilt');
    expect(squareWrapper.classes()).toContain('dossier-stack--stack-rotation-none');
    expect(squareWrapper.classes()).toContain('dossier-stack--tab-rotation-straight');
    expect(tiltedWrapper.classes()).toContain('dossier-stack--tucked-tilt');
    expect(tiltedWrapper.classes()).toContain('dossier-stack--stack-rotation-pieces');
    expect(sheetTiltWrapper.classes()).toContain('dossier-stack--tucked-tilt');
    expect(sheetTiltWrapper.classes()).toContain('dossier-stack--stack-rotation-files');
    expect(pieceTiltWrapper.classes()).toContain('dossier-stack--stack-rotation-pieces');
    expect(pieceTiltWrapper.classes()).toContain('dossier-stack--tab-rotation-straight');
    expect(rotatedTabsWrapper.classes()).toContain('dossier-stack--tab-rotation-rotated');
    expect(dossierPieceStyleNumber(squareWrapper, 0, '--dossier-piece-rotate')).toBe(0);
    expect(dossierPieceStyleNumber(tiltedWrapper, 0, '--dossier-piece-rotate')).not.toBe(0);
    expect(dossierPieceStyleNumber(sheetTiltWrapper, 0, '--dossier-piece-rotate')).not.toBe(0);
    expect(dossierPieceStyleNumber(pieceTiltWrapper, 0, '--dossier-piece-rotate')).not.toBe(0);
    expect(pieceTiltWrapper.findAll('.dossier-stack__file')[0].attributes('style'))
      .toContain('--dossier-index-counter-rotate:');
    expect(rotatedTabsWrapper.findAll('.dossier-stack__file')[0].attributes('style'))
      .toContain('--dossier-index-piece-rotate:');
    expect(tiltedWrapper.find('.dossier-stack__file.is-active').attributes('style'))
      .toContain('--dossier-piece-rotate: 0.00deg');
    expect(sheetTiltWrapper.find('.dossier-stack__file.is-active').attributes('style'))
      .toContain('--dossier-piece-rotate: 0.00deg');
    expect(normalizeDossierStackRotation('files')).toBe('files');
    expect(normalizeDossierStackRotation('pieces')).toBe('pieces');
    expect(normalizeDossierStackRotation('surprise')).toBe('none');
    expect(normalizeDossierIndexRotation('rotated')).toBe('rotated');
    expect(normalizeDossierIndexRotation('sideways')).toBe('straight');
    expect(normalizeDossierSurfaceTexture('paper')).toBe('paper');
    expect(normalizeDossierSurfaceTexture('linen')).toBe('none');
    expect(normalizeDossierSurfaceTextureLayers('shell')).toEqual(['sheet', 'tab']);
    expect(normalizeDossierSurfaceTextureLayers(['content', 'tab', 'content'])).toEqual(['content', 'tab']);
    expect(normalizeDossierSurfaceTextColor('dark')).toBe('dark');
    expect(normalizeDossierSurfaceTextColor('invisible')).toBe('auto');
    expect(normalizeDossierSurfaceTextureBlendMode('multiply')).toBe('multiply');
    expect(normalizeDossierSurfaceTextureBlendMode('smudge')).toBe('auto');
  });

  it('lets mixed-edge trays follow the active physical edge instead of the root flow axis', async () => {
    const mixedTabs: DossierIndexItem[] = [
      { ...tabs[0], edge: 'bottom' },
      { ...tabs[1], edge: 'right' },
      { ...tabs[2], edge: 'bottom' },
      { ...tabs[3], edge: 'right' },
    ];

    const wrapper = mount(DossierStack, {
      props: {
        tabs: mixedTabs,
        modelValue: 'plans',
        ariaLabel: 'Corner media dossiers',
        orientation: 'horizontal',
        edge: 'bottom',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const trayClasses = wrapper.find('.dossier-tray').classes();
    const activeDossierClasses = wrapper.find('.dossier-stack__file.is-active').classes();

    expect(wrapper.classes()).toContain('dossier-stack--horizontal');
    expect(wrapper.classes()).toContain('dossier-stack--mixed-edge');
    expect(wrapper.classes()).toContain('dossier-stack--active-edge-right');
    expect(trayClasses).toContain('dossier-tray--edge-right');
    expect(trayClasses).toContain('dossier-tray--vertical');
    expect(wrapper.find('.dossier-stack__stack').attributes('aria-orientation')).toBeUndefined();
    expect(activeDossierClasses).toContain('dossier-stack__file--edge-right');
    expect(activeDossierClasses).toContain('dossier-stack__file--vertical');
  });

  it('lets mixed-edge attached tablists use either arrow axis because they have no single ARIA orientation', async () => {
    const mixedTabs: DossierIndexItem[] = [
      { ...tabs[0], edge: 'bottom' },
      { ...tabs[1], edge: 'right' },
      { ...tabs[2], edge: 'bottom' },
      { ...tabs[3], edge: 'right' },
    ];

    const horizontalArrow = mount(DossierStack, {
      props: {
        tabs: mixedTabs,
        modelValue: 'photos',
        ariaLabel: 'Corner media dossiers',
        orientation: 'horizontal',
        edge: 'bottom',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await horizontalArrow.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(horizontalArrow.emitted('update:modelValue')).toEqual([['plans']]);

    const verticalArrow = mount(DossierStack, {
      props: {
        tabs: mixedTabs,
        modelValue: 'photos',
        ariaLabel: 'Corner media dossiers',
        orientation: 'horizontal',
        edge: 'bottom',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await verticalArrow.find('[role="tab"]').trigger('keydown', { key: 'ArrowDown' });
    expect(verticalArrow.emitted('update:modelValue')).toEqual([['plans']]);
  });

  it('derives single-edge attached orientation from the physical edge', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'horizontal',
        edge: 'right',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('dossier-stack--vertical');
    expect(wrapper.classes()).toContain('dossier-stack--edge-right');
    expect(wrapper.find('.dossier-tray').classes()).toContain('dossier-tray--vertical');
    expect(wrapper.find('.dossier-stack__stack').attributes('aria-orientation')).toBe('vertical');
    expect(wrapper.find('.dossier-stack__file').classes()).toContain('dossier-stack__file--vertical');
    expect(wrapper.find('.dossier-stack__file').classes()).toContain('dossier-stack__file--edge-right');

    await wrapper.find('[role="tab"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await wrapper.find('[role="tab"]').trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['plans']]);
  });

  it('tugs a hovered attached tab handle while keeping the dossier tucked', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[1].trigger('pointerenter');
    await nextTick();

    const activeDossier = wrapper.findAll('.dossier-stack__file')[0];
    const hoveredDossier = wrapper.findAll('.dossier-stack__file')[1];
    const displacedDossier = wrapper.findAll('.dossier-stack__file')[2];
    expect(hoveredDossier.classes()).toContain('is-hovered');
    expect(renderedTabs[1].classes()).toContain('is-hovered');
    expect(activeDossier.attributes('style')).toContain('--dossier-piece-z: 300');
    expect(hoveredDossier.attributes('style')).toContain('--dossier-piece-z: 40');
    expect(hoveredDossier.attributes('style')).toContain('--dossier-piece-rest-x: 29.00px');
    expect(hoveredDossier.attributes('style')).toContain('--dossier-index-hover-x: -6.00px');
    expect(hoveredDossier.attributes('style')).toContain('--dossier-index-hover-y: 0.00px');
    expect(displacedDossier.attributes('style')).toContain('--dossier-piece-slot: 200.00px');
  });

  it('tugs a focused attached tab handle while keeping the dossier tucked', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
        expandOn: 'focus',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const renderedTabs = wrapper.findAll('[role="tab"]');
    await renderedTabs[1].trigger('focus');
    await nextTick();

    const activeDossier = wrapper.findAll('.dossier-stack__file')[0];
    const focusedDossier = wrapper.findAll('.dossier-stack__file')[1];
    expect(focusedDossier.classes()).toContain('is-focused');
    expect(renderedTabs[1].classes()).toContain('is-focused');
    expect(focusedDossier.classes()).not.toContain('is-hovered');
    expect(activeDossier.attributes('style')).toContain('--dossier-piece-z: 300');
    expect(focusedDossier.attributes('style')).toContain('--dossier-piece-z: 40');
    expect(focusedDossier.attributes('style')).toContain('--dossier-piece-rest-x: 29.00px');
    expect(focusedDossier.attributes('style')).toContain('--dossier-index-hover-x: -6.00px');
    expect(focusedDossier.attributes('style')).toContain('--dossier-index-hover-y: 0.00px');
  });

  it('does not revive stale attached hover or focus state when a dossier key returns', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'left',
        appearance: 'stack',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await wrapper.findAll('[role="tab"]')[1].trigger('pointerenter');
    await wrapper.findAll('[role="tab"]')[1].trigger('focus');
    await nextTick();
    expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-hovered');
    expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-focused');

    await wrapper.setProps({ tabs: tabs.filter((tab) => tab.key !== 'plans') });
    await nextTick();
    expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-active');

    await wrapper.setProps({ tabs });
    await nextTick();

    const restoredDossier = wrapper.findAll('.dossier-stack__file')[1];
    const restoredTab = wrapper.findAll('[role="tab"]')[1];
    expect(restoredDossier.classes()).not.toContain('is-hovered');
    expect(restoredDossier.classes()).not.toContain('is-focused');
    expect(restoredTab.classes()).not.toContain('is-hovered');
    expect(restoredTab.classes()).not.toContain('is-focused');
    expect(wrapper.findAll('[role="tab"]')[0].attributes('tabindex')).toBe('0');
    expect(restoredTab.attributes('tabindex')).toBe('-1');
  });

  it('can emulate hover with BEM classes for visual QA', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'horizontal',
        edge: 'top',
        appearance: 'stack',
        emulatedHoverKey: 'plans',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const emulatedDossier = wrapper.findAll('.dossier-stack__file')[1];
    const emulatedTab = wrapper.findAll('[role="tab"]')[1];

    expect(wrapper.find('.dossier-stack').classes()).toContain('dossier-stack--hover-emulated');
    expect(emulatedDossier.classes()).toContain('dossier-stack__file--hover-emulated');
    expect(emulatedDossier.classes()).toContain('is-hovered');
    expect(emulatedTab.classes()).toContain('dossier-stack__tab--hover-emulated');
    expect(emulatedTab.classes()).toContain('is-hovered');
    expect(wrapper.findAll('.dossier-stack__file')[0].attributes('style'))
      .toContain('--dossier-piece-z: 300');
    expect(emulatedDossier.attributes('style')).toContain('--dossier-piece-z: 40');
    expect(wrapper.findAll('.dossier-stack__file')[2].attributes('style'))
      .toContain('--dossier-piece-slot: 200.00px');
  });

  it('keeps active dossiers out of hover expansion and lets real hover own the QA hook', async () => {
    const wrapper = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'right',
        appearance: 'stack',
        emulatedHoverKey: 'plans',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const renderedTabs = wrapper.findAll('[role="tab"]');
    const dossiers = wrapper.findAll('.dossier-stack__file');

    expect(dossiers[0].classes()).toContain('is-active');
    expect(dossiers[0].classes()).not.toContain('is-hovered');
    expect(renderedTabs[0].classes()).not.toContain('is-hovered');
    expect(dossiers[1].classes()).toContain('dossier-stack__file--hover-emulated');

    await renderedTabs[3].trigger('pointerenter');
    await nextTick();

    expect(dossiers[1].classes()).not.toContain('is-hovered');
    expect(dossiers[1].classes()).not.toContain('dossier-stack__file--hover-emulated');
    expect(dossiers[3].classes()).toContain('is-hovered');
    expect(renderedTabs[3].classes()).toContain('is-hovered');
  });

  it('lets an active end-gravity split tab suppress emulated neighbor hover', async () => {
    const wraparoundTabs: DossierIndexItem[] = [
      { key: 'intake', label: 'Client intake', shortLabel: 'Intake', icon: Icon, count: 8, edge: 'top', gravity: 'start' },
      { key: 'evidence', label: 'Evidence cabinet', shortLabel: 'Evidence', icon: Icon, count: 14, edge: 'top', gravity: 'start' },
      { key: 'strategy', label: 'Strategy map', shortLabel: 'Strategy', icon: Icon, count: 3, edge: 'top', gravity: 'end' },
      { key: 'signals', label: 'Signal model', shortLabel: 'Signals', icon: Icon, count: 6, edge: 'top', gravity: 'end' },
      { key: 'review', label: 'Counsel review', shortLabel: 'Review', icon: Icon, count: 2, edge: 'top', gravity: 'end' },
    ];

    const wrapper = mount(DossierStack, {
      props: {
        tabs: wraparoundTabs,
        modelValue: 'review',
        ariaLabel: 'Split case tray',
        orientation: 'horizontal',
        edge: 'top',
        appearance: 'stack',
        expandOn: 'hover',
        emulatedHoverKey: 'strategy',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const renderedTabs = wrapper.findAll('[role="tab"]');
    let dossiers = wrapper.findAll('.dossier-stack__file');

    expect(dossiers[2].classes()).toContain('is-hovered');
    expect(renderedTabs[2].classes()).toContain('is-expanded');
    expect(dossiers[4].classes()).toContain('is-active');
    expect(renderedTabs[4].classes()).not.toContain('is-expanded');

    await renderedTabs[4].trigger('pointerenter');
    await nextTick();
    dossiers = wrapper.findAll('.dossier-stack__file');

    expect(dossiers[2].classes()).not.toContain('is-hovered');
    expect(renderedTabs[2].classes()).not.toContain('is-expanded');
    expect(dossiers[4].classes()).not.toContain('is-hovered');
    expect(renderedTabs[4].classes()).not.toContain('is-expanded');

    await renderedTabs[4].trigger('pointerleave');
    await nextTick();

    expect(wrapper.findAll('.dossier-stack__file')[2].classes()).toContain('is-hovered');
  });

  it('does not hover-expand the selected bottom or right edge dossier', async () => {
    const bottom = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'horizontal',
        edge: 'bottom',
        appearance: 'stack',
        emulatedHoverKey: 'photos',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const right = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'right',
        appearance: 'stack',
        emulatedHoverKey: 'photos',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const bottomActive = bottom.findAll('.dossier-stack__file')[0];
    const rightActive = right.findAll('.dossier-stack__file')[0];

    expect(bottomActive.classes()).toContain('is-active');
    expect(bottomActive.classes()).not.toContain('is-hovered');
    expect(bottom.findAll('[role="tab"]')[0].classes()).not.toContain('is-hovered');

    expect(rightActive.classes()).toContain('is-active');
    expect(rightActive.classes()).not.toContain('is-hovered');
    expect(right.findAll('[role="tab"]')[0].classes()).not.toContain('is-hovered');
  });

  it('tugs bottom and right inactive hover handles without pulling dossiers', async () => {
    const bottom = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'horizontal',
        edge: 'bottom',
        appearance: 'stack',
        emulatedHoverKey: 'plans',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    const right = mount(DossierStack, {
      props: {
        tabs,
        modelValue: 'photos',
        ariaLabel: 'Media dossiers',
        orientation: 'vertical',
        edge: 'right',
        appearance: 'stack',
        emulatedHoverKey: 'plans',
      },
      slots: {
        default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
      },
    });

    await nextTick();

    const bottomActive = bottom.findAll('.dossier-stack__file')[0];
    const bottomHovered = bottom.findAll('.dossier-stack__file')[1];
    const rightActive = right.findAll('.dossier-stack__file')[0];
    const rightHovered = right.findAll('.dossier-stack__file')[1];

    expect(bottomActive.attributes('style')).toContain('--dossier-piece-z: 300');
    expect(bottomHovered.attributes('style')).toContain('--dossier-piece-z: 40');
    expect(bottomHovered.attributes('style')).toContain('--dossier-piece-rest-y: -29.00px');
    expect(bottomHovered.attributes('style')).toContain('--dossier-index-hover-y: 6.00px');

    expect(rightActive.attributes('style')).toContain('--dossier-piece-z: 300');
    expect(rightHovered.attributes('style')).toContain('--dossier-piece-z: 40');
    expect(rightHovered.attributes('style')).toContain('--dossier-piece-rest-x: -29.00px');
    expect(rightHovered.attributes('style')).toContain('--dossier-index-hover-x: 6.00px');
  });

  it('keeps deeply tucked handles large enough to expose the compact lane on every edge', async () => {
    const deepTabs: DossierIndexItem[] = [
      tabs[0],
      tabs[1],
      { key: 'maps', label: 'Maps', shortLabel: 'Maps', icon: Icon },
      tabs[3],
      { key: 'audit', label: 'Audit trail', shortLabel: 'Audit', icon: Icon, count: 5 },
    ];
    const expectedRest = {
      top: ['0.00px', '36.00px'],
      bottom: ['0.00px', '-36.00px'],
      left: ['36.00px', '0.00px'],
      right: ['-36.00px', '0.00px'],
    } as const;

    for (const [edge, [expectedX, expectedY]] of Object.entries(expectedRest)) {
      const wrapper = mount(DossierStack, {
        props: {
          tabs: deepTabs,
          modelValue: 'photos',
          ariaLabel: `${edge} media dossiers`,
          orientation: edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal',
          edge: edge as 'top' | 'bottom' | 'left' | 'right',
          appearance: 'stack',
        },
        slots: {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        },
      });

      await nextTick();

      expect(wrapper.find('.dossier-stack').attributes('style'))
        .toContain('--dossier-side-stack-reveal: 120px');

      const deepestDossier = wrapper.findAll('.dossier-stack__file')[1];
      const style = deepestDossier.attributes('style') ?? '';
      const expectedReachSize = edge === 'left' || edge === 'right' ? '156.00px' : '88.00px';

      expect(style).toContain(`--dossier-piece-x: ${expectedX}`);
      expect(style).toContain(`--dossier-piece-y: ${expectedY}`);
      expect(style).toContain(`--dossier-piece-rest-x: ${expectedX}`);
      expect(style).toContain(`--dossier-piece-rest-y: ${expectedY}`);
      expect(style).toContain('--dossier-attached-tab-grab-size: 44.00px');
      expect(style).toContain(`--dossier-attached-tab-reach-size: ${expectedReachSize}`);
      wrapper.unmount();
    }
  });

  it('derives deeply tucked handle reach from the visible grab-lane invariant', async () => {
    const deepTabs: DossierIndexItem[] = [
      tabs[0],
      tabs[1],
      { key: 'maps', label: 'Maps', shortLabel: 'Maps', icon: Icon },
      tabs[3],
      { key: 'audit', label: 'Audit trail', shortLabel: 'Audit', icon: Icon, count: 5 },
    ];

    for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
      const wrapper = mount(DossierStack, {
        props: {
          tabs: deepTabs,
          modelValue: 'photos',
          ariaLabel: `${edge} media dossiers`,
          orientation: edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal',
          edge,
          appearance: 'stack',
        },
        slots: {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        },
      });

      await nextTick();

      const deepestDossierIndex = 1;
      const reachSize = dossierPieceStyleNumber(wrapper, deepestDossierIndex, '--dossier-attached-tab-reach-size');
      const restX = dossierPieceStyleNumber(wrapper, deepestDossierIndex, '--dossier-piece-rest-x');
      const restY = dossierPieceStyleNumber(wrapper, deepestDossierIndex, '--dossier-piece-rest-y');
      const tuckedDistance = Math.max(Math.abs(restX), Math.abs(restY));
      const activePullCoverDistance = 0;

      expect(dossierPieceStyleNumber(wrapper, deepestDossierIndex, '--dossier-piece-x')).toBe(restX);
      expect(dossierPieceStyleNumber(wrapper, deepestDossierIndex, '--dossier-piece-y')).toBe(restY);
      expect(getDossierVisibleGrabSize(reachSize, tuckedDistance, activePullCoverDistance))
        .toBe(getDossierMinimumVisibleGrabSize(edge));

      wrapper.unmount();
    }
  });

  it('applies the same readable tucked depth ladder on every edge', async () => {
    const expectedRest = {
      top: ['0.00px', '29.00px'],
      bottom: ['0.00px', '-29.00px'],
      left: ['29.00px', '0.00px'],
      right: ['-29.00px', '0.00px'],
    } as const;

    for (const [edge, [expectedX, expectedY]] of Object.entries(expectedRest)) {
      const wrapper = mount(DossierStack, {
        props: {
          tabs,
          modelValue: 'photos',
          ariaLabel: `${edge} media dossiers`,
          orientation: edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal',
          edge: edge as 'top' | 'bottom' | 'left' | 'right',
          appearance: 'stack',
        },
        slots: {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        },
      });

      await nextTick();

      const secondDossierStyle = wrapper.findAll('.dossier-stack__file')[1].attributes('style') ?? '';

      expect(secondDossierStyle).toContain(`--dossier-piece-x: ${expectedX}`);
      expect(secondDossierStyle).toContain(`--dossier-piece-y: ${expectedY}`);
      expect(secondDossierStyle).toContain(`--dossier-piece-rest-x: ${expectedX}`);
      expect(secondDossierStyle).toContain(`--dossier-piece-rest-y: ${expectedY}`);
      wrapper.unmount();
    }
  });

  it('fronts the newly selected dossier while the previous one returns', async () => {
    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs,
          modelValue: active.value,
          ariaLabel: 'Media dossiers',
          orientation: 'vertical',
          edge: 'left',
          appearance: 'stack',
          tone: 'teal',
          pullDistance: 8,
          returnDuration: 20,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    const wrapper = mount(Harness);
    const renderedTabs = wrapper.findAll('[role="tab"]');

    await renderedTabs[1].trigger('click');
    await nextTick();
    await waitForMotionFrame();

    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Floor plans');
    expect(wrapper.findAll('.dossier-stack__file')[1].attributes('style')).toContain('--dossier-piece-x: -8.00px');

    await renderedTabs[0].trigger('click');
    await nextTick();

    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Object photos');
    expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-selecting');
    expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-handoff');
    expect(wrapper.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');
    expect(wrapper.findAll('.dossier-stack__file')[0].attributes('style')).toContain('--dossier-piece-z: 300');
    expect(wrapper.findAll('.dossier-stack__file')[0].attributes('style')).toContain('--dossier-piece-x: -8.00px');
    expect(wrapper.findAll('[role="tab"]')[0].classes()).toContain('is-open');
    expect(wrapper.findAll('[role="tab"]')[0].classes()).toContain('is-handoff');
    expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-returning');
    expect(wrapper.findAll('.dossier-stack__file')[1].attributes('style')).toContain('--dossier-piece-z: 240');

    await new Promise((resolve) => window.setTimeout(resolve, 25));
    await nextTick();
    await waitForMotionFrame();

    expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
    expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Object photos');
  });

  it('can keep active top-edge dossiers flush when pull distance is disabled', async () => {
    vi.useFakeTimers();

    const topTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Photos', icon: Icon, count: 11, gravity: 'start' },
      { key: 'plans', label: 'Plans', icon: Icon, gravity: 'start' },
      { key: 'parking', label: 'Parking', shortLabel: 'Park', icon: Icon, count: 1, gravity: 'end' },
      { key: 'exterior', label: 'Exterior', shortLabel: 'Ext.', icon: Icon, count: 10, gravity: 'end' },
    ];

    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs: topTabs,
          modelValue: active.value,
          ariaLabel: 'Gallery categories',
          orientation: 'horizontal',
          edge: 'top',
          appearance: 'stack',
          expandOn: 'active',
          gravity: 'start',
          pullDuration: 30,
          returnDuration: 20,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    try {
      const wrapper = mount(Harness);
      const renderedTabs = wrapper.findAll('[role="tab"]');

      await renderedTabs[2].trigger('click');
      await nextTick();

      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Parking');
      expect(dossierPieceStyleNumber(wrapper, 2, '--dossier-piece-y')).toBe(0);
      expect(dossierPieceStyleNumber(wrapper, 2, '--dossier-piece-pull-y')).toBe(0);

      vi.advanceTimersByTime(30);
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[2].classes()).toContain('is-pulled');
      expect(dossierPieceStyleNumber(wrapper, 2, '--dossier-piece-y')).toBe(0);

      await renderedTabs[3].trigger('click');
      await nextTick();

      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Exterior');
      expect(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-y')).toBe(0);
      expect(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-pull-y')).toBe(0);
      expect(wrapper.findAll('.dossier-stack__file')[3].attributes('style')).toContain('--dossier-piece-z: 300');

      vi.advanceTimersByTime(50);
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[3].classes()).toContain('is-pulled');
      expect(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-y')).toBe(0);
      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Exterior');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps clicking an already pulled dossier idempotent', async () => {
    vi.useFakeTimers();

    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs,
          modelValue: active.value,
          ariaLabel: 'Idempotent attached dossiers',
          orientation: 'vertical',
          edge: 'left',
          appearance: 'stack',
          pullDuration: 30,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    try {
      const wrapper = mount(Harness);
      const attachment = wrapper.findComponent(DossierStack);
      const renderedTabs = wrapper.findAll('[role="tab"]');

      await renderedTabs[0].trigger('click');
      await nextTick();

      expect(attachment.emitted('update:modelValue')).toBeUndefined();
      expect(attachment.emitted('activate')).toBeUndefined();
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');
      expect(wrapper.find('.dossier-tray').classes()).not.toContain('is-pulled');

      await renderedTabs[1].trigger('click');
      await nextTick();

      expect(attachment.emitted('update:modelValue')).toEqual([['plans']]);
      expect(attachment.emitted('activate')?.[0]?.[0]).toBe('plans');
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-pulling');
      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');

      vi.advanceTimersByTime(30);
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-pulled');
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).not.toContain('is-pulling');

      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();

      expect(attachment.emitted('update:modelValue')).toEqual([['plans']]);
      expect(attachment.emitted('activate')).toHaveLength(1);
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-pulled');
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).not.toContain('is-pulling');
      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Floor plans');
    } finally {
      vi.useRealTimers();
    }
  });

  it('remembers historical selection order for tucked dossier z-indexes', async () => {
    vi.useFakeTimers();

    const historyTabs: DossierIndexItem[] = [
      { key: 'one', label: 'One', icon: Icon },
      { key: 'two', label: 'Two', icon: Icon },
      { key: 'three', label: 'Three', icon: Icon },
      { key: 'four', label: 'Four', icon: Icon },
      { key: 'five', label: 'Five', icon: Icon },
    ];

    const Harness = defineComponent({
      setup() {
        const active = ref('three');

        return () => h(DossierStack, {
          tabs: historyTabs,
          modelValue: active.value,
          ariaLabel: 'Historical dossiers',
          orientation: 'vertical',
          edge: 'left',
          appearance: 'stack',
          pullDuration: 10,
          returnDuration: 10,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    try {
      const wrapper = mount(Harness);
      const initialDossiers = wrapper.findAll('.dossier-stack__file');

      expect(dossierPieceZ(wrapper, 2)).toBe(300);
      expect(dossierPieceZ(wrapper, 3)).toBeLessThan(dossierPieceZ(wrapper, 2));
      expect(initialDossiers[0].classes()).toContain('is-tucked');
      expect(initialDossiers[2].classes()).not.toContain('is-tucked');

      await wrapper.findAll('[role="tab"]')[4].trigger('click');
      await nextTick();
      vi.advanceTimersByTime(10);
      await nextTick();

      expect(dossierPieceZ(wrapper, 4)).toBe(300);
      expect(dossierPieceZ(wrapper, 2)).toBeGreaterThan(dossierPieceZ(wrapper, 3));
      expect(dossierPieceZ(wrapper, 2)).toBeGreaterThan(dossierPieceZ(wrapper, 1));
      expect(dossierPieceStyleNumber(wrapper, 2, '--dossier-piece-rest-x')).toBe(15);
      expect(dossierPieceStyleNumber(wrapper, 3, '--dossier-piece-rest-x')).toBe(22);

      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();

      expect(dossierPieceZ(wrapper, 1)).toBe(300);

      vi.advanceTimersByTime(20);
      await nextTick();

      expect(dossierPieceZ(wrapper, 4)).toBeGreaterThan(dossierPieceZ(wrapper, 2));
      expect(dossierPieceZ(wrapper, 2)).toBeGreaterThan(dossierPieceZ(wrapper, 3));
      expect(dossierPieceZ(wrapper, 3)).toBeGreaterThan(dossierPieceZ(wrapper, 0));
      expect(dossierPieceStyleNumber(wrapper, 4, '--dossier-piece-rest-x')).toBe(15);
      expect(dossierPieceStyleNumber(wrapper, 2, '--dossier-piece-rest-x')).toBe(22);
      expect(dossierPieceStyleNumber(wrapper, 0, '--dossier-piece-rest-x')).toBe(36);

      const historicalZBeforeHover = dossierPieceZ(wrapper, 2);
      await wrapper.findAll('[role="tab"]')[2].trigger('pointerenter');
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[2].classes()).toContain('is-hovered');
      expect(dossierPieceZ(wrapper, 2)).toBe(historicalZBeforeHover);
      expect(dossierPieceZ(wrapper, 2)).not.toBe(180);
      expect(dossierPieceZ(wrapper, 2)).not.toBe(190);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a returning dossier folding while rapid clicks update the next pulled dossier', async () => {
    vi.useFakeTimers();

    const Harness = defineComponent({
      setup() {
        const active = ref('photos');

        return () => h(DossierStack, {
          tabs,
          modelValue: active.value,
          ariaLabel: 'Media dossiers',
          orientation: 'vertical',
          edge: 'left',
          appearance: 'stack',
          tone: 'teal',
          pullDuration: 40,
          returnDuration: 60,
          'onUpdate:modelValue': (key: DossierIndexKey) => {
            active.value = String(key);
          },
        }, {
          default: ({ activeTab }: { activeTab: DossierIndexItem | null }) => h('p', activeTab?.label),
        });
      },
    });

    try {
      const wrapper = mount(Harness);
      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();
      vi.advanceTimersByTime(40);
      await nextTick();

      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
      expect(wrapper.findAll('[role="tab"]')[1].classes()).toContain('is-pulled');

      await wrapper.findAll('[role="tab"]')[3].trigger('click');
      await nextTick();

      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Documents');
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-returning');
      expect(wrapper.findAll('.dossier-stack__file')[3].classes()).toContain('is-selecting');
      expect(wrapper.findAll('.dossier-stack__file')[3].classes()).toContain('is-handoff');
      expect(wrapper.findAll('.dossier-stack__file')[3].attributes('style')).toContain('--dossier-piece-z: 300');

      await wrapper.findAll('[role="tab"]')[0].trigger('click');
      await nextTick();

      expect(wrapper.find('.dossier-stack__content:not([hidden])').text()).toBe('Object photos');
      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-returning');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-selecting');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-handoff');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');
      expect(wrapper.findAll('.dossier-stack__file')[0].attributes('style')).toContain('--dossier-piece-z: 300');

      vi.advanceTimersByTime(59);
      await nextTick();

      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');
      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).toContain('is-returning');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-handoff');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');

      vi.advanceTimersByTime(1);
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[1].classes()).not.toContain('is-returning');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-pulling');
      expect(wrapper.find('.dossier-tray').classes()).toContain('is-pulled');

      vi.advanceTimersByTime(40);
      await nextTick();

      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).toContain('is-pulled');
      expect(wrapper.findAll('.dossier-stack__file')[0].classes()).not.toContain('is-pulling');
    } finally {
      vi.useRealTimers();
    }
  });
});
