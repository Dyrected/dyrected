<script setup lang="ts">
defineProps<{
  heading: string
  description?: string
  buttonLabel?: string
  buttonLink?: string
  theme?: 'primary' | 'secondary' | 'dark'
}>()
</script>

<template>
  <section class="cta-block" :class="`theme-${theme}`">
    <div class="container">
      <h2>{{ heading }}</h2>
      <p v-if="description">{{ description }}</p>
      <NuxtLink v-if="buttonLabel && buttonLink" :to="buttonLink" class="btn">
        {{ buttonLabel }}
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.cta-block {
  padding: 5rem 2rem;
  text-align: center;
}
.container {
  max-width: 800px;
  margin: 0 auto;
}
h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}
p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
}
.btn {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}
.theme-primary {
  background-color: #f8f5f2;
}
.theme-primary .btn {
  background-color: #e67e22;
  color: white;
}
.theme-secondary {
  background-color: #e67e22;
  color: white;
}
.theme-secondary .btn {
  background-color: white;
  color: #e67e22;
}
.theme-dark {
  background-color: #2c3e50;
  color: white;
}
.theme-dark .btn {
  background-color: #e67e22;
  color: white;
}
</style>
