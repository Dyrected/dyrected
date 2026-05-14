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
  logos: defineAsyncComponent(() => import("~/components/blocks/Logos.vue")),
  stats: defineAsyncComponent(() => import("~/components/blocks/Stats.vue")),
  team: defineAsyncComponent(() => import("~/components/blocks/Team.vue")),
  press: defineAsyncComponent(() => import("~/components/blocks/Press.vue")),
  faq: defineAsyncComponent(() => import("~/components/blocks/Faq.vue")),
  testimonial: defineAsyncComponent(() => import("~/components/blocks/Testimonial.vue")),
  comparison: defineAsyncComponent(() => import("~/components/blocks/Comparison.vue")),
  contactForm: defineAsyncComponent(() => import("~/components/blocks/ContactForm.vue")),
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
