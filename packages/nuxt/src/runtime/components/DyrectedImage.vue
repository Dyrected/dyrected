<template>
  <NuxtImg
    :src="src"
    :width="width ?? resolvedWidth"
    :height="height ?? resolvedHeight"
    :alt="alt ?? resolvedAlt"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Media } from "@dyrected/sdk";

// Nuxt renders images through @nuxt/image's <NuxtImg> for optimization, the way
// the Next integration uses next/image. @dyrected/nuxt installs @nuxt/image, so
// <NuxtImg> is always available.
const props = defineProps<{
  media: Media | string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}>();

const src = computed(() => (typeof props.media === "string" ? props.media : props.media.url));
const resolvedWidth = computed(() => (typeof props.media === "string" ? 500 : props.media.width ?? 500));
const resolvedHeight = computed(() => (typeof props.media === "string" ? 500 : props.media.height ?? 500));
const resolvedAlt = computed(() => (typeof props.media === "string" ? "" : props.media.filename));
</script>
