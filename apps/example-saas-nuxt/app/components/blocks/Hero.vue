<script setup lang="ts">
defineProps<{
  heading: string
  subheading?: string
  ctaLabel?: string
  ctaLink?: string
}>()
</script>

<template>
  <HeroSection
    :headline="heading"
    :subheadline="subheading"
    :primaryCta="ctaLabel"
    :primaryCtaTo="ctaLink"
  />
</template>
