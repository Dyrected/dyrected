<script setup lang="ts">
const props = defineProps<{
  heading?: string
  plans: Array<{
    name: string
    price: string
    features: Array<{ text: string }>
    ctaLabel?: string
    ctaLink?: string | { url?: string }
  }>
}>()

const resolveUrl = (link: any) => {
  if (!link) return '#'
  if (typeof link === 'string') return link
  return link.url || '#'
}
</script>

<template>
  <section class="py-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div v-if="heading" class="text-center mb-12">
        <h2 class="text-3xl font-black text-foreground">{{ heading }}</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div 
          v-for="plan in plans" 
          :key="plan.name"
          class="bg-card border border-border rounded-2xl p-8 flex flex-col hover:border-intelligence/30 transition-all"
        >
          <h3 class="text-xl font-bold text-foreground mb-2">{{ plan.name }}</h3>
          <div class="mb-6">
            <span class="text-4xl font-black text-foreground">{{ plan.price }}</span>
            <span class="text-muted-foreground text-sm ml-1">/mo</span>
          </div>
          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in plan.features" :key="f.text" class="flex items-start gap-3 text-sm text-muted-foreground">
              <svg class="w-4 h-4 text-intelligence shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ f.text }}
            </li>
          </ul>
          <NuxtLink
            v-if="plan.ctaLabel"
            :to="resolveUrl(plan.ctaLink) || '#'"
            class="block text-center py-3 px-6 rounded bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
          >
            {{ plan.ctaLabel }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
