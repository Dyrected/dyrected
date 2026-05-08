<script setup lang="ts">
defineProps<{
  heading: string;
  subheading: string;
  testimonials?: Array<{
    name: string;
    position: string;
    avatar?: any;
    quote: string;
  }>;
}>()
</script>

<template>
  <section class="testimonial-block">
    <div class="container">
      <div class="block-header">
        <h2>{{ heading }}</h2>
        <p v-if="subheading">{{ subheading }}</p>
      </div>

      <div class="testimonials-grid">
        <div v-for="(t, i) in testimonials" :key="i" class="testimonial-card">
          <div v-if="t.avatar" class="avatar">
            <img :src="t.avatar.url" :alt="t.name" />
          </div>
          <div class="content">
            <p class="message">"{{ t.quote }}"</p>
            <div class="author">
              <span class="name">{{ t.name }}</span>
              <span class="designation">{{ t.position }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.testimonial-block {
  padding: 5rem 1rem;
  background-color: white;
}
.container {
  max-width: 1100px;
  margin: 0 auto;
}
.block-header {
  text-align: center;
  margin-bottom: 3rem;
}
.block-header h2 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}
.block-header p {
  font-size: 1.1rem;
  color: #7f8c8d;
}
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}
.testimonial-card {
  display: flex;
  flex-direction: column;
  background: #f8f5f2;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.avatar {
  margin-bottom: 1.5rem;
}
.avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid white;
}
.content {
  flex-grow: 1;
}
.message {
  font-size: 1.1rem;
  font-style: italic;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}
.author {
  display: flex;
  flex-direction: column;
  margin-top: auto;
}
.name {
  font-weight: bold;
  font-size: 1rem;
  color: #e67e22;
}
.designation {
  font-size: 0.85rem;
  color: #7f8c8d;
}
</style>
