<script setup lang="ts">
interface PressItem {
  publication: string;
  quote: string;
  date: string;
}

defineProps<{
  items: PressItem[];
}>();
</script>

<template>
  <section class="py-20 px-6 border-t border-border">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-14">
        <SectionLabel text="Press" />
        <h2 class="text-3xl font-black text-foreground mt-2">As seen in.</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="item in items"
          :key="item.publication"
          class="bg-card border border-border rounded-xl p-6 hover:border-intelligence/20 transition-colors"
        >
          <div class="flex items-center justify-between mb-4">
            <span class="text-intelligence font-bold text-sm">{{ item.publication }}</span>
            <span class="text-muted-foreground text-xs">{{ item.date }}</span>
          </div>
          <blockquote class="text-muted-foreground text-sm leading-relaxed italic">{{ item.quote }}</blockquote>
        </div>
      </div>
    </div>
  </section>
</template>
