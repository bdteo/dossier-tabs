<script setup lang="ts">
import { computed } from 'vue';
import {
  normalizeDossierSurfaceTextColor,
  normalizeDossierSurfaceTextureBlendMode,
  normalizeDossierSurfaceTextureLayers,
  normalizeDossierSurfaceTexture,
  normalizeDossierTone,
  type DossierSurfaceTextColor,
  type DossierSurfaceTextureBlendMode,
  type DossierSurfaceTextureLayers,
  type DossierSurfaceTexture,
  type DossierTone,
} from './dossierTabs';

const props = withDefaults(defineProps<{
  tone?: DossierTone;
  texture?: DossierSurfaceTexture;
  textureLayers?: DossierSurfaceTextureLayers;
  textureBlendMode?: DossierSurfaceTextureBlendMode;
  textColor?: DossierSurfaceTextColor;
}>(), {
  tone: 'slate',
  texture: 'none',
  textureLayers: 'all',
  textureBlendMode: 'auto',
  textColor: 'auto',
});

const rootClasses = computed(() => [
  'dossier',
  `dossier--tone-${normalizeDossierTone(props.tone)}`,
  `dossier--texture-${normalizeDossierSurfaceTexture(props.texture)}`,
  ...normalizeDossierSurfaceTextureLayers(props.textureLayers).map((layer) => `dossier--texture-layer-${layer}`),
  `dossier--texture-blend-${normalizeDossierSurfaceTextureBlendMode(props.textureBlendMode)}`,
  `dossier--text-color-${normalizeDossierSurfaceTextColor(props.textColor)}`,
]);
</script>

<template>
  <section :class="rootClasses">
    <slot />
  </section>
</template>
