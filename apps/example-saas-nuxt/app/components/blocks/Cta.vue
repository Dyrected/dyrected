<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  heading: string
  description?: string
  buttonLabel?: string
  buttonLink?: string | { url?: string }
}>()

const resolvedButtonLink = computed(() => {
  if (!props.buttonLink) return ''
  if (typeof props.buttonLink === 'string') return props.buttonLink
  return props.buttonLink.url || ''
})
</script>

<template>
  <CtaBanner
    :headline="heading"
    :sub="description"
    :cta="buttonLabel"
    :ctaTo="resolvedButtonLink"
  />
</template>
