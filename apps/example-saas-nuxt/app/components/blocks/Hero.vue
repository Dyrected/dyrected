<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  heading: string
  subheading?: string
  ctaLabel?: string
  ctaLink?: string | { url?: string }
}>()

const resolvedCtaLink = computed(() => {
  if (!props.ctaLink) return ''
  if (typeof props.ctaLink === 'string') return props.ctaLink
  return props.ctaLink.url || ''
})
</script>

<template>
  <HeroSection
    :headline="heading"
    :subheadline="subheading"
    :primaryCta="ctaLabel"
    :primaryCtaTo="resolvedCtaLink"
  />
</template>
