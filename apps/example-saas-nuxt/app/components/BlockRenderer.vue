<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const props = defineProps<{
  block: {
    blockType: string
    [key: string]: any
  }
}>()

// Map block slugs to components
const blockComponents: Record<string, any> = {
  hero: defineAsyncComponent(() => import('~/components/blocks/Hero.vue')),
  features: defineAsyncComponent(() => import('~/components/blocks/Features.vue')),
  richContent: defineAsyncComponent(() => import("~/components/blocks/RichText.vue")),
  cta: defineAsyncComponent(() => import("~/components/blocks/Cta.vue")),
  pricing: defineAsyncComponent(() => import("~/components/blocks/Pricing.vue")),
  timeline: defineAsyncComponent(() => import("~/components/blocks/Timeline.vue")),
}

const SelectedBlock = computed(() => blockComponents[props.block.blockType])
</script>

<template>
  <component
    :is="SelectedBlock"
    v-if="SelectedBlock"
    v-bind="block"
  />
  <div v-else class="p-12 border-2 border-dashed border-red-500/20 text-red-400 text-center rounded-xl my-8">
    Unknown block type: <strong>{{ block.blockType }}</strong>
  </div>
</template>
