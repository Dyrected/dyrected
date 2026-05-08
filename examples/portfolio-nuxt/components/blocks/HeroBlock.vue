<script setup lang="ts">
defineProps<{
  heading: string
  subheading?: string
  image?: any
  ctaLabel?: string
  ctaLink?: string
}>()
</script>

<template>
  <section class="hero-block">
    <div class="hero-content">
      <h1>{{ heading }}</h1>
      <p v-if="subheading" class="subtitle">{{ subheading }}</p>
      <NuxtLink v-if="ctaLabel && ctaLink" :to="ctaLink" class="btn btn-primary">{{ ctaLabel }}</NuxtLink>
    </div>
    <div v-if="image" class="hero-image">
      <img :src="image.url" :alt="image.alt || heading" />
    </div>
  </section>
</template>

<style scoped>
.hero-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  background-color: #f8f5f2;
  padding: 6rem 2rem;
}
.hero-content {
  flex: 1;
}
.hero-content h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}
.subtitle {
  font-size: 1.5rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
}
.hero-image {
  flex: 1;
}
.hero-image img {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}
.btn {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}
.btn-primary {
  background-color: #e67e22;
  color: white;
}
@media (max-width: 768px) {
  .hero-block {
    flex-direction: column;
    text-align: center;
  }
}
</style>
