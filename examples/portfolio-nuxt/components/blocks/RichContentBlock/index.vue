<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<template>
  <section class="rich-content-block">
    <div class="container">
      <div class="content" v-html="content" />
    </div>
  </section>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem 1rem;
}
.content {
  line-height: 1.8;
  color: #333;
  font-size: 1.1rem;
  white-space: pre-wrap;
}
</style>
