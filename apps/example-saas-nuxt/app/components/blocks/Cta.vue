<script setup lang="ts">
defineProps<{
  heading: string
  description?: string
  buttonLabel?: string
  buttonLink?: string
}>()
</script>

<template>
  <CtaBanner />
  <!-- In a full implementation, you'd pass these props to CtaBanner -->
</template>
