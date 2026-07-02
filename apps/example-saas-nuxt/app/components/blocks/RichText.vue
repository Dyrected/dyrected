<script setup lang="ts">
defineProps<{
  content: any
}>()
</script>

<template>
  <section class="py-12 px-6">
    <div class="max-w-3xl mx-auto prose dark:prose-invert prose-accent">
      <!-- In a real app, use a dedicated rich text renderer for Dyrected's object format -->
      <div v-if="typeof content === 'string'" v-html="content" />
      <div v-else class="text-muted-foreground italic">
        [Rich Text Content]
      </div>
    </div>
  </section>
</template>

<style scoped>
.prose-accent :deep(a) { color: hsl(var(--intelligence)); }
.prose-accent :deep(strong) { color: hsl(var(--foreground)); }
</style>
