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

// Field-level data-dy-path attrs — the base path ("layout.N") is provided by
// <DyrectedBlocks> (which also sets the block-level data-dy-path). So
// useDyPath('heading') → "layout.N.heading", and clicking the headline in the
// live preview focuses the Headline field in the admin.
const dyHeading = useDyPath('heading')
const dySubheading = useDyPath('subheading')
const dyCtaLabel = useDyPath('ctaLabel')
</script>

<template>
  <HeroSection
    :headline="heading"
    :subheadline="subheading"
    :primaryCta="ctaLabel"
    :primaryCtaTo="resolvedCtaLink"
  >
    <template #headline>
      <span v-bind="dyHeading">{{ heading }}</span>
    </template>
    <template v-if="subheading" #subheadline>
      <span v-bind="dySubheading">{{ subheading }}</span>
    </template>
    <template v-if="ctaLabel" #primaryCta>
      <span v-bind="dyCtaLabel">{{ ctaLabel }}</span>
    </template>
  </HeroSection>
</template>
