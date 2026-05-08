<script setup lang="ts">
defineProps<{
  heading: string
  subheading?: string
  image?: any
  ctaLabel?: string
  ctaLink?: string
  heroType?: 'split' | 'centered' | 'full'
}>()
</script>

<template>
  <section class="hero-block" :class="`hero-type-${heroType}`">
    <!-- Background image for full type -->
    <div v-if="heroType === 'full' && image" class="hero-bg">
      <img :src="image.url" alt="" />
      <div class="overlay"></div>
    </div>

    <div class="container">
      <div class="hero-content">
        <h1>{{ heading }}</h1>
        <p v-if="subheading" class="subtitle">{{ subheading }}</p>
        <NuxtLink v-if="ctaLabel && ctaLink" :to="ctaLink" class="btn btn-primary">
          {{ ctaLabel }}
        </NuxtLink>
      </div>
      
      <div v-if="heroType === 'split' && image" class="hero-image">
        <img :src="image.url" :alt="image.alt || heading" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-block {
  position: relative;
  overflow: hidden;
  padding: 6rem 2rem;
  background-color: #f8f5f2;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4rem;
  position: relative;
  z-index: 2;
}

.hero-content {
  flex: 1.2;
}

.hero-content h1 {
  font-size: 3.5rem;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  line-height: 1.1;
}

.subtitle {
  font-size: 1.5rem;
  color: #7f8c8d;
  margin-bottom: 2.5rem;
  line-height: 1.4;
}

.hero-image {
  flex: 1;
}

.hero-image img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.btn {
  display: inline-block;
  padding: 1.25rem 2.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.btn-primary {
  background-color: #e67e22;
  color: white;
}

/* Centered Type */
.hero-type-centered {
  text-align: center;
}

.hero-type-centered .container {
  justify-content: center;
}

.hero-type-centered .hero-content {
  max-width: 800px;
  margin: 0 auto;
}

/* Full Type */
.hero-type-full {
  min-height: 80vh;
  display: flex;
  align-items: center;
  color: white;
}

.hero-type-full .hero-content h1 {
  color: white;
}

.hero-type-full .subtitle {
  color: rgba(255,255,255,0.8);
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-bg .overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3));
}

@media (max-width: 768px) {
  .hero-block {
    padding: 4rem 1rem;
  }
  .container {
    flex-direction: column;
    text-align: center;
    gap: 2rem;
  }
  .hero-content h1 {
    font-size: 2.5rem;
  }
  .hero-type-full .hero-bg .overlay {
    background: rgba(0,0,0,0.6);
  }
}
</style>
