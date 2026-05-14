<script setup lang="ts">
interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

defineProps<{
  items: TimelineItem[];
}>();
</script>

<template>
  <section class="py-20 px-6">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-14">
        <SectionLabel text="Our Story" />
        <h2 class="text-3xl md:text-4xl font-black text-white mt-2">From a crisis to a category.</h2>
      </div>

      <div class="relative">
        <!-- Vertical line -->
        <div class="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-navy-700 -translate-x-px md:translate-x-0" />

        <div
          v-for="(event, i) in items"
          :key="event.year"
          class="relative mb-10 pl-16 md:pl-0"
          :class="i % 2 === 0 ? 'md:pr-[calc(50%+2rem)] md:pl-0' : 'md:pl-[calc(50%+2rem)] md:pr-0'"
        >
          <!-- Dot -->
          <div class="absolute left-4 md:left-1/2 top-4 w-5 h-5 bg-gold-400 rounded-full border-4 border-navy-950 -translate-x-2 md:-translate-x-2.5 z-10" />

          <div class="bg-navy-900 border border-navy-700 rounded-xl p-5 hover:border-gold-400/20 transition-colors">
            <span class="text-gold-400 text-xs font-bold uppercase tracking-widest">{{ event.year }}</span>
            <h3 class="text-white font-bold mt-1 mb-2">{{ event.title }}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">{{ event.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
