<script setup lang="ts">
interface LogoItem {
  name: string;
}

defineProps<{
  heading?: string;
  items: LogoItem[];
}>();
</script>

<template>
  <section class="border-y border-[#162b55] bg-[#0a1628] py-8">
    <div class="max-w-7xl mx-auto px-6">
      <p v-if="heading" class="text-center text-xs text-slate-500 uppercase tracking-widest mb-6">
        {{ heading }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        <span
          v-for="item in items"
          :key="item.name"
          class="text-slate-500 font-bold text-sm md:text-base tracking-tight hover:text-slate-300 transition-colors"
        >
          {{ item.name }}
        </span>
      </div>
    </div>
  </section>
</template>
