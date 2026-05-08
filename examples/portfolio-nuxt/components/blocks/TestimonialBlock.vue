<script setup lang="ts">
defineProps<{
  message: string
  authorName: string
  authorDesignation: string
  avatar?: any
}>()
</script>

<template>
  <section class="testimonial-block">
    <div class="container">
      <div class="testimonial-card">
        <div v-if="avatar" class="avatar">
          <img :src="avatar.url" :alt="authorName" />
        </div>
        <div class="content">
          <p class="message">"{{ message }}"</p>
          <div class="author">
            <span class="name">{{ authorName }}</span>
            <span class="designation">{{ authorDesignation }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.testimonial-block {
  padding: 4rem 1rem;
  background-color: white;
}
.container {
  max-width: 800px;
  margin: 0 auto;
}
.testimonial-card {
  display: flex;
  gap: 2rem;
  align-items: center;
  background: #f8f5f2;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.avatar {
  flex-shrink: 0;
}
.avatar img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
}
.content {
  flex-grow: 1;
}
.message {
  font-size: 1.5rem;
  font-style: italic;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  line-height: 1.4;
}
.author {
  display: flex;
  flex-direction: column;
}
.name {
  font-weight: bold;
  font-size: 1.1rem;
  color: #e67e22;
}
.designation {
  font-size: 0.9rem;
  color: #7f8c8d;
}
@media (max-width: 600px) {
  .testimonial-card {
    flex-direction: column;
    text-align: center;
    padding: 2rem;
  }
}
</style>
