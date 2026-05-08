<script setup lang="ts">
import HeroBlock from '~/components/blocks/HeroBlock.vue'
import RichContentBlock from '~/components/blocks/RichContentBlock.vue'
import GalleryBlock from '~/components/blocks/GalleryBlock.vue'
import CTABlock from '~/components/blocks/CTABlock.vue'

const dyrected = useDyrected();

const { data: pageData } = await useAsyncData('home-page', () => 
  dyrected.collection('pages').find({ 
    where: { slug: { equals: 'home' } } 
  }).seed([{
    title: 'Faith, Hope, and Love',
    slug: 'home',
    layout: [
      {
        blockType: 'hero',
        heading: 'Faith, Hope, and Love',
        subheading: 'Bringing the message of grace to a broken world.',
        ctaLabel: 'Listen to Sermons',
        ctaLink: '/blog',
        image: {
          url: 'https://images.unsplash.com/photo-1544717297-fa154da09f9b?auto=format&fit=crop&q=80&w=800',
          alt: 'Preacher speaking'
        }
      },
      {
        blockType: 'callToAction',
        heading: 'Our Mission',
        description: '"To spread the word of God and empower believers to live a life of purpose and spiritual growth."',
        theme: 'dark'
      }
    ]
  }])
);

const { data: sermonsData } = await useAsyncData('recent-sermons', () =>
  dyrected.collection('posts').find({ limit: 2 }).seed([
    {
      title: 'Walking in Faith',
      slug: 'walking-in-faith',
      content: 'A deep dive into Hebrews 11 and what it means to trust God in the dark.',
    },
    {
      title: 'The Power of Grace',
      slug: 'power-of-grace',
      content: 'Understanding the unmerited favor of God in our daily lives.',
    }
  ])
);

const page = computed(() => pageData.value?.docs[0]);
const sermons = computed(() => sermonsData.value?.docs || []);
</script>

<template>
  <div class="home-page">
    <!-- Render Blocks -->
    <template v-for="(block, i) in page?.layout" :key="i">
      <HeroBlock v-if="block.blockType === 'hero'" v-bind="block" />
      <RichContentBlock v-else-if="block.blockType === 'richContent'" v-bind="block" />
      <GalleryBlock v-else-if="block.blockType === 'imageGallery'" v-bind="block" />
      <CTABlock v-else-if="block.blockType === 'callToAction'" v-bind="block" />
    </template>

    <!-- Recent Sermons / Blog Feed (Kept as specialized section for home) -->
    <section class="featured-sermons">
      <div class="container">
        <h2>Recent Sermons</h2>
        <div class="sermon-grid">
          <div v-for="sermon in sermons" :key="sermon.id" class="sermon-card">
            <img :src="sermon.featuredImage?.url || 'https://images.unsplash.com/photo-1519491050282-ce00c739ce3c?auto=format&fit=crop&q=80&w=400'" :alt="sermon.title" />
            <h3>{{ sermon.title }}</h3>
            <p>{{ sermon.content?.substring(0, 100) }}...</p>
            <NuxtLink :to="`/blog/${sermon.slug}`" class="link">Read More</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Upcoming Events -->
    <section class="events">
      <div class="container">
        <h2>Upcoming Ministry Events</h2>
        <ul>
          <li><strong>Sunday Worship:</strong> Every Sunday @ 9:00 AM</li>
          <li><strong>Mid-week Prayer:</strong> Wednesdays @ 6:00 PM</li>
          <li><strong>Community Outreach:</strong> First Saturday of the Month</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
}
section {
  padding: 4rem 0;
}
.featured-sermons h2 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2.5rem;
}
.sermon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
  padding: 0 1rem;
}
.sermon-card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}
.sermon-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
.sermon-card h3, .sermon-card p {
  padding: 0 1rem;
}
.link {
  display: inline-block;
  padding: 1rem;
  color: #3498db;
  text-decoration: none;
  font-weight: bold;
}
.events {
  background-color: #f9f9f9;
}
.events ul {
  list-style: none;
  padding: 0;
}
.events li {
  padding: 1rem 0;
  border-bottom: 1px solid #ddd;
  text-align: center;
}
</style>
