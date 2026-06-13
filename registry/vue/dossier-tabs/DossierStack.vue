<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, useId, watch, type ComponentPublicInstance } from 'vue';
import DossierFile from './DossierFile.vue';
import DossierTray from './DossierTray.vue';
import {
  dossierFallbackTabMeasurement,
  getCompactSize,
  getDossierEdgeVector,
  getDossierHoverOffset,
  getDossierMinimumGrabSize,
  getDossierMinimumVisibleGrabSize,
  getDossierPieceTuckOffset,
  getDossierPullOffset,
  getDossierStackSlots,
  getDossierIndexReachSize,
  getDossierTuckRotation,
  normalizeDossierPullDistance,
  type DossierIndexMeasurement,
} from './dossierGeometry';
import {
  getDossierIndexIcon,
  getDossierIndexOrientationForEdge,
  hasDossierIndexIcon,
  hasDossierIndexCount,
  hasLimitedDossierIndexTotal,
  isDossierIndexDisabled,
  normalizeDossierTrayDepth,
  normalizeDossierIndexEdge,
  normalizeDossierIndexActivation,
  normalizeDossierIndexAppearance,
  normalizeDossierIndexDensity,
  normalizeDossierIndexExpandOn,
  normalizeDossierIndexGravity,
  normalizeDossierIndexKeyForLookup,
  normalizeDossierMotionDuration,
  normalizeDossierStackRotation,
  normalizeDossierSurfaceTextColor,
  normalizeDossierSurfaceTextureBlendMode,
  normalizeDossierSurfaceTextureLayers,
  normalizeDossierSurfaceTexture,
  normalizeDossierTone,
  normalizeDossierIndexRotation,
  type DossierTrayDepth,
  type DossierStackRotation,
  type DossierIndexRotation,
  type DossierSurfaceTextColor,
  type DossierSurfaceTextureBlendMode,
  type DossierSurfaceTextureLayers,
  type DossierSurfaceTexture,
  type DossierIndexActivation,
  type DossierIndexAppearance,
  type DossierIndexDensity,
  type DossierIndexEdge,
  type DossierIndexExpandOn,
  type DossierIndexGravity,
  type DossierIndexItem,
  type DossierIndexKey,
  type DossierIndexOrientation,
  type DossierTone,
} from './dossierTabs';
import { useDossierPullMachine } from './useDossierPullMachine';
import { useDossierIndexList } from './useDossierIndexList';

const props = withDefaults(defineProps<{
  tabs: DossierIndexItem[];
  modelValue?: DossierIndexKey | null;
  orientation?: DossierIndexOrientation;
  edge?: DossierIndexEdge | null;
  density?: DossierIndexDensity;
  activation?: DossierIndexActivation;
  expandOn?: DossierIndexExpandOn;
  gravity?: DossierIndexGravity;
  appearance?: DossierIndexAppearance;
  ariaLabel: string;
  depth?: DossierTrayDepth;
  layers?: number;
  tone?: DossierTone;
  texture?: DossierSurfaceTexture;
  textureLayers?: DossierSurfaceTextureLayers;
  textureBlendMode?: DossierSurfaceTextureBlendMode;
  textColor?: DossierSurfaceTextColor;
  stackRotation?: DossierStackRotation | null;
  tabRotation?: DossierIndexRotation;
  tuckedTilt?: boolean;
  pullDistance?: number;
  pullDuration?: number;
  returnDuration?: number;
  emulatedHoverKey?: DossierIndexKey | null;
  fileClass?: string;
  panelIdForTab?: ((tab: DossierIndexItem) => string | undefined) | null;
}>(), {
  modelValue: null,
  orientation: 'horizontal',
  edge: null,
  density: 'spread',
  activation: 'automatic',
  expandOn: 'hover',
  gravity: 'center',
  appearance: 'rail',
  depth: 'raised',
  layers: 2,
  tone: 'slate',
  texture: 'none',
  textureLayers: 'all',
  textureBlendMode: 'auto',
  textColor: 'auto',
  stackRotation: null,
  tabRotation: 'straight',
  tuckedTilt: false,
  pullDistance: 0,
  pullDuration: 420,
  emulatedHoverKey: null,
  fileClass: '',
  panelIdForTab: null,
});

const emit = defineEmits<{
  'update:modelValue': [key: DossierIndexKey];
  activate: [key: DossierIndexKey, tab: DossierIndexItem];
}>();

type MeasurementSlot = 'compact' | 'open';
type MeasurementRefs = Partial<Record<MeasurementSlot, HTMLButtonElement>>;
type DossierLayout = {
  activeIndex: number;
  edge: DossierIndexEdge;
  gravity: DossierIndexGravity;
  groupSize: number;
  index: number;
  orientation: DossierIndexOrientation;
  slot: number;
};

const dossierEdges: DossierIndexEdge[] = ['top', 'right', 'bottom', 'left'];
const dossierGravities: DossierIndexGravity[] = ['start', 'center', 'end'];
const defaultReturnDurationRatio = 0.75;
const attachmentId = useId();
const tabList = useDossierIndexList(props, {
  idBase: `dossier-stack-${attachmentId}`,
  keyboardOrientation: () => (hasMixedEdges.value ? 'both' : trayOrientation.value),
});
const measurementRefs = new Map<string, MeasurementRefs>();
const measurements = ref<Record<string, DossierIndexMeasurement>>({});
const hoveredKey = ref<string | null>(null);
const focusedKey = ref<string | null>(null);
const selectionHistory = ref<string[]>([]);
const tabOpenBreathingRoom = 16;
const dossierPieceZ = {
  restingBase: 40,
  returning: 240,
  active: 250,
  pulled: 260,
  pulling: 270,
  selecting: 280,
  front: 300,
};
let measureFrame: number | null = null;
let isUnmounted = false;

const activeIndex = computed(() => {
  if (!tabList.activeKey.value) {
    return -1;
  }

  const index = tabList.visibleTabs.value.findIndex((tab) => String(tab.key) === tabList.activeKey.value);
  return index === -1 ? -1 : index;
});

const activeTab = computed(() => (activeIndex.value >= 0
  ? tabList.visibleTabs.value[activeIndex.value] ?? null
  : null));
const normalizedActivation = computed(() => normalizeDossierIndexActivation(props.activation));
const normalizedAppearance = computed(() => normalizeDossierIndexAppearance(props.appearance));
const normalizedDensity = computed(() => normalizeDossierIndexDensity(props.density));
const normalizedDepth = computed(() => normalizeDossierTrayDepth(props.depth));
const normalizedExpandOn = computed(() => normalizeDossierIndexExpandOn(props.expandOn));
const normalizedGravity = computed(() => normalizeDossierIndexGravity(props.gravity));
const normalizedStackRotation = computed(() => (
  props.stackRotation === null || props.stackRotation === undefined
    ? (props.tuckedTilt ? 'pieces' : 'none')
    : normalizeDossierStackRotation(props.stackRotation)
));
const normalizedTabRotation = computed(() => normalizeDossierIndexRotation(props.tabRotation));
const normalizedTexture = computed(() => normalizeDossierSurfaceTexture(props.texture));
const normalizedTextureLayers = computed(() => normalizeDossierSurfaceTextureLayers(props.textureLayers));
const normalizedTextureBlendMode = computed(() => normalizeDossierSurfaceTextureBlendMode(props.textureBlendMode));
const normalizedTextColor = computed(() => normalizeDossierSurfaceTextColor(props.textColor));
const normalizedTone = computed(() => normalizeDossierTone(props.tone));
const effectivePullDistance = computed(() => normalizeDossierPullDistance(props.pullDistance));
const activeEdge = computed(() => activeTab.value
  ? getTabEdge(activeTab.value)
  : tabList.normalizedEdge.value);

const visibleEdges = computed(() => new Set(tabList.visibleTabs.value.map((tab) => getTabEdge(tab))));

const hasMixedEdges = computed(() => visibleEdges.value.size > 1);

const trayOrientation = computed(() => getDossierIndexOrientationForEdge(activeEdge.value));

const rootOrientation = computed(() => (
  hasMixedEdges.value ? tabList.normalizedOrientation.value : trayOrientation.value
));

const rootEdgeClassFlags = computed(() => (
  dossierEdges.reduce<Record<string, boolean>>((classes, edge) => {
    classes[`dossier-stack--has-edge-${edge}`] = visibleEdges.value.has(edge);
    return classes;
  }, {})
));

const tabListAriaOrientation = computed(() => (
  hasMixedEdges.value ? undefined : trayOrientation.value
));

const requestedModelKey = computed(() => normalizeDossierIndexKeyForLookup(props.modelValue));
const emulatedHoverKey = computed(() => normalizeDossierIndexKeyForLookup(props.emulatedHoverKey));

const effectiveHoverKey = computed(() => hoveredKey.value ?? emulatedHoverKey.value);
const effectivePullDuration = computed(() => normalizeDossierMotionDuration(props.pullDuration));
const effectiveReturnDuration = computed(() => (
  props.returnDuration === undefined || props.returnDuration === null
    ? normalizeDossierMotionDuration(effectivePullDuration.value * defaultReturnDurationRatio)
    : normalizeDossierMotionDuration(props.returnDuration)
));

const motion = useDossierPullMachine({
  activeKey: tabList.activeKey,
  pullDuration: () => effectivePullDuration.value,
  returnDuration: () => effectiveReturnDuration.value,
  select: (key, tab) => {
    emit('update:modelValue', key);
    emit('activate', key, tab);
  },
});

const rootClasses = computed(() => [
  'dossier-stack',
  `dossier-stack--${rootOrientation.value}`,
  hasMixedEdges.value
    ? 'dossier-stack--mixed-edge'
    : `dossier-stack--edge-${activeEdge.value}`,
  `dossier-stack--active-edge-${activeEdge.value}`,
  `dossier-stack--density-${normalizedDensity.value}`,
  `dossier-stack--appearance-${normalizedAppearance.value}`,
  `dossier-stack--expand-${normalizedExpandOn.value}`,
  `dossier-stack--activation-${normalizedActivation.value}`,
  `dossier-stack--gravity-${normalizedGravity.value}`,
  `dossier-stack--stack-rotation-${normalizedStackRotation.value}`,
  `dossier-stack--tab-rotation-${normalizedTabRotation.value}`,
  `dossier-stack--texture-${normalizedTexture.value}`,
  ...normalizedTextureLayers.value.map((layer) => `dossier-stack--texture-layer-${layer}`),
  `dossier-stack--texture-blend-${normalizedTextureBlendMode.value}`,
  `dossier-stack--text-color-${normalizedTextColor.value}`,
  {
    'dossier-stack--hover-emulated': emulatedHoverKey.value !== null,
    'dossier-stack--tucked-tilt': normalizedStackRotation.value !== 'none',
    'is-pulled': motion.isPulled.value,
  },
  rootEdgeClassFlags.value,
]);

const rootStyle = computed(() => ({
  '--dossier-motion-duration': `${effectivePullDuration.value}ms`,
  '--dossier-motion-return-duration': `${effectiveReturnDuration.value}ms`,
  '--dossier-motion-ease': 'cubic-bezier(0.32, 0, 0.2, 1)',
  '--dossier-side-stack-reveal': `${Math.max(
    getDossierMinimumVisibleGrabSize('left'),
    getDossierMinimumVisibleGrabSize('right'),
  )}px`,
}));

const tabMeasurements = computed(() => tabList.visibleTabs.value.map((tab) => (
  measurements.value[String(tab.key)] ?? dossierFallbackTabMeasurement
)));

const dossierLayouts = computed<Record<string, DossierLayout>>(() => {
  const layouts: Record<string, DossierLayout> = {};

  for (const edge of dossierEdges) {
    const edgeTabs = tabList.visibleTabs.value
      .map((tab, index) => ({ index, tab }))
      .filter(({ tab }) => getTabEdge(tab) === edge);

    if (edgeTabs.length === 0) {
      continue;
    }

    for (const gravity of dossierGravities) {
      const groupTabs = edgeTabs.filter(({ tab }) => getTabGravity(tab) === gravity);

      if (groupTabs.length === 0) {
        continue;
      }

      const orientation = getDossierIndexOrientationForEdge(edge);
      const activeGroupIndex = groupTabs.findIndex(({ tab }) => tabList.isActive(tab));
      const normalizedActiveIndex = Math.max(activeGroupIndex, 0);
      const expandedIndexes = groupTabs.flatMap(({ tab }, index) => (isTabExpanded(tab) ? [index] : []));
      const groupMeasurements = groupTabs.map(({ index }) => (
        tabMeasurements.value[index] ?? dossierFallbackTabMeasurement
      ));
      const slots = getDossierStackSlots({
        activeIndex: normalizedActiveIndex,
        appearance: normalizedAppearance.value,
        density: normalizedDensity.value,
        expandedIndexes,
        measurements: groupMeasurements,
        orientation,
      });
      const groupSize = getDossierSlotGroupSize(slots, groupMeasurements, expandedIndexes, orientation);

      groupTabs.forEach(({ tab }, index) => {
        layouts[String(tab.key)] = {
          activeIndex: normalizedActiveIndex,
          edge,
          gravity,
          groupSize,
          index,
          orientation,
          slot: slots[index] ?? 0,
        };
      });
    }
  }

  return layouts;
});

const restingStackOrder = computed(() => {
  const orderedKeys = tabList.visibleTabs.value.map((tab) => String(tab.key));

  for (const key of selectionHistory.value) {
    const currentIndex = orderedKeys.indexOf(key);

    if (currentIndex === -1) {
      continue;
    }

    orderedKeys.splice(currentIndex, 1);
    orderedKeys.push(key);
  }

  return orderedKeys;
});

const restingStackIndexes = computed<Record<string, number>>(() => (
  restingStackOrder.value.reduce<Record<string, number>>((indexes, key, index) => {
    indexes[key] = index;
    return indexes;
  }, {})
));

const restingZIndexes = computed<Record<string, number>>(() => (
  restingStackOrder.value.reduce<Record<string, number>>((zIndexes, key, index) => {
    zIndexes[key] = dossierPieceZ.restingBase + index;
    return zIndexes;
  }, {})
));

const activeRestingStackIndex = computed(() => {
  const activeKey = tabList.activeKey.value;

  if (!activeKey) {
    return Math.max(restingStackOrder.value.length - 1, 0);
  }

  return restingStackIndexes.value[activeKey] ?? Math.max(restingStackOrder.value.length - 1, 0);
});

watch(
  [tabList.activeKey, () => tabList.visibleTabs.value.map((tab) => String(tab.key)).join('\u0000')],
  syncSelectionHistory,
  { immediate: true },
);

watch(
  () => tabList.visibleTabs.value.map((tab) => String(tab.key)).join('\u0000'),
  pruneTabState,
);

onMounted(() => {
  isUnmounted = false;
  scheduleMeasure();
  window.addEventListener('resize', scheduleMeasure);
});

onUpdated(() => {
  scheduleMeasure();
});

onBeforeUnmount(() => {
  isUnmounted = true;
  cancelMeasureFrame();

  window.removeEventListener('resize', scheduleMeasure);
});

function setMeasurementRef(
  key: DossierIndexKey,
  slot: MeasurementSlot,
  element: Element | ComponentPublicInstance | null,
): void {
  const normalizedKey = String(key);
  const existing = measurementRefs.get(normalizedKey) ?? {};

  if (element instanceof HTMLButtonElement) {
    existing[slot] = element;
    measurementRefs.set(normalizedKey, existing);
    return;
  }

  delete existing[slot];

  if (existing.compact || existing.open) {
    measurementRefs.set(normalizedKey, existing);
    return;
  }

  measurementRefs.delete(normalizedKey);
}

function scheduleMeasure(): void {
  if (isUnmounted || measureFrame !== null) {
    return;
  }

  measureFrame = window.requestAnimationFrame(() => {
    measureFrame = null;

    if (isUnmounted) {
      return;
    }

    measureTabs();
  });
}

function cancelMeasureFrame(): void {
  if (measureFrame !== null) {
    window.cancelAnimationFrame(measureFrame);
    measureFrame = null;
  }
}

function measureTabs(): void {
  const nextMeasurements: Record<string, DossierIndexMeasurement> = {};

  for (const tab of tabList.visibleTabs.value) {
    const key = String(tab.key);
    const refs = measurementRefs.get(key);
    const compactRect = readElementSize(refs?.compact);
    const openRect = readElementSize(refs?.open);

    nextMeasurements[key] = {
      compactBlockSize: compactRect.blockSize,
      compactInlineSize: compactRect.inlineSize,
      openInlineSize: Math.max(openRect.inlineSize + tabOpenBreathingRoom, compactRect.inlineSize),
    };
  }

  if (JSON.stringify(measurements.value) !== JSON.stringify(nextMeasurements)) {
    measurements.value = nextMeasurements;
  }
}

function readElementSize(element: HTMLButtonElement | undefined): { blockSize: number; inlineSize: number } {
  if (!element) {
    return {
      blockSize: dossierFallbackTabMeasurement.compactBlockSize,
      inlineSize: dossierFallbackTabMeasurement.compactInlineSize,
    };
  }

  const rect = element.getBoundingClientRect();

  return {
    blockSize: readMeasuredSize(
      rect.height,
      readMeasuredSize(element.scrollHeight, dossierFallbackTabMeasurement.compactBlockSize),
    ),
    inlineSize: readMeasuredSize(
      rect.width,
      readMeasuredSize(element.scrollWidth, dossierFallbackTabMeasurement.compactInlineSize),
    ),
  };
}

function readMeasuredSize(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function handleKeydown(event: KeyboardEvent, tab: DossierIndexItem): void {
  if (isDossierIndexDisabled(tab)) {
    return;
  }

  const nextKey = tabList.getKeyboardTarget(event, tab);

  if (nextKey !== null) {
    event.preventDefault();
    event.stopPropagation();

    if (String(nextKey) === String(tab.key)) {
      return;
    }

    tabList.focusTab(nextKey);

    if (normalizedActivation.value === 'automatic') {
      const nextTab = tabList.visibleTabs.value.find((candidate) => String(candidate.key) === String(nextKey));

      if (nextTab) {
        motion.selectDossier(nextTab);
      }
    }

    return;
  }

  if (normalizedActivation.value === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    event.stopPropagation();
    if (isCommittedActiveTab(tab)) {
      return;
    }

    motion.selectDossier(tab);
  }
}

function isTabOpen(tab: DossierIndexItem): boolean {
  return motion.isPulledKey(tab.key) || motion.isPullingKey(tab.key) || motion.isHandoffKey(tab.key);
}

function isTabExpanded(tab: DossierIndexItem): boolean {
  return normalizedExpandOn.value === 'always'
    || isTabOpen(tab)
    || (normalizedExpandOn.value === 'active' && tabList.isActive(tab))
    || (normalizedExpandOn.value === 'hover' && isHovered(tab))
    || (normalizedExpandOn.value === 'focus' && isFocused(tab));
}

function isReturning(tab: DossierIndexItem): boolean {
  return motion.isReturningKey(tab.key);
}

function isTucked(tab: DossierIndexItem): boolean {
  return !tabList.isActive(tab)
    && !motion.isSelectingKey(tab.key)
    && !motion.isPullingKey(tab.key)
    && !motion.isPulledKey(tab.key)
    && !isReturning(tab);
}

function isHovered(tab: DossierIndexItem): boolean {
  return !tabList.isActive(tab) && effectiveHoverKey.value === String(tab.key) && !isDossierIndexDisabled(tab);
}

function isFocused(tab: DossierIndexItem): boolean {
  return !tabList.isActive(tab) && focusedKey.value === String(tab.key) && !isDossierIndexDisabled(tab);
}

function isEmulatedHovered(tab: DossierIndexItem): boolean {
  return hoveredKey.value === null && isHovered(tab);
}

function dossierTone(tab: DossierIndexItem): DossierTone {
  return normalizeDossierTone(tab.tone ?? normalizedTone.value);
}

function dossierCustomColorStyle(tab: DossierIndexItem): Record<string, string> {
  const style: Record<string, string> = {};
  const tint = normalizeDossierCustomColor(tab.tint);
  const accent = normalizeDossierCustomColor(tab.accent);

  if (tint) {
    style['--dossier-tint'] = tint;
  }

  if (accent) {
    style['--dossier-accent'] = accent;
  }

  return style;
}

function normalizeDossierCustomColor(color: unknown): string | null {
  return typeof color === 'string' && color.trim() !== ''
    ? color.trim()
    : null;
}

function fileClasses(tab: DossierIndexItem): Array<string | Record<string, boolean>> {
  const layout = getDossierLayout(tab);

  return [
    'dossier-stack__file',
    `dossier-stack__file--${layout.orientation}`,
    `dossier-stack__file--edge-${layout.edge}`,
    `dossier-stack__file--gravity-${layout.gravity}`,
    {
      'is-active': tabList.isActive(tab),
      'is-disabled': isDossierIndexDisabled(tab),
      'is-expanded': isTabExpanded(tab),
      'is-open': isTabOpen(tab),
      'is-pulled': motion.isPulledKey(tab.key),
      'is-pulling': motion.isPullingKey(tab.key),
      'is-returning': isReturning(tab),
      'is-selecting': motion.isSelectingKey(tab.key),
      'is-handoff': motion.isHandoffKey(tab.key),
      'is-tucked': isTucked(tab),
      'is-hovered': isHovered(tab),
      'is-focused': isFocused(tab),
      'dossier-stack__file--hover-emulated': isEmulatedHovered(tab),
    },
  ];
}

function dossierStyle(tab: DossierIndexItem, index: number): Record<string, string | number> {
  const layout = getDossierLayout(tab);
  const restingStackIndex = restingStackIndexes.value[String(tab.key)] ?? layout.index;
  const restOffset = getDossierPieceTuckOffset(
    layout.edge,
    restingStackIndex,
    activeRestingStackIndex.value,
    normalizedDensity.value,
  );
  const hoverOffset = getDossierHoverOffset(layout.edge);
  const pullOffset = getDossierPullOffset(layout.edge, effectivePullDistance.value);
  const zIndex = getPieceZIndex(tab, index);
  const measurement = measurements.value[String(tab.key)] ?? dossierFallbackTabMeasurement;
  const compactSize = getCompactSize(measurement, layout.orientation);
  const isActive = tabList.isActive(tab);
  const actualOffset = getDossierActualOffset(tab, isActive, restOffset, pullOffset);
  const rotation = getDossierPieceRotation(tab, layout.edge, restingStackIndex, isActive);
  const tuckedDistance = isActive ? 0 : Math.max(Math.abs(restOffset.x), Math.abs(restOffset.y));
  const coverDistance = isActive ? 0 : getActiveDossierCoverDistance(layout.edge);
  const minimumVisibleGrabSize = getDossierMinimumVisibleGrabSize(layout.edge);
  const minimumGrabSize = isActive
    ? compactSize
    : getDossierMinimumGrabSize(compactSize, minimumVisibleGrabSize);
  const reachSize = getDossierIndexReachSize(compactSize, tuckedDistance, minimumGrabSize, coverDistance);
  const grabSize = compactSize;

  return {
    '--dossier-piece-index': index,
    '--dossier-piece-slot': `${layout.slot.toFixed(2)}px`,
    '--dossier-index-group-size': `${layout.groupSize.toFixed(2)}px`,
    '--dossier-piece-x': `${actualOffset.x.toFixed(2)}px`,
    '--dossier-piece-y': `${actualOffset.y.toFixed(2)}px`,
    '--dossier-piece-rotate': `${rotation.toFixed(2)}deg`,
    '--dossier-index-piece-rotate': `${rotation.toFixed(2)}deg`,
    '--dossier-index-counter-rotate': `${(-rotation).toFixed(2)}deg`,
    '--dossier-piece-rest-x': `${restOffset.x.toFixed(2)}px`,
    '--dossier-piece-rest-y': `${restOffset.y.toFixed(2)}px`,
    '--dossier-index-hover-x': `${hoverOffset.x.toFixed(2)}px`,
    '--dossier-index-hover-y': `${hoverOffset.y.toFixed(2)}px`,
    '--dossier-piece-pull-x': `${pullOffset.x.toFixed(2)}px`,
    '--dossier-piece-pull-y': `${pullOffset.y.toFixed(2)}px`,
    '--dossier-attached-tab-grab-size': `${grabSize.toFixed(2)}px`,
    '--dossier-attached-tab-reach-size': `${reachSize.toFixed(2)}px`,
    '--dossier-piece-z': zIndex,
    ...dossierCustomColorStyle(tab),
  };
}

function getDossierPieceRotation(
  tab: DossierIndexItem,
  edge: DossierIndexEdge,
  restingStackIndex: number,
  isActive: boolean,
): number {
  if (
    normalizedStackRotation.value === 'none'
    || isActive
    || motion.isSelectingKey(tab.key)
    || motion.isPullingKey(tab.key)
    || motion.isPulledKey(tab.key)
    || motion.isHandoffKey(tab.key)
  ) {
    return 0;
  }

  return getDossierTuckRotation(edge, restingStackIndex, activeRestingStackIndex.value);
}

function getDossierActualOffset(
  tab: DossierIndexItem,
  isActive: boolean,
  restOffset: { x: number; y: number },
  pullOffset: { x: number; y: number },
): { x: number; y: number } {
  if (
    motion.isSelectingKey(tab.key)
    || motion.isPullingKey(tab.key)
    || motion.isPulledKey(tab.key)
  ) {
    return pullOffset;
  }

  if (isActive) {
    return { x: 0, y: 0 };
  }

  return restOffset;
}

function tabStyle(tab: DossierIndexItem): Record<string, string | number> {
  const layout = getDossierLayout(tab);
  const measurement = measurements.value[String(tab.key)] ?? dossierFallbackTabMeasurement;
  const compactSize = getCompactSize(measurement, layout.orientation);
  const openSize = Math.max(measurement.openInlineSize, compactSize);

  return {
    '--dossier-index-slot': `${layout.slot.toFixed(2)}px`,
    '--dossier-attached-tab-compact-size': `${compactSize.toFixed(2)}px`,
    '--dossier-attached-tab-open-size': `${openSize.toFixed(2)}px`,
  };
}

function getDossierLayout(tab: DossierIndexItem): DossierLayout {
  return dossierLayouts.value[String(tab.key)] ?? {
    activeIndex: activeIndex.value,
    edge: tabList.normalizedEdge.value,
    gravity: getTabGravity(tab),
    groupSize: 0,
    index: tabList.visibleTabs.value.findIndex((candidate) => String(candidate.key) === String(tab.key)),
    orientation: tabList.normalizedOrientation.value,
    slot: 0,
  };
}

function getTabEdge(tab: DossierIndexItem): DossierIndexEdge {
  return normalizeDossierIndexEdge(tab.edge ?? props.edge, tabList.normalizedOrientation.value);
}

function getTabGravity(tab: DossierIndexItem): DossierIndexGravity {
  if (tab.gravity !== undefined) {
    return normalizeDossierIndexGravity(tab.gravity);
  }

  const fallbackGravity = normalizeDossierIndexGravity(props.gravity);
  return fallbackGravity === 'center' ? 'start' : fallbackGravity;
}

function getDossierSlotGroupSize(
  slots: readonly number[],
  groupMeasurements: readonly DossierIndexMeasurement[],
  expandedIndexes: readonly number[],
  orientation: DossierIndexOrientation,
): number {
  const expandedIndexSet = new Set(expandedIndexes);

  return groupMeasurements.reduce((size, measurement, index) => {
    const compactSize = getCompactSize(measurement, orientation);
    const tabSize = expandedIndexSet.has(index)
      ? Math.max(measurement.openInlineSize, compactSize)
      : compactSize;

    return Math.max(size, (slots[index] ?? 0) + tabSize);
  }, 0);
}

function getActiveDossierCoverDistance(edge: DossierIndexEdge): number {
  const active = activeTab.value;

  if (!active) {
    return 0;
  }

  const edgeVector = getDossierEdgeVector(edge);
  const activePull = getDossierPullOffset(getTabEdge(active), effectivePullDistance.value);
  const projectedCover = (activePull.x * edgeVector.x) + (activePull.y * edgeVector.y);

  return Math.max(projectedCover, 0);
}

function getPieceZIndex(tab: DossierIndexItem, index: number): number {
  if (motion.isFrontKey(tab.key)) {
    return dossierPieceZ.front;
  }

  if (motion.isSelectingKey(tab.key)) {
    return dossierPieceZ.selecting;
  }

  if (motion.isPullingKey(tab.key)) {
    return dossierPieceZ.pulling;
  }

  if (motion.isPulledKey(tab.key)) {
    return dossierPieceZ.pulled;
  }

  if (isReturning(tab)) {
    return dossierPieceZ.returning;
  }

  if (tabList.isActive(tab)) {
    return dossierPieceZ.active;
  }

  return restingZIndexes.value[String(tab.key)] ?? dossierPieceZ.restingBase + index;
}

function syncSelectionHistory(): void {
  const visibleKeys = new Set(tabList.visibleTabs.value.map((tab) => String(tab.key)));
  const activeKey = tabList.activeKey.value;
  const nextHistory = selectionHistory.value.filter((key) => visibleKeys.has(key));

  if (activeKey && visibleKeys.has(activeKey)) {
    const existingIndex = nextHistory.indexOf(activeKey);

    if (existingIndex !== -1) {
      nextHistory.splice(existingIndex, 1);
    }

    nextHistory.push(activeKey);
  }

  if (nextHistory.join('\u0000') !== selectionHistory.value.join('\u0000')) {
    selectionHistory.value = nextHistory;
  }
}

function pruneTabState(): void {
  const visibleKeys = new Set(tabList.visibleTabs.value.map((tab) => String(tab.key)));

  pruneTransientKeys(visibleKeys);
  pruneMeasurementState(visibleKeys);
}

function pruneTransientKeys(visibleKeys: Set<string>): void {
  if (hoveredKey.value && !visibleKeys.has(hoveredKey.value)) {
    hoveredKey.value = null;
  }

  if (focusedKey.value && !visibleKeys.has(focusedKey.value)) {
    focusedKey.value = null;
  }
}

function pruneMeasurementState(visibleKeys: Set<string>): void {
  for (const key of measurementRefs.keys()) {
    if (!visibleKeys.has(key)) {
      measurementRefs.delete(key);
    }
  }

  let prunedMeasurements: Record<string, DossierIndexMeasurement> | null = null;

  for (const key of Object.keys(measurements.value)) {
    if (!visibleKeys.has(key)) {
      prunedMeasurements ??= { ...measurements.value };
      delete prunedMeasurements[key];
    }
  }

  if (prunedMeasurements) {
    measurements.value = prunedMeasurements;
  }
}

function selectDossier(tab: DossierIndexItem): void {
  if (isDossierIndexDisabled(tab)) {
    return;
  }

  if (isCommittedActiveTab(tab)) {
    return;
  }

  tabList.focusedKey.value = String(tab.key);
  motion.selectDossier(tab);
}

function isCommittedActiveTab(tab: DossierIndexItem): boolean {
  const normalizedKey = String(tab.key);

  return tabList.isActive(tab) && requestedModelKey.value === normalizedKey;
}

function setHoveredTab(tab: DossierIndexItem): void {
  if (!isDossierIndexDisabled(tab)) {
    hoveredKey.value = String(tab.key);
  }
}

function clearHoveredTab(tab: DossierIndexItem): void {
  if (hoveredKey.value === String(tab.key)) {
    hoveredKey.value = null;
  }
}

function setFocusedTab(tab: DossierIndexItem): void {
  if (!isDossierIndexDisabled(tab)) {
    focusedKey.value = String(tab.key);
  }
}

function clearFocusedTab(tab: DossierIndexItem): void {
  if (focusedKey.value === String(tab.key)) {
    focusedKey.value = null;
  }
}
</script>

<template>
  <section :class="rootClasses" :style="rootStyle">
    <DossierTray
      class="dossier-stack__tray"
      :style="rootStyle"
      :orientation="trayOrientation"
      :edge="activeEdge"
      :depth="normalizedDepth"
      :layers="props.layers"
      :active-index="activeIndex"
      :tone="normalizedTone"
      :texture="normalizedTexture"
      :texture-layers="normalizedTextureLayers"
      :texture-blend-mode="normalizedTextureBlendMode"
      :text-color="normalizedTextColor"
      :pulled="motion.isPulled.value"
    >
      <div
        class="dossier-stack__stack"
        role="tablist"
        :aria-orientation="tabListAriaOrientation"
        :aria-label="props.ariaLabel"
      >
        <DossierFile
          v-for="(tab, tabIndex) in tabList.visibleTabs.value"
          :key="tab.key"
          :class="fileClasses(tab)"
          :style="dossierStyle(tab, tabIndex)"
          :tone="dossierTone(tab)"
          :texture="normalizedTexture"
          :texture-layers="normalizedTextureLayers"
          :texture-blend-mode="normalizedTextureBlendMode"
          :text-color="normalizedTextColor"
        >
          <div class="dossier-stack__sheet" aria-hidden="true" />

          <button
            :ref="(element) => tabList.setTabRef(tab.key, element)"
            type="button"
            class="dossier-stack__tab"
            :class="{
              'is-active': tabList.isActive(tab),
              'is-disabled': isDossierIndexDisabled(tab),
              'is-open': isTabOpen(tab),
              'is-expanded': isTabExpanded(tab),
              'is-pulled': motion.isPulledKey(tab.key),
              'is-pulling': motion.isPullingKey(tab.key),
              'is-returning': isReturning(tab),
              'is-selecting': motion.isSelectingKey(tab.key),
              'is-handoff': motion.isHandoffKey(tab.key),
              'is-hovered': isHovered(tab),
              'is-focused': isFocused(tab),
              'dossier-stack__tab--hover-emulated': isEmulatedHovered(tab),
              'dossier-stack__tab--has-total': hasLimitedDossierIndexTotal(tab),
            }"
            :style="tabStyle(tab)"
            :id="tabList.tabId(tab)"
            role="tab"
            :aria-selected="tabList.isActive(tab)"
            :aria-controls="tabList.panelId(tab)"
            :aria-label="tabList.tabAriaLabel(tab)"
            :aria-disabled="isDossierIndexDisabled(tab) || undefined"
            :tabindex="tabList.isTabbable(tab) ? 0 : -1"
            @click="selectDossier(tab)"
            @blur="clearFocusedTab(tab)"
            @focus="setFocusedTab(tab)"
            @keydown="handleKeydown($event, tab)"
            @pointerenter="setHoveredTab(tab)"
            @pointerleave="clearHoveredTab(tab)"
          >
            <span class="dossier-stack__tab-icon" aria-hidden="true">
              <slot name="icon" :tab="tab" :active="tabList.isActive(tab)">
                <component :is="getDossierIndexIcon(tab)" v-if="hasDossierIndexIcon(tab)" />
              </slot>
            </span>
            <span class="dossier-stack__tab-label">{{ tabList.getDossierIndexDisplayLabel(tab) }}</span>
            <span v-if="hasDossierIndexCount(tab)" class="dossier-stack__tab-count">
              {{ tabList.getDossierIndexCountLabel(tab) }}
            </span>
            <span v-if="hasLimitedDossierIndexTotal(tab)" class="dossier-stack__tab-lock" aria-hidden="true">
              /{{ tabList.getDossierIndexTotalCountLabel(tab) }}
            </span>
          </button>

          <div
            :id="tabList.panelId(tab)"
            :class="['dossier-stack__content', props.fileClass]"
            role="tabpanel"
            :aria-labelledby="tabList.tabId(tab)"
            :hidden="!tabList.isActive(tab)"
          >
            <slot
              v-if="tabList.isActive(tab)"
              :active-tab="activeTab"
              :active-index="activeIndex"
              :pulled="motion.isPulled.value"
            />
          </div>
        </DossierFile>
      </div>
    </DossierTray>

    <div class="dossier-stack__measurer" aria-hidden="true" inert>
      <template v-for="tab in tabList.visibleTabs.value" :key="tab.key">
        <button
          :ref="(element) => setMeasurementRef(tab.key, 'compact', element)"
          type="button"
          class="dossier-stack__measure-tab dossier-stack__measure-tab--compact"
          tabindex="-1"
        >
          <span class="dossier-stack__tab-icon" aria-hidden="true">
            <component :is="getDossierIndexIcon(tab)" v-if="hasDossierIndexIcon(tab)" />
          </span>
        </button>

        <button
          :ref="(element) => setMeasurementRef(tab.key, 'open', element)"
          type="button"
          class="dossier-stack__measure-tab dossier-stack__measure-tab--open"
          tabindex="-1"
        >
          <span class="dossier-stack__tab-icon" aria-hidden="true">
            <component :is="getDossierIndexIcon(tab)" v-if="hasDossierIndexIcon(tab)" />
          </span>
          <span class="dossier-stack__tab-label">{{ tabList.getDossierIndexDisplayLabel(tab) }}</span>
          <span v-if="hasDossierIndexCount(tab)" class="dossier-stack__tab-count">
            {{ tabList.getDossierIndexCountLabel(tab) }}
          </span>
          <span v-if="hasLimitedDossierIndexTotal(tab)" class="dossier-stack__tab-lock" aria-hidden="true">
            /{{ tabList.getDossierIndexTotalCountLabel(tab) }}
          </span>
        </button>
      </template>
    </div>
  </section>
</template>
