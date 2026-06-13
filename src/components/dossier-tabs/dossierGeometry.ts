import type {
  DossierIndexAppearance,
  DossierIndexDensity,
  DossierIndexEdge,
  DossierIndexOrientation,
} from './dossierTabs';
import {
  normalizeDossierIndexAppearance,
  normalizeDossierIndexDensity,
  normalizeDossierIndexOrientation,
} from './dossierTabs';

export interface DossierEdgeVector {
  axis: 'x' | 'y';
  sign: -1 | 1;
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

export interface DossierIndexMeasurement {
  compactBlockSize: number;
  compactInlineSize: number;
  openInlineSize: number;
}

export interface DossierStackSlotOptions {
  activeIndex: number;
  appearance: DossierIndexAppearance;
  density: DossierIndexDensity;
  expandedIndexes?: readonly number[];
  measurements: readonly DossierIndexMeasurement[];
  orientation: DossierIndexOrientation;
}

export const dossierFallbackTabMeasurement: DossierIndexMeasurement = {
  compactBlockSize: 44,
  compactInlineSize: 44,
  openInlineSize: 156,
};

export const dossierMinimumVisibleGrabSize = 52;
export const dossierSideMinimumVisibleGrabSize = 120;
export const dossierPullDistance = 0;
export const dossierTuckBaseDistance = 8;
export const dossierTuckDepthStep = 7;
export const dossierDenseTuckBaseDistance = 7;
export const dossierDenseTuckDepthStep = 5;
export const dossierTuckRotationBaseDegrees = 0.42;
export const dossierTuckRotationStepDegrees = 0.18;
export const dossierTuckRotationMaxDegrees = 1.35;

export function getDossierEdgeVector(edge: DossierIndexEdge): DossierEdgeVector {
  if (edge === 'left') {
    return { axis: 'x', sign: -1, x: -1, y: 0 };
  }

  if (edge === 'right') {
    return { axis: 'x', sign: 1, x: 1, y: 0 };
  }

  if (edge === 'bottom') {
    return { axis: 'y', sign: 1, x: 0, y: 1 };
  }

  return { axis: 'y', sign: -1, x: 0, y: -1 };
}

export function getDossierDensityOverlap(
  density: DossierIndexDensity,
  _appearance: DossierIndexAppearance,
): number {
  const normalizedDensity = normalizeDossierIndexDensity(density);

  if (normalizedDensity === 'dense') {
    return 18;
  }

  if (normalizedDensity === 'overlap') {
    return 10;
  }

  return 0;
}

export function getDossierStackSlots(options: DossierStackSlotOptions): number[] {
  const activeIndex = normalizeDossierIndex(options.activeIndex);
  const orientation = normalizeDossierIndexOrientation(options.orientation);
  const overlap = getDossierDensityOverlap(
    normalizeDossierIndexDensity(options.density),
    normalizeDossierIndexAppearance(options.appearance),
  );
  const expandedIndexes = new Set(
    (options.expandedIndexes ?? [activeIndex]).map(normalizeDossierIndex),
  );
  let position = 0;

  return options.measurements.map((measurement, index) => {
    const compactSize = getCompactSize(measurement, orientation);
    const compactStep = Math.max(compactSize - overlap, 18);
    const slot = position;
    const openSize = Math.max(readMeasurementSize(measurement.openInlineSize, compactSize), compactSize);

    position += expandedIndexes.has(index)
      ? Math.max(openSize, compactStep)
      : compactStep;

    return slot;
  });
}

export function getCompactSize(
  measurement: DossierIndexMeasurement | undefined,
  orientation: DossierIndexOrientation,
): number {
  const fallback = dossierFallbackTabMeasurement;
  const normalizedOrientation = normalizeDossierIndexOrientation(orientation);
  const size = normalizedOrientation === 'vertical'
    ? measurement?.compactBlockSize
    : measurement?.compactInlineSize;

  const fallbackSize = normalizedOrientation === 'vertical'
    ? fallback.compactBlockSize
    : fallback.compactInlineSize;

  return Math.max(readMeasurementSize(size, fallbackSize), 32);
}

export function getDossierIndexReachSize(
  compactSize: number,
  tuckedDistance: number,
  minimumGrabSize = compactSize,
  occludingDistance = 0,
): number {
  const normalizedCompactSize = normalizePositiveNumber(compactSize);
  const normalizedTuckedDistance = normalizePositiveNumber(tuckedDistance);
  const normalizedMinimumGrabSize = normalizePositiveNumber(minimumGrabSize);
  const normalizedOccludingDistance = normalizePositiveNumber(occludingDistance);

  return Math.max(
    normalizedCompactSize,
    normalizedTuckedDistance + normalizedOccludingDistance + normalizedMinimumGrabSize,
  );
}

export function getDossierVisibleGrabSize(
  reachSize: number,
  tuckedDistance: number,
  occludingDistance = 0,
): number {
  return Math.max(
    normalizePositiveNumber(reachSize)
      - normalizePositiveNumber(tuckedDistance)
      - normalizePositiveNumber(occludingDistance),
    0,
  );
}

export function getDossierMinimumGrabSize(
  compactSize: number,
  minimumVisibleSize = dossierMinimumVisibleGrabSize,
): number {
  return Math.max(
    normalizePositiveNumber(compactSize),
    normalizePositiveNumber(minimumVisibleSize),
  );
}

export function getDossierMinimumVisibleGrabSize(edge: DossierIndexEdge): number {
  return edge === 'left' || edge === 'right'
    ? dossierSideMinimumVisibleGrabSize
    : dossierMinimumVisibleGrabSize;
}

export function getDossierPieceTuckOffset(
  edge: DossierIndexEdge,
  index: number,
  activeIndex: number,
  density: DossierIndexDensity,
): { x: number; y: number } {
  const vector = getDossierEdgeVector(edge);
  const distance = Math.min(Math.abs(normalizeDossierIndex(index) - normalizeDossierIndex(activeIndex)), 6);
  const isDense = normalizeDossierIndexDensity(density) === 'dense';
  const base = isDense ? dossierDenseTuckBaseDistance : dossierTuckBaseDistance;
  const step = isDense ? dossierDenseTuckDepthStep : dossierTuckDepthStep;
  const amount = base + (distance * step);

  return {
    x: vector.x === 0 ? 0 : vector.x * amount * -1,
    y: vector.y === 0 ? 0 : vector.y * amount * -1,
  };
}

export function getDossierTuckRotation(edge: DossierIndexEdge, index: number, activeIndex: number): number {
  const distance = Math.min(Math.abs(normalizeDossierIndex(index) - normalizeDossierIndex(activeIndex)), 6);

  if (distance === 0) {
    return 0;
  }

  const stackSign = normalizeDossierIndex(index) % 2 === 0 ? -1 : 1;
  const edgeMirror = edge === 'right' || edge === 'bottom' ? -1 : 1;
  const amount = Math.min(
    dossierTuckRotationBaseDegrees + (distance * dossierTuckRotationStepDegrees),
    dossierTuckRotationMaxDegrees,
  );

  return roundToPrecision(amount * stackSign * edgeMirror, 2);
}

export function getDossierPullOffset(
  edge: DossierIndexEdge,
  distance = dossierPullDistance,
): { x: number; y: number } {
  const vector = getDossierEdgeVector(edge);
  const amount = normalizeDossierPullDistance(distance);

  return {
    x: vector.x === 0 || amount === 0 ? 0 : vector.x * amount,
    y: vector.y === 0 || amount === 0 ? 0 : vector.y * amount,
  };
}

export function getDossierHoverOffset(edge: DossierIndexEdge): { x: number; y: number } {
  const vector = getDossierEdgeVector(edge);
  const amount = 6;

  return {
    x: vector.x === 0 ? 0 : vector.x * amount,
    y: vector.y === 0 ? 0 : vector.y * amount,
  };
}

function normalizeDossierIndex(value: number): number {
  return Math.max(Math.round(normalizePositiveNumber(value)), 0);
}

export function normalizeDossierPullDistance(value: number | null | undefined): number {
  return normalizePositiveNumber(Number(value));
}

function normalizePositiveNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function roundToPrecision(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function readMeasurementSize(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0
    ? Number(value)
    : fallback;
}
