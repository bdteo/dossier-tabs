<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, useId, watch, type ComponentPublicInstance } from 'vue';
import {
  getDossierIndexIcon,
  hasDossierIndexIcon,
  hasDossierIndexCount,
  hasLimitedDossierIndexTotal,
  isDossierIndexDisabled,
  normalizeDossierMotionDuration,
  normalizeDossierIndexActivation,
  normalizeDossierIndexAppearance,
  normalizeDossierIndexDensity,
  normalizeDossierIndexExpandOn,
  normalizeDossierIndexGravity,
  normalizeDossierIndexKeyForLookup,
  normalizeDossierSurfaceTextColor,
  normalizeDossierSurfaceTextureBlendMode,
  normalizeDossierSurfaceTextureLayers,
  normalizeDossierSurfaceTexture,
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
} from './dossierTabs';
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
  activationMotionDuration?: number;
  pulledKey?: DossierIndexKey | null;
  texture?: DossierSurfaceTexture;
  textureLayers?: DossierSurfaceTextureLayers;
  textureBlendMode?: DossierSurfaceTextureBlendMode;
  textColor?: DossierSurfaceTextColor;
  ariaLabel: string;
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
  activationMotionDuration: 420,
  pulledKey: null,
  texture: 'none',
  textureLayers: 'all',
  textureBlendMode: 'auto',
  textColor: 'auto',
  panelIdForTab: null,
});

const emit = defineEmits<{
  'update:modelValue': [key: DossierIndexKey];
  activate: [key: DossierIndexKey, tab: DossierIndexItem];
}>();

const tabsId = useId();
const tabList = useDossierIndexList(props, {
  generatePanelIds: false,
  idBase: `dossier-tabs-${tabsId}`,
});
const grabbingKey = ref<string | null>(null);
const recedingKey = ref<string | null>(null);
type MeasurementSlot = 'label' | 'count';
type MeasurementRefs = Partial<Record<MeasurementSlot, HTMLElement>>;
type RailTabMeasurement = {
  countInlineSize: number;
  labelInlineSize: number;
};

const fallbackLabelInlineSize = 88;
const fallbackCountInlineSize = 28;
const measurementRefs = new Map<string, MeasurementRefs>();
const measurements = ref<Record<string, RailTabMeasurement>>({});
let activationMotionTimer: ReturnType<typeof window.setTimeout> | null = null;
let measureFrame: number | null = null;
let isUnmounted = false;

const normalizedActivation = computed(() => normalizeDossierIndexActivation(props.activation));
const normalizedAppearance = computed(() => normalizeDossierIndexAppearance(props.appearance));
const normalizedDensity = computed(() => normalizeDossierIndexDensity(props.density));
const normalizedExpandOn = computed(() => normalizeDossierIndexExpandOn(props.expandOn));
const normalizedGravity = computed(() => normalizeDossierIndexGravity(props.gravity));
const normalizedTexture = computed(() => normalizeDossierSurfaceTexture(props.texture));
const normalizedTextureLayers = computed(() => normalizeDossierSurfaceTextureLayers(props.textureLayers));
const normalizedTextureBlendMode = computed(() => normalizeDossierSurfaceTextureBlendMode(props.textureBlendMode));
const normalizedTextColor = computed(() => normalizeDossierSurfaceTextColor(props.textColor));

const rootClasses = computed(() => [
  'dossier-tabs',
  `dossier-tabs--${tabList.normalizedOrientation.value}`,
  `dossier-tabs--edge-${tabList.normalizedEdge.value}`,
  `dossier-tabs--density-${normalizedDensity.value}`,
  `dossier-tabs--activation-${normalizedActivation.value}`,
  `dossier-tabs--expand-${normalizedExpandOn.value}`,
  `dossier-tabs--gravity-${normalizedGravity.value}`,
  `dossier-tabs--appearance-${normalizedAppearance.value}`,
  `dossier-tabs--texture-${normalizedTexture.value}`,
  ...normalizedTextureLayers.value.map((layer) => `dossier-tabs--texture-layer-${layer}`),
  `dossier-tabs--texture-blend-${normalizedTextureBlendMode.value}`,
  `dossier-tabs--text-color-${normalizedTextColor.value}`,
]);

watch(
  () => tabList.visibleTabs.value.map((tab) => String(tab.key)).join('\u0000'),
  pruneTabState,
);

onBeforeUnmount(() => {
  isUnmounted = true;
  clearActivationMotionTimer();
  cancelMeasureFrame();

  window.removeEventListener('resize', scheduleMeasure);
});

onMounted(() => {
  isUnmounted = false;
  scheduleMeasure();
  window.addEventListener('resize', scheduleMeasure);
});

onUpdated(() => {
  scheduleMeasure();
});

function activateTab(tab: DossierIndexItem): void {
  if (isDossierIndexDisabled(tab)) {
    return;
  }

  if (normalizeDossierIndexKeyForLookup(props.modelValue) === String(tab.key) && tabList.isActive(tab)) {
    tabList.focusedKey.value = String(tab.key);
    return;
  }

  startActivationMotion(tab.key);
  tabList.focusedKey.value = String(tab.key);
  emit('update:modelValue', tab.key);
  emit('activate', tab.key, tab);
}

function startActivationMotion(key: DossierIndexKey): void {
  const nextKey = String(key);

  clearActivationMotionTimer();

  grabbingKey.value = nextKey;
  recedingKey.value = tabList.activeKey.value && tabList.activeKey.value !== nextKey
    ? tabList.activeKey.value
    : null;
  activationMotionTimer = window.setTimeout(() => {
    grabbingKey.value = null;
    recedingKey.value = null;
    activationMotionTimer = null;
  }, normalizeDossierMotionDuration(props.activationMotionDuration));
}

function clearActivationMotionTimer(): void {
  if (activationMotionTimer !== null) {
    window.clearTimeout(activationMotionTimer);
    activationMotionTimer = null;
  }
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
        activateTab(nextTab);
      }
    }

    return;
  }

  if (normalizedActivation.value === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    event.stopPropagation();
    activateTab(tab);
  }
}

function isActive(tab: DossierIndexItem): boolean {
  return tabList.isActive(tab);
}

function isTabbable(tab: DossierIndexItem): boolean {
  return tabList.isTabbable(tab);
}

function isGrabbing(tab: DossierIndexItem): boolean {
  return String(tab.key) === grabbingKey.value;
}

function isPulled(tab: DossierIndexItem): boolean {
  const pulledKey = normalizeDossierIndexKeyForLookup(props.pulledKey);

  return !isDossierIndexDisabled(tab)
    && pulledKey !== null
    && String(tab.key) === pulledKey;
}

function isReceding(tab: DossierIndexItem): boolean {
  return String(tab.key) === recedingKey.value;
}

function pruneTabState(): void {
  const visibleKeys = new Set(tabList.visibleTabs.value.map((tab) => String(tab.key)));

  pruneTransientKeys(visibleKeys);
  pruneMeasurementState(visibleKeys);
}

function pruneTransientKeys(visibleKeys: Set<string>): void {
  const removedGrabbingKey = Boolean(grabbingKey.value && !visibleKeys.has(grabbingKey.value));
  const removedRecedingKey = Boolean(recedingKey.value && !visibleKeys.has(recedingKey.value));

  if (removedGrabbingKey) {
    grabbingKey.value = null;
  }

  if (removedGrabbingKey || removedRecedingKey) {
    recedingKey.value = null;
  }

  if (removedGrabbingKey && recedingKey.value === null) {
    clearActivationMotionTimer();
  }
}

function pruneMeasurementState(visibleKeys: Set<string>): void {
  for (const key of measurementRefs.keys()) {
    if (!visibleKeys.has(key)) {
      measurementRefs.delete(key);
    }
  }

  let prunedMeasurements: Record<string, RailTabMeasurement> | null = null;

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

function tabStyle(tab: DossierIndexItem, index: number): Record<string, string | number> {
  const measurement = measurements.value[String(tab.key)] ?? {
    countInlineSize: hasDossierIndexCount(tab) ? fallbackCountInlineSize : 0,
    labelInlineSize: fallbackLabelInlineSize,
  };
  const activeIndex = tabList.visibleTabs.value.findIndex((candidate) => String(candidate.key) === tabList.activeKey.value);
  const stackDistance = activeIndex === -1 ? index : Math.abs(index - activeIndex);
  const stackOffset = Math.min(stackDistance, 8) * 0.2;
  const stackHoverOffset = Math.max(stackOffset - 0.1, 0);

  return {
    '--dossier-index-index': index,
    '--dossier-index-total': tabList.visibleTabs.value.length,
    '--dossier-index-label-size': `${measurement.labelInlineSize.toFixed(2)}px`,
    '--dossier-index-count-size': hasDossierIndexCount(tab)
      ? `${measurement.countInlineSize.toFixed(2)}px`
      : '0px',
    '--dossier-index-lock-size': hasLimitedDossierIndexTotal(tab) ? '1rem' : '0rem',
    '--dossier-index-stack-left-offset': `-${stackOffset.toFixed(2)}rem`,
    '--dossier-index-stack-left-hover-offset': `-${stackHoverOffset.toFixed(2)}rem`,
    '--dossier-index-stack-right-offset': `${stackOffset.toFixed(2)}rem`,
    '--dossier-index-stack-right-hover-offset': `${stackHoverOffset.toFixed(2)}rem`,
  };
}

function setMeasurementRef(
  key: DossierIndexKey,
  slot: MeasurementSlot,
  element: Element | ComponentPublicInstance | null,
): void {
  const normalizedKey = String(key);
  const existing = measurementRefs.get(normalizedKey) ?? {};

  if (element instanceof HTMLElement) {
    existing[slot] = element;
    measurementRefs.set(normalizedKey, existing);
    return;
  }

  delete existing[slot];

  if (existing.label || existing.count) {
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
  const nextMeasurements: Record<string, RailTabMeasurement> = {};

  for (const tab of tabList.visibleTabs.value) {
    const key = String(tab.key);
    const refs = measurementRefs.get(key);

    nextMeasurements[key] = {
      countInlineSize: hasDossierIndexCount(tab)
        ? readInlineSize(refs?.count, fallbackCountInlineSize)
        : 0,
      labelInlineSize: readInlineSize(refs?.label, fallbackLabelInlineSize),
    };
  }

  if (JSON.stringify(measurements.value) !== JSON.stringify(nextMeasurements)) {
    measurements.value = nextMeasurements;
  }
}

function readInlineSize(element: HTMLElement | undefined, fallback: number): number {
  if (!element) {
    return fallback;
  }

  const rect = element.getBoundingClientRect();

  return Math.ceil(
    readMeasuredSize(element.scrollWidth, readMeasuredSize(rect.width, fallback)),
  );
}

function readMeasuredSize(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
</script>

<template>
  <div
    :class="rootClasses"
    role="tablist"
    :aria-orientation="tabList.normalizedOrientation.value"
    :aria-label="props.ariaLabel"
  >
    <button
      v-for="(tab, tabIndex) in tabList.visibleTabs.value"
      :key="tab.key"
      :ref="(element) => tabList.setTabRef(tab.key, element)"
      type="button"
      class="dossier-tabs__tab"
      :class="{
        'is-active': isActive(tab),
        'is-disabled': isDossierIndexDisabled(tab),
        'is-grabbing': isGrabbing(tab),
        'is-pulled': isPulled(tab),
        'is-receding': isReceding(tab),
      }"
      :style="tabStyle(tab, tabIndex)"
      :id="tabList.tabId(tab)"
      role="tab"
      :aria-selected="isActive(tab)"
      :aria-controls="tabList.panelId(tab)"
      :aria-label="tabList.tabAriaLabel(tab)"
      :aria-disabled="isDossierIndexDisabled(tab) || undefined"
      :tabindex="isTabbable(tab) ? 0 : -1"
      @click="activateTab(tab)"
      @keydown="handleKeydown($event, tab)"
    >
      <span class="dossier-tabs__icon" aria-hidden="true">
        <slot name="icon" :tab="tab" :active="isActive(tab)">
          <component :is="getDossierIndexIcon(tab)" v-if="hasDossierIndexIcon(tab)" />
        </slot>
      </span>
      <span
        :ref="(element) => setMeasurementRef(tab.key, 'label', element)"
        class="dossier-tabs__label"
      >
        {{ tabList.getDossierIndexDisplayLabel(tab) }}
      </span>
      <span
        v-if="hasDossierIndexCount(tab)"
        :ref="(element) => setMeasurementRef(tab.key, 'count', element)"
        class="dossier-tabs__count"
      >
        {{ tabList.getDossierIndexCountLabel(tab) }}
      </span>
      <svg
        v-if="hasLimitedDossierIndexTotal(tab)"
        class="dossier-tabs__lock"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>
  </div>
</template>
