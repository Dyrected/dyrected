<script setup lang="ts">
defineProps<{
  content: any
}>()
</script>

<template>
  <section class="py-12 px-6">
    <div class="max-w-3xl mx-auto prose prose-invert prose-gold">
      <!-- In a real app, use a dedicated rich text renderer for Dyrected's object format -->
      <div v-if="typeof content === 'string'" v-html="content" />
      <div v-else class="text-slate-400 italic">
        [Rich Text Content]
      </div>
    </div>
  </section>
</template>

<style scoped>
.prose-gold :deep(a) { color: #f5c842; }
.prose-gold :deep(strong) { color: #fff; }
</style>
