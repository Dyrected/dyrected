<template>
  <ClientOnly>
    <DyrectedAdmin basename="/cms" />
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});
</script>
