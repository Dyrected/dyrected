<script setup lang="ts">
interface StatItem {
  value: string;
  label: string;
}

defineProps<{
  items: StatItem[];
}>();
</script>

<template>
  <section class="border-y border-border bg-card py-10">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div v-for="stat in items" :key="stat.label">
          <p class="text-3xl md:text-4xl font-black text-intelligence">{{ stat.value }}</p>
          <p class="text-muted-foreground text-sm mt-1">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
