<script setup lang="ts">
// Disable Nuxt layout for the admin dashboard
definePageMeta({
  layout: false,
});
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin basename="/cms-admin" />
  </ClientOnly>
</template>
