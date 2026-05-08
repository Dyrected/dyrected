<script setup lang="ts">
const dyrected = useDyrected();

const { data: pageData } = await useAsyncData('home-page', () => 
  dyrected.collection('pages').find({ 
    where: { slug: { equals: 'home' } } 
  }).seed([{
    title: 'Faith, Hope, and Love',
    slug: 'home',
    content: 'Bringing the message of grace to a broken world.',
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1544717297-fa154da09f9b?auto=format&fit=crop&q=80&w=800',
      alt: 'Preacher speaking'
    }
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
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1>{{ page?.title || 'Faith, Hope, and Love' }}</h1>
        <p class="subtitle">{{ page?.content || 'Bringing the message of grace to a broken world.' }}</p>
        <NuxtLink to="/blog" class="btn btn-primary">Listen to Sermons</NuxtLink>
      </div>
      <div class="hero-image">
        <img :src="page?.featuredImage?.url || 'https://images.unsplash.com/photo-1544717297-fa154da09f9b?auto=format&fit=crop&q=80&w=800'" :alt="page?.featuredImage?.alt || 'Preacher speaking'" />
      </div>
    </section>

    <!-- Mission Statement -->
    <section class="mission">
      <div class="container">
        <h2>Our Mission</h2>
        <p>"To spread the word of God and empower believers to live a life of purpose and spiritual growth."</p>
      </div>
    </section>

    <!-- Recent Sermons / Blog Feed -->
    <section class="featured-sermons">
      <div class="container">
        <h2>Recent Sermons</h2>
        <div class="sermon-grid">
          <div v-for="sermon in sermons" :key="sermon.id" class="sermon-card">
            <img :src="sermon.featuredImage?.url || 'https://images.unsplash.com/photo-1519491050282-ce00c739ce3c?auto=format&fit=crop&q=80&w=400'" :alt="sermon.title" />
            <h3>{{ sermon.title }}</h3>
            <p>{{ sermon.content }}</p>
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

    <!-- Testimonials -->
    <section class="testimonials">
      <div class="container">
        <h2>Transformed Lives</h2>
        <div class="testimonial-grid">
          <div class="testimonial">
            <p>"The messages here have completely changed my perspective on life and faith."</p>
            <cite>— Sarah J.</cite>
          </div>
          <div class="testimonial">
            <p>"A community that truly lives out the love of Christ. I'm so blessed to be a part of it."</p>
            <cite>— Michael D.</cite>
          </div>
        </div>
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

.hero {
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

.mission {
  text-align: center;
  background-color: #2c3e50;
  color: white;
}

.mission p {
  font-size: 1.8rem;
  font-style: italic;
  max-width: 800px;
  margin: 0 auto;
}

.sermon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
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
}

.testimonial-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.testimonial {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
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
  .hero {
    flex-direction: column;
    text-align: center;
  }
  .testimonial-grid {
    grid-template-columns: 1fr;
  }
}
</style>
