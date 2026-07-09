<template>
  <div v-if="content" v-html="content" />
</template>

<script setup lang="ts">
/**
 * Renders a Dyrected `richText` field value.
 *
 * The field stores an HTML string, so this outputs it via `v-html`. Render only
 * content you trust; sanitize upstream if untrusted users can author it.
 */
defineProps<{
  content?: string | null;
}>();
</script>
