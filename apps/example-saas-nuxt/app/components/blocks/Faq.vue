<script setup lang="ts">
import { ref } from 'vue'

interface FaqItem {
  question: string;
  answer: string;
}

const props = defineProps<{
  heading?: string;
  items: FaqItem[];
}>();

const openIndices = ref<number[]>([]);

function toggle(i: number) {
  if (openIndices.value.includes(i)) {
    openIndices.value = openIndices.value.filter(index => index !== i);
  } else {
    openIndices.value.push(i);
  }
}

function isOpen(i: number) {
  return openIndices.value.includes(i);
}
</script>

<template>
  <section class="py-16 px-6 bg-card border-t border-border">
    <div class="max-w-3xl mx-auto">
      <div v-if="heading" class="text-center mb-12">
        <SectionLabel text="Common Questions" />
        <h2 class="text-3xl font-black text-foreground mt-2">{{ heading }}</h2>
      </div>
      <div class="space-y-3">
        <div
          v-for="(faq, i) in items"
          :key="i"
          class="border border-border rounded-xl overflow-hidden"
        >
          <button
            class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-muted/50 transition-colors"
            @click="toggle(i)"
          >
            <span class="text-foreground font-semibold text-sm pr-4">{{ faq.question }}</span>
            <svg
              class="w-5 h-5 text-intelligence shrink-0 transition-transform"
              :class="isOpen(i) ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="isOpen(i)" class="px-6 pb-5">
            <p class="text-muted-foreground text-sm leading-relaxed">{{ faq.answer }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
