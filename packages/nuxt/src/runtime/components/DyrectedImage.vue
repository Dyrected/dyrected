<template>
  <BaseDyrectedImage v-bind="$props" />
</template>

<script setup lang="ts">
import { DyrectedImage as BaseDyrectedImage } from "@dyrected/vue";
import type { Media } from '@dyrected/sdk';

defineProps<{
  media: Media | string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}>();
</script>
