<script setup lang="ts">
defineProps<{
  heading?: string
  items: Array<{
    icon: string
    title: string
    description: string
  }>
}>()
</script>

<template>
  <section class="py-24 px-6">
    <div class="max-w-7xl mx-auto">
      <div v-if="heading" class="text-center mb-16">
        <SectionLabel text="Features" />
        <h2 class="text-3xl md:text-5xl font-black text-white mt-2">
          {{ heading }}
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="f in items"
          :key="f.title"
          class="bg-[#0a1628] border border-[#162b55] rounded-xl p-8 hover:border-[#f5c842]/30 transition-colors group"
        >
          <div class="w-12 h-12 bg-[#f5c842]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#f5c842]/20 transition-colors">
            <svg class="w-6 h-6 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-html="f.icon" />
            </svg>
          </div>
          <h3 class="text-white font-bold text-lg mb-2">{{ f.title }}</h3>
          <p class="text-slate-400 text-sm leading-relaxed">{{ f.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
