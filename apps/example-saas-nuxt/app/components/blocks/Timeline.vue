<script setup lang="ts">
defineProps<{
  items: Array<{
    year: string
    title: string
    description: string
  }>
}>()
</script>

<template>
  <section class="py-20 px-6">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-12">
        <div v-for="item in items" :key="item.year" class="flex gap-8 group">
          <div class="flex flex-col items-center">
            <div class="w-12 h-12 rounded-full bg-gold-400 border-4 border-navy-950 flex items-center justify-center z-10 font-bold text-navy-950">
              {{ item.year }}
            </div>
            <div class="w-px h-full bg-navy-700 -mt-1 group-last:hidden" />
          </div>
          <div class="pb-12">
            <h3 class="text-xl font-bold text-white mb-2">{{ item.title }}</h3>
            <p class="text-slate-400 leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
