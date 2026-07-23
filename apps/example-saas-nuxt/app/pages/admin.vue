<script setup lang="ts">
definePageMeta({ layout: false });
</script>

<template>
  <div>
    <ClientOnly>
      <AdminPanel />
    </ClientOnly>
  </div>
</template>
