<script setup lang="ts">
const dyrected = useDyrected();

const { data: postsData, error } = await useAsyncData('posts', async () => {
  try {
    // Using the SDK pattern: dyrected.collection('slug').find()
    const result = await dyrected.collection('posts').find();
    return result;
  } catch (e) {
    console.warn('Dyrected not connected, using empty list');
    return { docs: [] };
  }
});

const posts = computed(() => postsData.value?.docs || []);
</script>

<template>
  <div>
    <h1>Blog</h1>
    <div v-if="posts" class="post-list">
      <article v-for="post in posts" :key="post.id" class="post-preview">
        <h2>
          <NuxtLink :to="`/blog/${post.slug}`">{{ post.title }}</NuxtLink>
        </h2>
        <p>{{ post.excerpt }}</p>
      </article>
    </div>
    <div v-else-if="error">
      <p>Error loading posts.</p>
    </div>
  </div>
</template>

<style scoped>
.post-preview {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}
</style>
