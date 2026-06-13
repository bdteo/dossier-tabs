import { toRaw, type Component } from 'vue';

export type DossierIndexKey = string | number;
export type DossierIndexOrientation = 'horizontal' | 'vertical';
export type DossierIndexKeyboardOrientation = DossierIndexOrientation | 'both';
export type DossierIndexEdge = 'top' | 'right' | 'bottom' | 'left';
export type DossierIndexDensity = 'spread' | 'overlap' | 'dense';
export type DossierIndexActivation = 'automatic' | 'manual';
export type DossierIndexExpandOn = 'active' | 'hover' | 'focus' | 'always';
export type DossierIndexGravity = 'start' | 'center' | 'end';
export type DossierIndexAppearance = 'rail' | 'stack';
export type DossierTrayDepth = 'flat' | 'subtle' | 'raised' | 'deep';
export type DossierFileStackDepth = DossierTrayDepth;
export type DossierTone = 'slate' | 'moss' | 'teal' | 'copper' | 'violet' | 'steel';
export type DossierStackRotation = 'none' | 'files' | 'pieces';
export type DossierIndexRotation = 'straight' | 'rotated';
export type DossierSurfaceTexture = 'none' | 'paper';
export type DossierSurfaceTextureLayer = 'sheet' | 'content' | 'tab';
export type DossierSurfaceTextureLayerPreset = 'all' | 'shell' | 'sheet' | 'content' | 'tab' | 'none';
export type DossierSurfaceTextureLayers = DossierSurfaceTextureLayerPreset | DossierSurfaceTextureLayer[];
export type DossierSurfaceTextColor = 'auto' | 'light' | 'dark' | 'inherit';
export type DossierSurfaceTextureBlendMode =
  | 'auto'
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface DossierIndexItem {
  key: DossierIndexKey;
  label: string;
  shortLabel?: string;
  srLabel?: string;
  edge?: DossierIndexEdge;
  gravity?: DossierIndexGravity;
  tone?: DossierTone;
  tint?: string;
  accent?: string;
  icon?: Component | null;
  count?: string | number | null;
  countLabel?: string | number | null;
  totalCount?: string | number | null;
  disabled?: boolean;
  panelId?: string;
}

const dossierTabEdges = new Set<DossierIndexEdge>(['top', 'right', 'bottom', 'left']);
const dossierTabOrientations = new Set<DossierIndexOrientation>(['horizontal', 'vertical']);
const dossierTabKeyboardOrientations = new Set<DossierIndexKeyboardOrientation>(['horizontal', 'vertical', 'both']);
const dossierTabDensities = new Set<DossierIndexDensity>(['spread', 'overlap', 'dense']);
const dossierTabActivations = new Set<DossierIndexActivation>(['automatic', 'manual']);
const dossierTabExpandModes = new Set<DossierIndexExpandOn>(['active', 'hover', 'focus', 'always']);
const dossierTabGravities = new Set<DossierIndexGravity>(['start', 'center', 'end']);
const dossierTabAppearances = new Set<DossierIndexAppearance>(['rail', 'stack']);
const dossierTrayDepths = new Set<DossierTrayDepth>(['flat', 'subtle', 'raised', 'deep']);
const dossierTones = new Set<DossierTone>(['slate', 'moss', 'teal', 'copper', 'violet', 'steel']);
const dossierStackRotations = new Set<DossierStackRotation>(['none', 'files', 'pieces']);
const dossierTabRotations = new Set<DossierIndexRotation>(['straight', 'rotated']);
const dossierSurfaceTextures = new Set<DossierSurfaceTexture>(['none', 'paper']);
const dossierSurfaceTextureLayers = new Set<DossierSurfaceTextureLayer>(['sheet', 'content', 'tab']);
const dossierSurfaceTextureLayerPresets: Record<DossierSurfaceTextureLayerPreset, DossierSurfaceTextureLayer[]> = {
  all: ['sheet', 'content', 'tab'],
  shell: ['sheet', 'tab'],
  sheet: ['sheet'],
  content: ['content'],
  tab: ['tab'],
  none: [],
};
const dossierSurfaceTextColors = new Set<DossierSurfaceTextColor>(['auto', 'light', 'dark', 'inherit']);
const dossierSurfaceTextureBlendModes = new Set<DossierSurfaceTextureBlendMode>([
  'auto',
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]);

export function normalizeDossierIndex(tabs: unknown): DossierIndexItem[] {
  if (!Array.isArray(tabs)) {
    return [];
  }

  const seenKeys = new Set<string>();

  return tabs.filter((tab): tab is DossierIndexItem => {
    if (!tab || typeof tab !== 'object') {
      return false;
    }

    const candidate = tab as Partial<DossierIndexItem>;

    if (!isDossierIndexKey(candidate.key) || typeof candidate.label !== 'string') {
      return false;
    }

    const normalizedKey = String(candidate.key);

    if (seenKeys.has(normalizedKey)) {
      return false;
    }

    seenKeys.add(normalizedKey);
    return true;
  });
}

function isDossierIndexKey(key: unknown): key is DossierIndexKey {
  return typeof key === 'string'
    || (typeof key === 'number' && Number.isFinite(key));
}

export function normalizeDossierIndexKeyForLookup(key: unknown): string | null {
  return isDossierIndexKey(key) ? String(key) : null;
}

export function getDossierIndexDisplayLabel(tab: Partial<DossierIndexItem> | null | undefined): string {
  return normalizeDossierIndexText(tab?.shortLabel)
    ?? normalizeDossierIndexText(tab?.label)
    ?? '';
}

export function getDossierIndexAccessibleLabel(tab: Partial<DossierIndexItem> | null | undefined): string {
  return normalizeDossierIndexText(tab?.srLabel)
    ?? normalizeDossierIndexText(tab?.label)
    ?? getDossierIndexDisplayLabel(tab);
}

export function getDossierIndexCountLabel(tab: Partial<DossierIndexItem> | null | undefined): string {
  const countLabel = normalizeDossierIndexText(tab?.countLabel, true);

  if (countLabel !== undefined) {
    return countLabel;
  }

  const count = normalizeDossierIndexText(tab?.count, true);

  if (count === undefined || count.length === 0) {
    return '';
  }

  const totalCount = normalizeDossierIndexText(tab?.totalCount, true);

  if (totalCount !== undefined && isGreaterDossierIndexCount(totalCount, count)) {
    return `${count}/${totalCount}`;
  }

  return count;
}

export function hasDossierIndexCount(tab: Partial<DossierIndexItem> | null | undefined): boolean {
  return getDossierIndexCountLabel(tab).length > 0;
}

export function hasLimitedDossierIndexTotal(tab: Partial<DossierIndexItem> | null | undefined): boolean {
  if (normalizeDossierIndexText(tab?.countLabel, true) !== undefined) {
    return false;
  }

  const count = normalizeDossierIndexText(tab?.count, true);
  const totalCount = normalizeDossierIndexText(tab?.totalCount, true);

  return count !== undefined && totalCount !== undefined && isGreaterDossierIndexCount(totalCount, count);
}

export function getDossierIndexTotalCountLabel(tab: Partial<DossierIndexItem> | null | undefined): string {
  return normalizeDossierIndexText(tab?.totalCount, true) ?? '';
}

export function isDossierIndexDisabled(tab: Partial<DossierIndexItem> | null | undefined): boolean {
  return tab?.disabled === true;
}

export function getDossierIndexIcon(tab: Partial<DossierIndexItem> | null | undefined): Component | null {
  const icon = toRaw(tab?.icon);

  if (typeof icon === 'function') {
    return icon;
  }

  if (isDossierIndexIconObject(icon)) {
    return icon as Component;
  }

  return null;
}

export function hasDossierIndexIcon(tab: Partial<DossierIndexItem> | null | undefined): boolean {
  return getDossierIndexIcon(tab) !== null;
}

function normalizeDossierIndexText(value: unknown, preserveEmpty = false): string | undefined {
  if (typeof value === 'string') {
    return preserveEmpty || value.length > 0 ? value : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function isGreaterDossierIndexCount(totalCount: string, count: string): boolean {
  const numericTotal = Number(totalCount);
  const numericCount = Number(count);

  return Number.isFinite(numericTotal) && Number.isFinite(numericCount) && numericTotal > numericCount;
}

function isDossierIndexIconObject(icon: unknown): icon is Record<PropertyKey, unknown> {
  return icon !== null
    && typeof icon === 'object'
    && (
      'render' in icon
      || 'setup' in icon
      || 'template' in icon
      || '__asyncLoader' in icon
    );
}

export function normalizeDossierMotionDuration(duration: number | null | undefined): number {
  const value = Number(duration);

  return Number.isFinite(value)
    ? Math.max(Math.round(value), 0)
    : 0;
}

export function normalizeDossierIndexOrientation(
  orientation: unknown,
  fallback: DossierIndexOrientation = 'horizontal',
): DossierIndexOrientation {
  return dossierTabOrientations.has(orientation as DossierIndexOrientation)
    ? orientation as DossierIndexOrientation
    : fallback;
}

export function normalizeDossierIndexKeyboardOrientation(
  orientation: unknown,
  fallback: DossierIndexKeyboardOrientation = 'both',
): DossierIndexKeyboardOrientation {
  return dossierTabKeyboardOrientations.has(orientation as DossierIndexKeyboardOrientation)
    ? orientation as DossierIndexKeyboardOrientation
    : fallback;
}

export function normalizeDossierIndexDensity(density: unknown): DossierIndexDensity {
  return dossierTabDensities.has(density as DossierIndexDensity)
    ? density as DossierIndexDensity
    : 'spread';
}

export function normalizeDossierIndexActivation(activation: unknown): DossierIndexActivation {
  return dossierTabActivations.has(activation as DossierIndexActivation)
    ? activation as DossierIndexActivation
    : 'automatic';
}

export function normalizeDossierIndexExpandOn(expandOn: unknown): DossierIndexExpandOn {
  return dossierTabExpandModes.has(expandOn as DossierIndexExpandOn)
    ? expandOn as DossierIndexExpandOn
    : 'hover';
}

export function normalizeDossierIndexGravity(gravity: unknown): DossierIndexGravity {
  return dossierTabGravities.has(gravity as DossierIndexGravity)
    ? gravity as DossierIndexGravity
    : 'center';
}

export function normalizeDossierIndexAppearance(appearance: unknown): DossierIndexAppearance {
  return dossierTabAppearances.has(appearance as DossierIndexAppearance)
    ? appearance as DossierIndexAppearance
    : 'rail';
}

export function normalizeDossierTrayDepth(depth: unknown): DossierTrayDepth {
  return dossierTrayDepths.has(depth as DossierTrayDepth)
    ? depth as DossierTrayDepth
    : 'raised';
}

export function normalizeDossierLayerCount(layers: unknown): number {
  const value = Number(layers);

  return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), 2) : 2;
}

export function normalizeDossierActiveIndex(activeIndex: unknown): number {
  const value = Number(activeIndex);

  return Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0;
}

export function normalizeDossierTone(tone: unknown): DossierTone {
  return dossierTones.has(tone as DossierTone)
    ? tone as DossierTone
    : 'slate';
}

export function normalizeDossierStackRotation(rotation: unknown): DossierStackRotation {
  return dossierStackRotations.has(rotation as DossierStackRotation)
    ? rotation as DossierStackRotation
    : 'none';
}

export function normalizeDossierIndexRotation(rotation: unknown): DossierIndexRotation {
  return dossierTabRotations.has(rotation as DossierIndexRotation)
    ? rotation as DossierIndexRotation
    : 'straight';
}

export function normalizeDossierSurfaceTexture(texture: unknown): DossierSurfaceTexture {
  return dossierSurfaceTextures.has(texture as DossierSurfaceTexture)
    ? texture as DossierSurfaceTexture
    : 'none';
}

export function normalizeDossierSurfaceTextureLayers(layers: unknown): DossierSurfaceTextureLayer[] {
  if (Array.isArray(layers)) {
    return dedupeDossierSurfaceTextureLayers(layers);
  }

  if (typeof layers === 'string' && layers in dossierSurfaceTextureLayerPresets) {
    return [...dossierSurfaceTextureLayerPresets[layers as DossierSurfaceTextureLayerPreset]];
  }

  return [...dossierSurfaceTextureLayerPresets.all];
}

function dedupeDossierSurfaceTextureLayers(layers: unknown[]): DossierSurfaceTextureLayer[] {
  const normalized: DossierSurfaceTextureLayer[] = [];

  for (const layer of layers) {
    if (
      dossierSurfaceTextureLayers.has(layer as DossierSurfaceTextureLayer)
      && !normalized.includes(layer as DossierSurfaceTextureLayer)
    ) {
      normalized.push(layer as DossierSurfaceTextureLayer);
    }
  }

  return normalized;
}

export function normalizeDossierSurfaceTextColor(textColor: unknown): DossierSurfaceTextColor {
  return dossierSurfaceTextColors.has(textColor as DossierSurfaceTextColor)
    ? textColor as DossierSurfaceTextColor
    : 'auto';
}

export function normalizeDossierSurfaceTextureBlendMode(blendMode: unknown): DossierSurfaceTextureBlendMode {
  return dossierSurfaceTextureBlendModes.has(blendMode as DossierSurfaceTextureBlendMode)
    ? blendMode as DossierSurfaceTextureBlendMode
    : 'auto';
}

export function getDossierIndexDomId(
  baseId: string,
  tab: Partial<DossierIndexItem> | null | undefined,
  suffix: string,
): string {
  const tabKey = isDossierIndexKey(tab?.key) ? tab.key : 'tab';

  return [
    sanitizeDossierIndexDomIdPart(baseId),
    sanitizeDossierIndexDomIdPart(tabKey),
    hashDossierIndexDomIdPart(tabKey),
    sanitizeDossierIndexDomIdPart(suffix),
  ].filter(Boolean).join('-');
}

function sanitizeDossierIndexDomIdPart(value: DossierIndexKey | string): string {
  const normalized = String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return normalized.replace(/^-+|-+$/g, '') || 'dossier-index';
}

function hashDossierIndexDomIdPart(value: DossierIndexKey | string): string {
  const text = String(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function getAdjacentDossierIndexKey(
  tabs: readonly DossierIndexItem[],
  currentKey: DossierIndexKey | null | undefined,
  direction: number,
): DossierIndexKey | null {
  const normalizedTabs = normalizeDossierIndex(tabs).filter((tab) => !isDossierIndexDisabled(tab));

  if (normalizedTabs.length === 0) {
    return null;
  }

  const normalizedCurrentKey = normalizeDossierIndexKeyForLookup(currentKey);
  const currentIndex = normalizedCurrentKey === null
    ? -1
    : normalizedTabs.findIndex((tab) => String(tab.key) === normalizedCurrentKey);
  if (currentIndex === -1) {
    return direction > 0
      ? normalizedTabs[0]?.key ?? null
      : normalizedTabs.at(-1)?.key ?? null;
  }

  const nextIndex = direction > 0
    ? Math.min(currentIndex + 1, normalizedTabs.length - 1)
    : Math.max(currentIndex - 1, 0);

  return normalizedTabs[nextIndex]?.key ?? null;
}

export function getFirstDossierIndexKey(tabs: readonly DossierIndexItem[]): DossierIndexKey | null {
  return normalizeDossierIndex(tabs).find((tab) => !isDossierIndexDisabled(tab))?.key ?? null;
}

export function getLastDossierIndexKey(tabs: readonly DossierIndexItem[]): DossierIndexKey | null {
  return normalizeDossierIndex(tabs).filter((tab) => !isDossierIndexDisabled(tab)).at(-1)?.key ?? null;
}

export function normalizeDossierIndexEdge(
  edge: unknown,
  orientation: unknown = 'horizontal',
): DossierIndexEdge {
  if (edge && dossierTabEdges.has(edge as DossierIndexEdge)) {
    return edge as DossierIndexEdge;
  }

  return normalizeDossierIndexOrientation(orientation) === 'horizontal' ? 'top' : 'left';
}

export function getDossierIndexOrientationForEdge(edge: unknown): DossierIndexOrientation {
  const normalizedEdge = dossierTabEdges.has(edge as DossierIndexEdge)
    ? edge as DossierIndexEdge
    : 'top';

  return normalizedEdge === 'left' || normalizedEdge === 'right' ? 'vertical' : 'horizontal';
}

export function getDossierIndexNavigationTarget(
  tabs: readonly DossierIndexItem[],
  currentKey: DossierIndexKey | null | undefined,
  key: string,
  orientation: unknown = 'both',
): DossierIndexKey | null {
  const keyActions: Record<string, () => DossierIndexKey | null> = {};
  const normalizedOrientation = normalizeDossierIndexKeyboardOrientation(orientation);

  if (normalizedOrientation === 'horizontal' || normalizedOrientation === 'both') {
    keyActions.ArrowRight = () => getAdjacentDossierIndexKey(tabs, currentKey, 1);
    keyActions.ArrowLeft = () => getAdjacentDossierIndexKey(tabs, currentKey, -1);
  }

  if (normalizedOrientation === 'vertical' || normalizedOrientation === 'both') {
    keyActions.ArrowDown = () => getAdjacentDossierIndexKey(tabs, currentKey, 1);
    keyActions.ArrowUp = () => getAdjacentDossierIndexKey(tabs, currentKey, -1);
  }

  keyActions.Home = () => getFirstDossierIndexKey(tabs);
  keyActions.End = () => getLastDossierIndexKey(tabs);

  return keyActions[key]?.() ?? null;
}
