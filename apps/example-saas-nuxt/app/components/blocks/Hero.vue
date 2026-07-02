<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  heading: string
  subheading?: string
  /** Media relationship — a populated media object (depth >= 1) or an id/url string. */
  image?: Record<string, any> | string | null
  ctaLabel?: string
  ctaLink?: string | { url?: string }
  /** Presentation variant from the block schema: "centered" (default) or "split". */
  variant?: string
}>()

const resolvedCtaLink = computed(() => {
  if (!props.ctaLink) return ''
  if (typeof props.ctaLink === 'string') return props.ctaLink
  return props.ctaLink.url || ''
})

// The "split" variant left-aligns the hero; anything else stays centered.
const centered = computed(() => props.variant !== 'split')

// Field-level data-dy-path attrs — the base path ("layout.N") is provided by
// <DyrectedBlocks> (which also sets the block-level data-dy-path). So
// useDyPath('heading') → "layout.N.heading", and clicking the headline in the
// live preview focuses the Headline field in the admin.
const dyHeading = useDyPath('heading')
const dySubheading = useDyPath('subheading')
const dyCtaLabel = useDyPath('ctaLabel')
const dyImage = useDyPath('image')
</script>

<template>
  <HeroSection
    :headline="heading"
    :subheadline="subheading"
    :image="image"
    :image-attrs="dyImage"
    :primaryCta="ctaLabel"
    :primaryCtaTo="resolvedCtaLink"
    :centered="centered"
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
