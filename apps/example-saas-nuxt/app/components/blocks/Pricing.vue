<script setup lang="ts">
defineProps<{
  heading?: string
  plans: Array<{
    name: string
    price: string
    features: Array<{ text: string }>
    ctaLabel?: string
    ctaLink?: string
  }>
}>()
</script>

<template>
  <section class="py-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div v-if="heading" class="text-center mb-12">
        <h2 class="text-3xl font-black text-white">{{ heading }}</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div 
          v-for="plan in plans" 
          :key="plan.name"
          class="bg-navy-900 border border-navy-700 rounded-2xl p-8 flex flex-col hover:border-gold-400/30 transition-all"
        >
          <h3 class="text-xl font-bold text-white mb-2">{{ plan.name }}</h3>
          <div class="mb-6">
            <span class="text-4xl font-black text-white">{{ plan.price }}</span>
            <span class="text-slate-500 text-sm ml-1">/mo</span>
          </div>
          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in plan.features" :key="f.text" class="flex items-start gap-3 text-sm text-slate-300">
              <svg class="w-4 h-4 text-gold-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ f.text }}
            </li>
          </ul>
          <NuxtLink
            v-if="plan.ctaLabel"
            :to="plan.ctaLink || '#'"
            class="block text-center py-3 px-6 rounded bg-gold-400 text-navy-950 font-bold hover:bg-gold-500 transition-colors"
          >
            {{ plan.ctaLabel }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
