<script setup lang="ts">
import { computed } from 'vue';
import {
  getDossierIndexOrientationForEdge,
  normalizeDossierActiveIndex,
  normalizeDossierTrayDepth,
  normalizeDossierLayerCount,
  normalizeDossierSurfaceTextColor,
  normalizeDossierSurfaceTextureBlendMode,
  normalizeDossierSurfaceTextureLayers,
  normalizeDossierSurfaceTexture,
  normalizeDossierIndexEdge,
  normalizeDossierIndexOrientation,
  normalizeDossierTone,
  type DossierTrayDepth,
  type DossierSurfaceTextColor,
  type DossierSurfaceTextureBlendMode,
  type DossierSurfaceTextureLayers,
  type DossierSurfaceTexture,
  type DossierIndexEdge,
  type DossierIndexOrientation,
  type DossierTone,
} from './dossierTabs';

const props = withDefaults(defineProps<{
  orientation?: DossierIndexOrientation;
  edge?: DossierIndexEdge | null;
  depth?: DossierTrayDepth;
  layers?: number;
  activeIndex?: number;
  tone?: DossierTone;
  texture?: DossierSurfaceTexture;
  textureLayers?: DossierSurfaceTextureLayers;
  textureBlendMode?: DossierSurfaceTextureBlendMode;
  textColor?: DossierSurfaceTextColor;
  pulled?: boolean;
}>(), {
  orientation: 'horizontal',
  edge: null,
  depth: 'raised',
  layers: 2,
  activeIndex: 0,
  tone: 'slate',
  texture: 'none',
  textureLayers: 'all',
  textureBlendMode: 'auto',
  textColor: 'auto',
  pulled: false,
});

const normalizedOrientation = computed(() => normalizeDossierIndexOrientation(props.orientation));
const normalizedEdge = computed(() => normalizeDossierIndexEdge(props.edge, normalizedOrientation.value));
const physicalOrientation = computed(() => getDossierIndexOrientationForEdge(normalizedEdge.value));
const normalizedDepth = computed(() => normalizeDossierTrayDepth(props.depth));
const normalizedTone = computed(() => normalizeDossierTone(props.tone));
const normalizedTexture = computed(() => normalizeDossierSurfaceTexture(props.texture));
const normalizedTextureLayers = computed(() => normalizeDossierSurfaceTextureLayers(props.textureLayers));
const normalizedTextureBlendMode = computed(() => normalizeDossierSurfaceTextureBlendMode(props.textureBlendMode));
const normalizedTextColor = computed(() => normalizeDossierSurfaceTextColor(props.textColor));
const boundedLayers = computed(() => normalizeDossierLayerCount(props.layers));
const boundedActiveIndex = computed(() => normalizeDossierActiveIndex(props.activeIndex));
const isPulled = computed(() => props.pulled === true);

const rootClasses = computed(() => [
  'dossier-tray',
  `dossier-tray--${physicalOrientation.value}`,
  `dossier-tray--edge-${normalizedEdge.value}`,
  `dossier-tray--depth-${normalizedDepth.value}`,
  `dossier-tray--layers-${boundedLayers.value}`,
  `dossier-tray--tone-${normalizedTone.value}`,
  `dossier-tray--texture-${normalizedTexture.value}`,
  ...normalizedTextureLayers.value.map((layer) => `dossier-tray--texture-layer-${layer}`),
  `dossier-tray--texture-blend-${normalizedTextureBlendMode.value}`,
  `dossier-tray--text-color-${normalizedTextColor.value}`,
  { 'is-pulled': isPulled.value },
]);

const rootStyle = computed(() => ({
  '--dossier-tray-active-index': boundedActiveIndex.value,
  '--dossier-index-panel-active-index': boundedActiveIndex.value,
}));
</script>

<template>
  <div :class="rootClasses" :style="rootStyle">
    <slot />
  </div>
</template>
