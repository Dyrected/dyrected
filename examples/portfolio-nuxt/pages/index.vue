<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1>Faith, Hope, and Love</h1>
        <p class="subtitle">Bringing the message of grace to a broken world.</p>
        <NuxtLink to="/blog" class="btn btn-primary">Listen to Sermons</NuxtLink>
      </div>
      <div class="hero-image">
        <img src="https://images.unsplash.com/photo-1544717297-fa154da09f9b?auto=format&fit=crop&q=80&w=800" alt="Preacher speaking" />
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
          <div class="sermon-card">
            <img src="https://images.unsplash.com/photo-1519491050282-ce00c739ce3c?auto=format&fit=crop&q=80&w=400" alt="Sermon Topic" />
            <h3>Walking in Faith</h3>
            <p>A deep dive into Hebrews 11 and what it means to trust God in the dark.</p>
            <NuxtLink to="/blog/walking-in-faith" class="link">Read More</NuxtLink>
          </div>
          <div class="sermon-card">
            <img src="https://images.unsplash.com/photo-1504052434139-44b057717549?auto=format&fit=crop&q=80&w=400" alt="Sermon Topic" />
            <h3>The Power of Grace</h3>
            <p>Understanding the unmerited favor of God in our daily lives.</p>
            <NuxtLink to="/blog/power-of-grace" class="link">Read More</NuxtLink>
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
