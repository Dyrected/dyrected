<script setup lang="ts">
// DyrectedAdmin is auto-imported by @dyrected/nuxt.
definePageMeta({ layout: false });
</script>

<template>
  <div>
    <ClientOnly>
      <DyrectedAdmin basename="/admin" />
    </ClientOnly>
  </div>
</template>
<style lang="css">
html {
  background-color: #fff;
}
</style>
