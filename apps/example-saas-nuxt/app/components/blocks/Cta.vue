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

// Field-level data-dy-path attrs for click-to-edit in the live preview. Base
// path ("layout.N") + block-level data-dy-path are provided by <DyrectedBlocks>.
const dyHeading = useDyPath('heading')
const dyDescription = useDyPath('description')
const dyButtonLabel = useDyPath('buttonLabel')
</script>

<template>
  <CtaBanner
    :headline="heading"
    :sub="description"
    :cta="buttonLabel"
    :ctaTo="resolvedButtonLink"
  >
    <template #headline>
      <span v-bind="dyHeading">{{ heading }}</span>
    </template>
    <template v-if="description" #sub>
      <span v-bind="dyDescription">{{ description }}</span>
    </template>
    <template v-if="buttonLabel" #cta>
      <span v-bind="dyButtonLabel">{{ buttonLabel }}</span>
    </template>
  </CtaBanner>
</template>
