<script setup lang="ts">
defineProps<{
  quote: string;
  author: string;
  role: string;
  initials: string;
}>();
</script>

<template>
  <section class="py-16 px-6 bg-[#0a1628] border-y border-[#162b55]">
    <div class="max-w-3xl mx-auto text-center">
      <svg class="w-10 h-10 text-[#f5c842]/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
      </svg>
      <blockquote class="text-xl md:text-2xl font-medium text-white leading-relaxed italic">
        "{{ quote }}"
      </blockquote>
      <div class="mt-8 flex items-center justify-center gap-4">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#162b55] to-[#0f2040] border border-[#f5c842]/20 flex items-center justify-center">
          <span class="text-[#f5c842] font-black text-sm">{{ initials }}</span>
        </div>
        <div class="text-left">
          <p class="text-white font-semibold text-sm">{{ author }}</p>
          <p class="text-slate-500 text-xs">{{ role }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
