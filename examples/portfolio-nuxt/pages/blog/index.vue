<script setup lang="ts">
const dyrected = useDyrected();

const { data: postsData } = await useAsyncData('posts', () => 
  dyrected.collection('posts').find().seed([
    {
      title: 'Walking in Faith',
      slug: 'walking-in-faith',
      content: 'A deep dive into Hebrews 11 and what it means to trust God in the dark. Faith is not the absence of doubt, but the presence of trust in the midst of it.',
    },
    {
      title: 'The Power of Grace',
      slug: 'power-of-grace',
      content: 'Understanding the unmerited favor of God in our daily lives. Grace is the power that enables us to be who God called us to be.',
    }
  ])
);

const posts = computed(() => postsData.value?.docs || []);
</script>

<template>
  <div class="blog-page">
    <div class="container">
      <h1>Sermons & Insights</h1>
      <div v-if="posts && posts.length" class="post-grid">
        <article v-for="post in posts" :key="post.id" class="post-card">
          <div class="post-content">
            <h2>{{ post.title }}</h2>
            <p>{{ post.content?.substring(0, 150) }}...</p>
            <NuxtLink :to="'/blog/' + post.slug" class="read-more">Read Full Sermon</NuxtLink>
          </div>
        </article>
      </div>
      <div v-else class="no-posts">
        <p>No sermons found. Check back soon!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 4rem 1rem;
}
h1 {
  font-size: 3rem;
  margin-bottom: 3rem;
  color: #2c3e50;
  text-align: center;
}
.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2.5rem;
}
.post-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: transform 0.3s;
  border-top: 4px solid #e67e22;
}
.post-card:hover {
  transform: translateY(-5px);
}
.post-content {
  padding: 2rem;
}
h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}
p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}
.read-more {
  color: #e67e22;
  text-decoration: none;
  font-weight: bold;
}
.no-posts {
  text-align: center;
  padding: 4rem;
  background: #f9f9f9;
  border-radius: 8px;
}
</style>
