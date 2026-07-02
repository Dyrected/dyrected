<script setup lang="ts">
defineProps<{
  quote: string;
  author: string;
  role: string;
  initials: string;
}>();
</script>

<template>
  <section class="py-16 px-6 bg-card border-y border-border">
    <div class="max-w-3xl mx-auto text-center">
      <svg class="w-10 h-10 text-intelligence/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
      </svg>
      <blockquote class="text-xl md:text-2xl font-medium text-foreground leading-relaxed italic">
        "{{ quote }}"
      </blockquote>
      <div class="mt-8 flex items-center justify-center gap-4">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-card border border-intelligence/20 flex items-center justify-center">
          <span class="text-intelligence font-black text-sm">{{ initials }}</span>
        </div>
        <div class="text-left">
          <p class="text-foreground font-semibold text-sm">{{ author }}</p>
          <p class="text-muted-foreground text-xs">{{ role }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
