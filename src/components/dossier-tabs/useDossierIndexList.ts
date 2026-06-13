import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';
import {
  getDossierIndexAccessibleLabel,
  getDossierIndexCountLabel,
  getDossierIndexDisplayLabel,
  getDossierIndexDomId,
  getDossierIndexNavigationTarget,
  getDossierIndexTotalCountLabel,
  isDossierIndexDisabled,
  normalizeDossierIndexKeyForLookup,
  normalizeDossierIndexEdge,
  normalizeDossierIndexKeyboardOrientation,
  normalizeDossierIndexOrientation,
  normalizeDossierIndex,
  type DossierIndexEdge,
  type DossierIndexItem,
  type DossierIndexKeyboardOrientation,
  type DossierIndexKey,
  type DossierIndexOrientation,
} from './dossierTabs';

interface DossierIndexListProps {
  tabs: DossierIndexItem[];
  modelValue?: DossierIndexKey | null;
  orientation?: DossierIndexOrientation;
  edge?: DossierIndexEdge | null;
  panelIdForTab?: ((tab: DossierIndexItem) => string | undefined) | null;
}

interface DossierIndexListOptions {
  generatePanelIds?: boolean;
  idBase?: string | null;
  keyboardOrientation?: (() => DossierIndexKeyboardOrientation) | null;
}

export function useDossierIndexList(props: DossierIndexListProps, options: DossierIndexListOptions = {}) {
  const tabRefs = new Map<string, HTMLButtonElement>();
  const focusedKey = ref<string | null>(null);
  let isUnmounted = false;

  const visibleTabs = computed(() => normalizeDossierIndex(props.tabs));
  const requestedActiveKey = computed(() => normalizeDossierIndexKeyForLookup(props.modelValue));
  const normalizedOrientation = computed(() => normalizeDossierIndexOrientation(props.orientation));
  const normalizedEdge = computed(() => normalizeDossierIndexEdge(props.edge, normalizedOrientation.value));
  const focusableTabs = computed(() => visibleTabs.value.filter((tab) => !isDossierIndexDisabled(tab)));

  const fallbackFocusableKey = computed(() => {
    const firstFocusableTab = focusableTabs.value[0];
    return firstFocusableTab ? String(firstFocusableTab.key) : null;
  });
  const focusableKeySignature = computed(() => focusableTabs.value.map((tab) => String(tab.key)).join('\u0000'));
  const activeKey = computed(() => normalizeFocusableKey(requestedActiveKey.value) ?? fallbackFocusableKey.value);
  const tabbableKey = computed(() => normalizeFocusableKey(focusedKey.value) ?? activeKey.value ?? fallbackFocusableKey.value);
  const panelIdsByKey = computed<Record<string, string | undefined>>(() => {
    const panelIds: Record<string, string | undefined> = {};
    const reservedPanelIds = new Set<string>();

    for (const tab of visibleTabs.value) {
      panelIds[String(tab.key)] = resolvePanelId(tab, reservedPanelIds);
    }

    return panelIds;
  });

  watch(activeKey, (key) => {
    if (!key) {
      focusedKey.value = null;
      return;
    }

    focusedKey.value = key;
  }, { immediate: true });

  watch(focusableKeySignature, () => {
    focusedKey.value = normalizeFocusableKey(focusedKey.value) ?? activeKey.value ?? fallbackFocusableKey.value;
  });

  onBeforeUnmount(() => {
    isUnmounted = true;
    tabRefs.clear();
  });

  function setTabRef(key: DossierIndexKey, element: Element | ComponentPublicInstance | null): void {
    const normalizedKey = String(key);

    if (!isUnmounted && element instanceof HTMLButtonElement) {
      tabRefs.set(normalizedKey, element);
      return;
    }

    tabRefs.delete(normalizedKey);
  }

  function focusTab(key: DossierIndexKey | null): void {
    const nextKey = normalizeFocusableKey(key);

    if (nextKey === null) {
      return;
    }

    focusedKey.value = nextKey;

    nextTick(() => {
      if (isUnmounted) {
        return;
      }

      tabRefs.get(nextKey)?.focus();
    });
  }

  function getKeyboardTarget(event: KeyboardEvent, tab: DossierIndexItem): DossierIndexKey | null {
    return getDossierIndexNavigationTarget(
      focusableTabs.value,
      tab.key,
      event.key,
      normalizeDossierIndexKeyboardOrientation(options.keyboardOrientation?.() ?? normalizedOrientation.value),
    );
  }

  function isActive(tab: DossierIndexItem): boolean {
    return String(tab.key) === activeKey.value;
  }

  function isTabbable(tab: DossierIndexItem): boolean {
    return !isDossierIndexDisabled(tab) && String(tab.key) === tabbableKey.value;
  }

  function normalizeFocusableKey(key: unknown): string | null {
    const normalizedKey = normalizeDossierIndexKeyForLookup(key);

    if (normalizedKey === null) {
      return null;
    }

    return focusableTabs.value.some((tab) => String(tab.key) === normalizedKey)
      ? normalizedKey
      : null;
  }

  function panelId(tab: DossierIndexItem): string | undefined {
    return panelIdsByKey.value[String(tab.key)];
  }

  function resolvePanelId(tab: DossierIndexItem, reservedPanelIds: Set<string>): string | undefined {
    const panelIdCandidates = [
      normalizePanelId(resolveExternalPanelId(tab)),
      normalizePanelId(tab.panelId),
    ];

    for (const candidate of panelIdCandidates) {
      const reservedPanelId = reservePanelId(candidate, reservedPanelIds);

      if (reservedPanelId) {
        return reservedPanelId;
      }
    }

    return reserveGeneratedPanelId(getGeneratedPanelId(tab), reservedPanelIds);
  }

  function resolveExternalPanelId(tab: DossierIndexItem): unknown {
    return typeof props.panelIdForTab === 'function'
      ? props.panelIdForTab(tab)
      : undefined;
  }

  function tabId(tab: DossierIndexItem): string | undefined {
    return options.idBase ? getDossierIndexDomId(options.idBase, tab, 'tab') : undefined;
  }

  function getGeneratedPanelId(tab: DossierIndexItem): string | undefined {
    return options.idBase && options.generatePanelIds !== false
      ? getDossierIndexDomId(options.idBase, tab, 'panel')
      : undefined;
  }

  function tabAriaLabel(tab: DossierIndexItem): string {
    const label = getDossierIndexAccessibleLabel(tab);
    const count = getDossierIndexCountLabel(tab);

    return count ? `${label}, ${count}` : label;
  }

  return {
    activeKey,
    focusedKey,
    focusableTabs,
    normalizedEdge,
    normalizedOrientation,
    tabbableKey,
    visibleTabs,
    focusTab,
    getKeyboardTarget,
    isActive,
    isTabbable,
    panelId,
    setTabRef,
    tabId,
    tabAriaLabel,
    getDossierIndexCountLabel,
    getDossierIndexDisplayLabel,
    getDossierIndexTotalCountLabel,
  };
}

function normalizePanelId(panelId: unknown): string | undefined {
  if (typeof panelId !== 'string') {
    return undefined;
  }

  const normalizedPanelId = panelId.trim();

  return normalizedPanelId.length > 0 && !/\s/.test(normalizedPanelId)
    ? normalizedPanelId
    : undefined;
}

function reservePanelId(panelId: string | undefined, reservedPanelIds: Set<string>): string | undefined {
  if (!panelId || reservedPanelIds.has(panelId)) {
    return undefined;
  }

  reservedPanelIds.add(panelId);
  return panelId;
}

function reserveGeneratedPanelId(generatedPanelId: string | undefined, reservedPanelIds: Set<string>): string | undefined {
  if (!generatedPanelId) {
    return undefined;
  }

  let candidatePanelId = generatedPanelId;
  let suffix = 2;

  while (reservedPanelIds.has(candidatePanelId)) {
    candidatePanelId = `${generatedPanelId}-${suffix}`;
    suffix += 1;
  }

  reservedPanelIds.add(candidatePanelId);
  return candidatePanelId;
}
