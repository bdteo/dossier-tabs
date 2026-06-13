<script setup lang="ts">
import { computed } from 'vue';
import DossierFile from './DossierFile.vue';
import DossierTray from './DossierTray.vue';
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
  type DossierSurfaceTextColor,
  type DossierSurfaceTextureBlendMode,
  type DossierSurfaceTextureLayers,
  type DossierSurfaceTexture,
  type DossierIndexEdge,
  type DossierIndexOrientation,
  type DossierFileStackDepth,
  type DossierTone,
} from './dossierTabs';

const props = withDefaults(defineProps<{
  orientation?: DossierIndexOrientation;
  edge?: DossierIndexEdge | null;
  depth?: DossierFileStackDepth;
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

const legacyClasses = computed(() => [
  'dossier-file-stack',
  `dossier-file-stack--${physicalOrientation.value}`,
  `dossier-file-stack--edge-${normalizedEdge.value}`,
  `dossier-file-stack--depth-${normalizedDepth.value}`,
  `dossier-file-stack--layers-${boundedLayers.value}`,
  `dossier-file-stack--tone-${normalizedTone.value}`,
  `dossier-file-stack--texture-${normalizedTexture.value}`,
  ...normalizedTextureLayers.value.map((layer) => `dossier-file-stack--texture-layer-${layer}`),
  `dossier-file-stack--texture-blend-${normalizedTextureBlendMode.value}`,
  `dossier-file-stack--text-color-${normalizedTextColor.value}`,
  { 'is-pulled': isPulled.value },
]);
</script>

<template>
  <DossierTray
    :class="legacyClasses"
    :orientation="physicalOrientation"
    :edge="normalizedEdge"
    :depth="normalizedDepth"
    :layers="boundedLayers"
    :active-index="boundedActiveIndex"
    :tone="normalizedTone"
    :texture="normalizedTexture"
    :texture-layers="normalizedTextureLayers"
    :texture-blend-mode="normalizedTextureBlendMode"
    :text-color="normalizedTextColor"
    :pulled="isPulled"
  >
    <DossierFile
      :tone="normalizedTone"
      :texture="normalizedTexture"
      :texture-layers="normalizedTextureLayers"
      :texture-blend-mode="normalizedTextureBlendMode"
      :text-color="normalizedTextColor"
    >
      <slot />
    </DossierFile>
  </DossierTray>
</template>
