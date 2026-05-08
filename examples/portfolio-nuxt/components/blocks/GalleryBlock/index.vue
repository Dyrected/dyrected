<script setup lang="ts">
defineProps<{
  title?: string
  images?: Array<{ image?: any; caption?: string }>
  columns?: string
}>()
</script>

<template>
  <section class="gallery-block">
    <div class="container">
      <h2 v-if="title">{{ title }}</h2>
      <div class="gallery-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
        <div v-for="(item, i) in images" :key="i" class="gallery-item">
          <img v-if="item.image" :src="item.image.url" :alt="item.caption || title" />
          <p v-if="item.caption" class="caption">{{ item.caption }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 4rem 1rem;
}
h2 {
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.5rem;
}
.gallery-grid {
  display: grid;
  gap: 1.5rem;
}
.gallery-item img {
  width: 100%;
  height: 250px;
  object-fit: cover;
  border-radius: 8px;
}
.caption {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}
@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
