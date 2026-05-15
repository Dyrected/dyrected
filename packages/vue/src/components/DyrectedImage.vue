<template>
  <img
    v-if="typeof media === 'string'"
    :src="media"
    :width="width || 500"
    :height="height || 500"
    :alt="alt || ''"
    v-bind="$attrs"
  />
  <img
    v-else
    :src="media.url"
    :width="width || media.width || 500"
    :height="height || media.height || 500"
    :alt="alt || media.filename"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import type { Media } from '@dyrected/sdk';

defineProps<{
  media: Media | string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}>();
</script>
