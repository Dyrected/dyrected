<template>
  <BaseDyrectedMedia v-bind="$props">
    <template #fallback>
      <slot name="fallback" />
    </template>
  </BaseDyrectedMedia>
</template>

<script setup lang="ts">
import { DyrectedMedia as BaseDyrectedMedia } from "@dyrected/vue";
import type { Media } from '@dyrected/sdk';

defineProps<{
  media: Media | string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}>();
</script>
