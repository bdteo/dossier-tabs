import { describe, expect, it } from 'vitest';
import {
  getAdjacentDossierIndexKey,
  getCompactSize,
  getFirstDossierIndexKey,
  getDossierPaperTexturePreset,
  getDossierPaperTextureStyle,
  getDossierDensityOverlap,
  getDossierEdgeVector,
  getDossierHoverOffset,
  getDossierMinimumGrabSize,
  getDossierMinimumVisibleGrabSize,
  getDossierPieceTuckOffset,
  getDossierStackSlots,
  getDossierIndexAccessibleLabel,
  getDossierIndexCountLabel,
  getDossierIndexDisplayLabel,
  getDossierIndexDomId,
  getDossierIndexIcon,
  getDossierIndexNavigationTarget,
  getDossierIndexOrientationForEdge,
  getDossierIndexReachSize,
  getDossierIndexTotalCountLabel,
  getDossierTuckRotation,
  getDossierVisibleGrabSize,
  hasDossierIndexCount,
  hasDossierIndexIcon,
  hasLimitedDossierIndexTotal,
  isDossierIndexDisabled,
  normalizeDossierActiveIndex,
  normalizeDossierTrayDepth,
  normalizeDossierLayerCount,
  normalizeDossierMotionDuration,
  normalizeDossierSurfaceTextColor,
  normalizeDossierSurfaceTextureBlendMode,
  normalizeDossierSurfaceTexture,
  normalizeDossierSurfaceTextureLayers,
  normalizeDossierIndexRotation,
  normalizeDossierIndexActivation,
  normalizeDossierIndexAppearance,
  normalizeDossierIndexDensity,
  normalizeDossierIndexEdge,
  normalizeDossierIndexExpandOn,
  normalizeDossierIndexGravity,
  normalizeDossierIndexKeyboardOrientation,
  normalizeDossierIndexKeyForLookup,
  normalizeDossierIndexOrientation,
  normalizeDossierIndex,
  normalizeDossierTone,
  type DossierIndexMeasurement,
  type DossierIndexItem,
} from '../src/components/dossier-tabs';

const tabs: DossierIndexItem[] = [
  { key: 'photos', label: 'Object photos', shortLabel: 'Photos', count: 1, totalCount: 15 },
  { key: 'plans', label: 'Floor plans', shortLabel: 'Plans', count: 2 },
  { key: 'maps', label: 'Maps and plans', shortLabel: 'Maps', disabled: true },
  { key: 'docs', label: 'Documents', shortLabel: 'Docs', countLabel: '12' },
];

describe('dossier tab helpers', () => {
  it('keeps only keyed, labelled tabs', () => {
    expect(normalizeDossierIndex([
      ...tabs,
      { key: null, label: 'Missing' },
      { key: 'bad' },
      { key: {}, label: 'Object key' },
      { key: true, label: 'Boolean key' },
      { key: Symbol('symbol'), label: 'Symbol key' },
      { key: () => 'function', label: 'Function key' },
      { key: Number.NaN, label: 'NaN key' },
      { key: Number.POSITIVE_INFINITY, label: 'Infinite key' },
      { key: Number.NEGATIVE_INFINITY, label: 'Negative infinite key' },
      { key: 0, label: 'Zero key' },
    ]).map((tab) => tab.key)).toEqual(['photos', 'plans', 'maps', 'docs', 0]);
  });

  it('keeps the first tab for each string-normalized key', () => {
    expect(normalizeDossierIndex([
      ...tabs,
      { key: 'photos', label: 'Duplicate photos' },
      { key: 12, label: 'Numeric key' },
      { key: '12', label: 'String duplicate key' },
    ]).map((tab) => tab.label)).toEqual([
      'Object photos',
      'Floor plans',
      'Maps and plans',
      'Documents',
      'Numeric key',
    ]);
  });

  it('normalizes only real dossier tab keys for lookup comparisons', () => {
    const objectLikeKeyTabs: DossierIndexItem[] = [
      { key: 'photos', label: 'Object photos' },
      { key: '[object Object]', label: 'Object-looking string key' },
    ];

    expect(normalizeDossierIndexKeyForLookup('photos')).toBe('photos');
    expect(normalizeDossierIndexKeyForLookup(0)).toBe('0');
    expect(normalizeDossierIndexKeyForLookup('[object Object]')).toBe('[object Object]');
    expect(normalizeDossierIndexKeyForLookup({})).toBeNull();
    expect(normalizeDossierIndexKeyForLookup(Number.NaN)).toBeNull();
    expect(normalizeDossierIndexKeyForLookup(Number.POSITIVE_INFINITY)).toBeNull();
    expect(getAdjacentDossierIndexKey(objectLikeKeyTabs, {} as any, 1)).toBe('photos');
    expect(getDossierIndexNavigationTarget(objectLikeKeyTabs, {} as any, 'ArrowRight')).toBe('photos');
  });

  it('prefers compact visible labels while preserving accessible labels', () => {
    expect(getDossierIndexDisplayLabel(tabs[0])).toBe('Photos');
    expect(getDossierIndexAccessibleLabel(tabs[0])).toBe('Object photos');
    expect(getDossierIndexAccessibleLabel({ key: 'x', label: 'Full', srLabel: 'Screen reader full' })).toBe('Screen reader full');
    expect(getDossierIndexDisplayLabel({ key: 'x', label: 'Full', shortLabel: {} as any })).toBe('Full');
    expect(getDossierIndexAccessibleLabel({ key: 'x', label: 'Full', srLabel: {} as any })).toBe('Full');
    expect(getDossierIndexDisplayLabel({ key: 'x', label: {} as any })).toBe('');
  });

  it('keeps only Vue component-like icon values at runtime', () => {
    const functionalIcon = () => null;
    const objectIcon = { render: () => null };

    expect(getDossierIndexIcon({ key: 'fn', label: 'Function icon', icon: functionalIcon })).toBe(functionalIcon);
    expect(getDossierIndexIcon({ key: 'object', label: 'Object icon', icon: objectIcon })).toBe(objectIcon);
    expect(hasDossierIndexIcon({ key: 'object', label: 'Object icon', icon: objectIcon })).toBe(true);
    expect(getDossierIndexIcon({ key: 'string', label: 'String icon', icon: 'span' as any })).toBeNull();
    expect(getDossierIndexIcon({ key: 'plain', label: 'Plain icon', icon: {} as any })).toBeNull();
    expect(hasDossierIndexIcon({ key: 'plain', label: 'Plain icon', icon: {} as any })).toBe(false);
  });

  it('renders count labels for limited and explicit count states', () => {
    expect(getDossierIndexCountLabel(tabs[0])).toBe('1/15');
    expect(getDossierIndexCountLabel(tabs[3])).toBe('12');
    expect(getDossierIndexCountLabel({ ...tabs[0], countLabel: '15' })).toBe('15');
    expect(getDossierIndexTotalCountLabel(tabs[0])).toBe('15');
    expect(hasDossierIndexCount(tabs[0])).toBe(true);
    expect(hasDossierIndexCount(tabs[3])).toBe(true);
    expect(hasDossierIndexCount({ key: 'empty', label: 'Empty', countLabel: '' })).toBe(false);
    expect(hasDossierIndexCount({ key: 'zero', label: 'Zero', count: 0 })).toBe(true);
    expect(hasLimitedDossierIndexTotal(tabs[0])).toBe(true);
    expect(hasLimitedDossierIndexTotal({ ...tabs[0], countLabel: '15' })).toBe(false);
  });

  it('treats only boolean true as disabled at runtime', () => {
    expect(isDossierIndexDisabled({ key: 'disabled', label: 'Disabled', disabled: true })).toBe(true);
    expect(isDossierIndexDisabled({ key: 'enabled', label: 'Enabled', disabled: false })).toBe(false);
    expect(isDossierIndexDisabled({ key: 'string', label: 'String disabled', disabled: 'false' as any })).toBe(false);
    expect(isDossierIndexDisabled({ key: 'number', label: 'Number disabled', disabled: 1 as any })).toBe(false);
    expect(isDossierIndexDisabled({ key: 'object', label: 'Object disabled', disabled: {} as any })).toBe(false);
  });

  it('ignores invalid runtime count values instead of rendering object text', () => {
    const invalidCountLabel = { key: 'runtime', label: 'Runtime', count: 3, totalCount: 12, countLabel: {} } as any;
    const invalidCount = { key: 'runtime', label: 'Runtime', count: {}, totalCount: 12 } as any;

    expect(getDossierIndexCountLabel(invalidCountLabel)).toBe('3/12');
    expect(hasDossierIndexCount(invalidCountLabel)).toBe(true);
    expect(hasLimitedDossierIndexTotal(invalidCountLabel)).toBe(true);
    expect(getDossierIndexCountLabel(invalidCount)).toBe('');
    expect(hasDossierIndexCount(invalidCount)).toBe(false);
    expect(hasLimitedDossierIndexTotal(invalidCount)).toBe(false);
    expect(getDossierIndexCountLabel({ key: 'empty', label: 'Empty', count: 3, totalCount: 12, countLabel: '' })).toBe('');
    expect(hasLimitedDossierIndexTotal({ key: 'empty', label: 'Empty', count: 3, totalCount: 12, countLabel: '' })).toBe(false);
    expect(getDossierIndexCountLabel({ key: 'nan', label: 'NaN', count: Number.NaN })).toBe('');
    expect(getDossierIndexCountLabel({ key: 'infinite', label: 'Infinite', count: 3, totalCount: 'Infinity' })).toBe('3');
    expect(hasLimitedDossierIndexTotal({ key: 'infinite', label: 'Infinite', count: 3, totalCount: 'Infinity' })).toBe(false);
    expect(getDossierIndexTotalCountLabel({ key: 'object', label: 'Object', totalCount: {} as any })).toBe('');
    expect(getDossierIndexCountLabel({ key: 'symbol', label: 'Symbol', countLabel: Symbol('bad') } as any)).toBe('');
  });

  it('builds safe default tab and panel DOM ids from arbitrary keys', () => {
    expect(getDossierIndexDomId('Dossier Stack:v-0', { key: 'Client Intake / 2026' }, 'panel'))
      .toMatch(/^dossier-stack-v-0-client-intake-2026-[a-z0-9]+-panel$/);
    expect(getDossierIndexDomId('Dossier Stack:v-0', { key: '   ' }, 'tab'))
      .toMatch(/^dossier-stack-v-0-dossier-index-[a-z0-9]+-tab$/);
    expect(getDossierIndexDomId('Dossier Stack:v-0', { key: Number.NaN }, 'tab'))
      .toMatch(/^dossier-stack-v-0-tab-[a-z0-9]+-tab$/);
    expect(getDossierIndexDomId('Dossier Stack:v-0', { key: Number.POSITIVE_INFINITY }, 'tab'))
      .toMatch(/^dossier-stack-v-0-tab-[a-z0-9]+-tab$/);
  });

  it('keeps generated DOM ids distinct when readable key slugs collide', () => {
    expect(getDossierIndexDomId('dossier-tabs', { key: 'Client Intake' }, 'panel'))
      .not.toBe(getDossierIndexDomId('dossier-tabs', { key: 'Client/Intake' }, 'panel'));
    expect(getDossierIndexDomId('dossier-tabs', { key: 'A' }, 'tab'))
      .not.toBe(getDossierIndexDomId('dossier-tabs', { key: 'a' }, 'tab'));
  });

  it('normalizes motion durations to finite non-negative milliseconds', () => {
    expect(normalizeDossierMotionDuration(315.4)).toBe(315);
    expect(normalizeDossierMotionDuration(-20)).toBe(0);
    expect(normalizeDossierMotionDuration(Number.NaN)).toBe(0);
    expect(normalizeDossierMotionDuration(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeDossierMotionDuration(undefined)).toBe(0);
  });

  it('normalizes public enum props from unknown runtime values', () => {
    expect(normalizeDossierIndexOrientation('vertical')).toBe('vertical');
    expect(normalizeDossierIndexOrientation('diagonal')).toBe('horizontal');
    expect(normalizeDossierIndexKeyboardOrientation('both')).toBe('both');
    expect(normalizeDossierIndexKeyboardOrientation('sideways')).toBe('both');
    expect(normalizeDossierIndexDensity('dense')).toBe('dense');
    expect(normalizeDossierIndexDensity('loose')).toBe('spread');
    expect(normalizeDossierIndexActivation('manual')).toBe('manual');
    expect(normalizeDossierIndexActivation('instant')).toBe('automatic');
    expect(normalizeDossierIndexExpandOn('always')).toBe('always');
    expect(normalizeDossierIndexExpandOn('touch')).toBe('hover');
    expect(normalizeDossierIndexGravity('end')).toBe('end');
    expect(normalizeDossierIndexGravity('middle')).toBe('center');
    expect(normalizeDossierIndexAppearance('stack')).toBe('stack');
    expect(normalizeDossierIndexAppearance('accordion')).toBe('rail');
    expect(normalizeDossierTrayDepth('deep')).toBe('deep');
    expect(normalizeDossierTrayDepth('sunken')).toBe('raised');
    expect(normalizeDossierLayerCount(2.4)).toBe(2);
    expect(normalizeDossierLayerCount(1.6)).toBe(2);
    expect(normalizeDossierLayerCount(-1)).toBe(0);
    expect(normalizeDossierLayerCount(Number.NaN)).toBe(2);
    expect(normalizeDossierLayerCount(Number.POSITIVE_INFINITY)).toBe(2);
    expect(normalizeDossierActiveIndex(3.4)).toBe(3);
    expect(normalizeDossierActiveIndex(-1)).toBe(0);
    expect(normalizeDossierActiveIndex(Number.NaN)).toBe(0);
    expect(normalizeDossierTone('copper')).toBe('copper');
    expect(normalizeDossierTone('steel')).toBe('steel');
    expect(normalizeDossierTone('neon')).toBe('slate');
    expect(normalizeDossierIndexRotation('rotated')).toBe('rotated');
    expect(normalizeDossierIndexRotation('sideways')).toBe('straight');
    expect(normalizeDossierSurfaceTexture('paper')).toBe('paper');
    expect(normalizeDossierSurfaceTexture('linen')).toBe('none');
    expect(normalizeDossierSurfaceTextureLayers('all')).toEqual(['sheet', 'content', 'tab']);
    expect(normalizeDossierSurfaceTextureLayers('shell')).toEqual(['sheet', 'tab']);
    expect(normalizeDossierSurfaceTextureLayers('none')).toEqual([]);
    expect(normalizeDossierSurfaceTextureLayers(['tab', 'sheet', 'tab', 'smudge'])).toEqual(['tab', 'sheet']);
    expect(normalizeDossierSurfaceTextureLayers('smudge')).toEqual(['sheet', 'content', 'tab']);
    expect(normalizeDossierSurfaceTextColor('dark')).toBe('dark');
    expect(normalizeDossierSurfaceTextColor('invisible')).toBe('auto');
    expect(normalizeDossierSurfaceTextureBlendMode('multiply')).toBe('multiply');
    expect(normalizeDossierSurfaceTextureBlendMode('smudge')).toBe('auto');
  });

  it('exposes package paper texture presets as bindable CSS variables', () => {
    expect(getDossierPaperTexturePreset('paper05HybridStrong')?.label).toBe('#5 strong tile');
    expect(getDossierPaperTexturePreset('missing')).toBeNull();

    expect(getDossierPaperTextureStyle('paper05HybridStrong')).toMatchObject({
      '--dossier-paper-filter-custom': 'contrast(1.7) brightness(0.9) saturate(0.86)',
      '--dossier-paper-sheet-opacity-custom': '0.72',
      '--dossier-paper-content-opacity-custom': '0.46',
      '--dossier-paper-tab-opacity-custom': '0.6',
    });
    expect(getDossierPaperTextureStyle('paper05HybridStrong')['--dossier-paper-texture-custom'])
      ?.toContain('05-creamy-fine-tooth-hybrid-strong-2048-tile');
    expect(getDossierPaperTextureStyle('paper05HybridStrongRepeat')['--dossier-paper-texture-custom'])
      ?.toContain('05-creamy-fine-tooth-hybrid-strong-2048-repeat-3x3');
    expect(getDossierPaperTextureStyle('paper05HybridStrongDensity4')).toMatchObject({
      '--dossier-paper-texture-size-custom': 'auto, 512px 512px',
    });
    expect(getDossierPaperTextureStyle('paper05HybridStrongDensity4')['--dossier-paper-texture-custom'])
      ?.toContain('05-creamy-fine-tooth-hybrid-strong-512-density4-tile');
    expect(getDossierPaperTextureStyle('paper05HybridStrongDensity9')).toMatchObject({
      '--dossier-paper-texture-size-custom': 'auto, 228px 228px',
    });
    expect(getDossierPaperTextureStyle('paper05HybridStrongDensity9')['--dossier-paper-texture-custom'])
      ?.toContain('05-creamy-fine-tooth-hybrid-strong-228-density9-tile');
    expect(getDossierPaperTextureStyle('missing')).toEqual({});
  });

  it('navigates among focusable tabs without wrapping beyond the physical stack', () => {
    expect(getFirstDossierIndexKey(tabs)).toBe('photos');
    expect(getAdjacentDossierIndexKey(tabs, 'photos', 1)).toBe('plans');
    expect(getAdjacentDossierIndexKey(tabs, 'plans', 1)).toBe('docs');
    expect(getAdjacentDossierIndexKey(tabs, 'docs', 1)).toBe('docs');
    expect(getAdjacentDossierIndexKey(tabs, 'plans', -1)).toBe('photos');
  });

  it('recovers keyboard navigation from stale current keys without skipping focusable tabs', () => {
    expect(getAdjacentDossierIndexKey(tabs, 'missing', 1)).toBe('photos');
    expect(getAdjacentDossierIndexKey(tabs, null, 1)).toBe('photos');
    expect(getAdjacentDossierIndexKey(tabs, 'missing', -1)).toBe('docs');
    expect(getAdjacentDossierIndexKey(tabs, undefined, -1)).toBe('docs');
    expect(getDossierIndexNavigationTarget(tabs, 'missing', 'ArrowRight')).toBe('photos');
    expect(getDossierIndexNavigationTarget(tabs, 'missing', 'ArrowLeft')).toBe('docs');
  });

  it('maps keyboard keys to physical neighbor targets when both axes are allowed', () => {
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'ArrowRight')).toBe('plans');
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'ArrowDown')).toBe('plans');
    expect(getDossierIndexNavigationTarget(tabs, 'docs', 'ArrowLeft')).toBe('plans');
    expect(getDossierIndexNavigationTarget(tabs, 'docs', 'ArrowUp')).toBe('plans');
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'End')).toBe('docs');
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'Escape')).toBeNull();
  });

  it('respects tablist orientation when mapping arrow keys', () => {
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'ArrowRight', 'horizontal')).toBe('plans');
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'ArrowDown', 'horizontal')).toBeNull();
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'ArrowDown', 'vertical')).toBe('plans');
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'ArrowRight', 'vertical')).toBeNull();
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'Home', 'vertical')).toBe('photos');
    expect(getDossierIndexNavigationTarget(tabs, 'photos', 'End', 'horizontal')).toBe('docs');
  });

  it('derives default edges from orientation', () => {
    expect(normalizeDossierIndexEdge(null, 'horizontal')).toBe('top');
    expect(normalizeDossierIndexEdge(undefined, 'vertical')).toBe('left');
    expect(normalizeDossierIndexEdge('right', 'vertical')).toBe('right');
    expect(normalizeDossierIndexEdge('diagonal', 'sideways')).toBe('top');
  });

  it('derives physical orientation from the dossier edge', () => {
    expect(getDossierIndexOrientationForEdge('top')).toBe('horizontal');
    expect(getDossierIndexOrientationForEdge('bottom')).toBe('horizontal');
    expect(getDossierIndexOrientationForEdge('left')).toBe('vertical');
    expect(getDossierIndexOrientationForEdge('right')).toBe('vertical');
    expect(getDossierIndexOrientationForEdge('diagonal')).toBe('horizontal');
  });

  it('maps dossier edges to canonical pull vectors', () => {
    expect(getDossierEdgeVector('left')).toMatchObject({ axis: 'x', sign: -1, x: -1, y: 0 });
    expect(getDossierEdgeVector('right')).toMatchObject({ axis: 'x', sign: 1, x: 1, y: 0 });
    expect(getDossierEdgeVector('top')).toMatchObject({ axis: 'y', sign: -1, x: 0, y: -1 });
    expect(getDossierEdgeVector('bottom')).toMatchObject({ axis: 'y', sign: 1, x: 0, y: 1 });
  });

  it('tugs hovered tab handles toward their dossier edge', () => {
    expect(getDossierHoverOffset('left')).toEqual({ x: -6, y: 0 });
    expect(getDossierHoverOffset('right')).toEqual({ x: 6, y: 0 });
    expect(getDossierHoverOffset('top')).toEqual({ x: 0, y: -6 });
    expect(getDossierHoverOffset('bottom')).toEqual({ x: 0, y: 6 });
  });

  it('tucks physical dossiers inward with a readable 7px depth step', () => {
    expect(getDossierPieceTuckOffset('left', 0, 3, 'spread')).toEqual({ x: 29, y: 0 });
    expect(getDossierPieceTuckOffset('right', 0, 3, 'spread')).toEqual({ x: -29, y: 0 });
    expect(getDossierPieceTuckOffset('top', 0, 3, 'spread')).toEqual({ x: 0, y: 29 });
    expect(getDossierPieceTuckOffset('bottom', 0, 3, 'spread')).toEqual({ x: 0, y: -29 });
    expect(getDossierPieceTuckOffset('left', 0, 2, 'dense')).toEqual({ x: 17, y: 0 });
  });

  it('rotates tucked dossiers with small mirrored angles', () => {
    expect(getDossierTuckRotation('top', 2, 2)).toBe(0);
    expect(getDossierTuckRotation('top', 0, 3)).toBe(-0.96);
    expect(getDossierTuckRotation('top', 1, 3)).toBe(0.78);
    expect(getDossierTuckRotation('right', 0, 3)).toBe(0.96);
    expect(getDossierTuckRotation('bottom', 1, 3)).toBe(-0.78);
    expect(Math.abs(getDossierTuckRotation('left', 99, 0))).toBeLessThanOrEqual(1.35);
  });

  it('extends buried tab handles enough to preserve the compact handle lane', () => {
    expect(getDossierIndexReachSize(44, 0)).toBe(44);
    expect(getDossierIndexReachSize(44, 20)).toBe(64);
    expect(getDossierIndexReachSize(44, 22)).toBe(66);
    expect(getDossierIndexReachSize(44, 37)).toBe(81);
    expect(getDossierIndexReachSize(32, 40, 20)).toBe(60);
    expect(getDossierIndexReachSize(44, 27, 44, 8)).toBe(79);
    expect(getDossierIndexReachSize(32, 40, 20, 8)).toBe(68);
  });

  it('reserves a visible grab lane large enough for icons and touch padding', () => {
    expect(getDossierMinimumGrabSize(44)).toBe(52);
    expect(getDossierMinimumGrabSize(64)).toBe(64);
    expect(getDossierMinimumGrabSize(44, 60)).toBe(60);
    expect(getDossierMinimumGrabSize(Number.NaN)).toBe(52);
    expect(getDossierMinimumVisibleGrabSize('top')).toBe(52);
    expect(getDossierMinimumVisibleGrabSize('bottom')).toBe(52);
    expect(getDossierMinimumVisibleGrabSize('left')).toBe(120);
    expect(getDossierMinimumVisibleGrabSize('right')).toBe(120);
    expect(getDossierIndexReachSize(44, 27, getDossierMinimumGrabSize(44), 8)).toBe(87);
    expect(getDossierIndexReachSize(44, 27, getDossierMinimumGrabSize(44, getDossierMinimumVisibleGrabSize('right')), 8)).toBe(155);
  });

  it('keeps the grab lane visible after tucked depth and active dossier cover are removed', () => {
    const compactSize = 44;
    const activeCoverDistance = 8;

    for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
      const tuckedOffset = getDossierPieceTuckOffset(edge, 0, 4, 'spread');
      const tuckedDistance = Math.max(Math.abs(tuckedOffset.x), Math.abs(tuckedOffset.y));
      const minimumVisibleGrabSize = getDossierMinimumVisibleGrabSize(edge);
      const minimumGrabSize = getDossierMinimumGrabSize(compactSize, minimumVisibleGrabSize);
      const reachSize = getDossierIndexReachSize(
        compactSize,
        tuckedDistance,
        minimumGrabSize,
        activeCoverDistance,
      );

      expect(getDossierVisibleGrabSize(reachSize, tuckedDistance, activeCoverDistance))
        .toBe(minimumGrabSize);
    }

    expect(getDossierVisibleGrabSize(155, 27, activeCoverDistance)).toBe(120);
    expect(getDossierVisibleGrabSize(87, 27, activeCoverDistance)).toBe(52);
  });

  it('uses measured tab geometry to reserve the active dossier slot', () => {
    const measurements: DossierIndexMeasurement[] = [
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 120 },
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 160 },
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 100 },
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 140 },
    ];

    expect(getDossierDensityOverlap('overlap', 'stack')).toBe(10);
    expect(getDossierDensityOverlap('spread', 'stack')).toBe(0);
    expect(getDossierStackSlots({
      activeIndex: 1,
      appearance: 'stack',
      density: 'overlap',
      measurements,
      orientation: 'vertical',
    })).toEqual([0, 34, 194, 228]);
  });

  it('keeps exported geometry helpers finite for non-finite runtime inputs', () => {
    const brokenMeasurements: DossierIndexMeasurement[] = [
      { compactBlockSize: Number.NaN, compactInlineSize: Number.POSITIVE_INFINITY, openInlineSize: Number.POSITIVE_INFINITY },
      { compactBlockSize: -12, compactInlineSize: -10, openInlineSize: Number.NaN },
    ];
    const tuckedOffset = getDossierPieceTuckOffset('top', Number.NaN, Number.POSITIVE_INFINITY, 'loose' as any);
    const slots = getDossierStackSlots({
      activeIndex: Number.NaN,
      appearance: 'accordion' as any,
      density: 'loose' as any,
      expandedIndexes: [Number.POSITIVE_INFINITY],
      measurements: brokenMeasurements,
      orientation: 'diagonal' as any,
    });

    expect(getCompactSize(brokenMeasurements[0], 'horizontal')).toBe(44);
    expect(getCompactSize(brokenMeasurements[1], 'vertical')).toBe(44);
    expect(getDossierDensityOverlap('loose' as any, 'accordion' as any)).toBe(0);
    expect(getDossierIndexReachSize(Number.NaN, Number.POSITIVE_INFINITY)).toBe(0);
    expect(getDossierVisibleGrabSize(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN)).toBe(0);
    expect(tuckedOffset).toEqual({ x: 0, y: 8 });
    expect(slots).toEqual([0, 44]);
    expect(slots.every(Number.isFinite)).toBe(true);
    expect(Object.values(tuckedOffset).every(Number.isFinite)).toBe(true);
  });

  it('can reserve multiple expanded physical slots', () => {
    const measurements: DossierIndexMeasurement[] = [
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 120 },
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 160 },
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 100 },
      { compactBlockSize: 44, compactInlineSize: 44, openInlineSize: 140 },
    ];

    expect(getDossierStackSlots({
      activeIndex: 1,
      appearance: 'stack',
      density: 'overlap',
      expandedIndexes: [0, 2],
      measurements,
      orientation: 'vertical',
    })).toEqual([0, 120, 154, 254]);
  });
});
