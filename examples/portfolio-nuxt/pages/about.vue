<script setup lang="ts">
const dyrected = useDyrected();
const form = ref({
  name: '',
  email: '',
  type: 'prayer',
  message: ''
});

const status = ref('');

async function submitInquiry() {
  status.value = 'submitting';
  try {
    await dyrected.collection('inquiries').create({
      ...form.value,
      createdAt: new Date().toISOString()
    });
    status.value = 'success';
    form.value = { name: '', email: '', type: 'prayer', message: '' };
  } catch (e) {
    status.value = 'error';
  }
}
</script>

<template>
  <div class="about-page">
    <div class="container">
      <!-- Bio Section -->
      <section class="bio">
        <div class="bio-image">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600" alt="Pastor Photo" />
        </div>
        <div class="bio-text">
          <h1>Meet Pastor John Smith</h1>
          <p class="lead">Serving the community for over 20 years with a passion for spiritual transformation.</p>
          <p>Pastor John has dedicated his life to sharing the message of hope. Born and raised in a small town, his journey into ministry began after a life-changing experience that led him to pursue a theological degree and eventually lead this vibrant community.</p>
          <p>His teaching style is known for being practical, engaging, and deeply rooted in scripture, making the ancient word relevant to modern life.</p>
        </div>
      </section>

      <!-- Vision & Values -->
      <section class="vision-values">
        <h2>Vision & Values</h2>
        <div class="grid">
          <div class="card">
            <h3>Faith</h3>
            <p>We believe in the power of unwavering faith in God's promises and his plan for every individual.</p>
          </div>
          <div class="card">
            <h3>Community</h3>
            <p>We are committed to building a supportive and loving community where everyone is welcome.</p>
          </div>
          <div class="card">
            <h3>Service</h3>
            <p>True leadership is service. We actively engage in outreach programs to help those in need.</p>
          </div>
        </div>
      </section>

      <!-- Call to Action / Contact Form -->
      <section class="cta">
        <div class="cta-content">
          <h2>Connect with Pastor John</h2>
          <p>Have a question or need prayer? Reach out to us today.</p>
          
          <form v-if="status !== 'success'" @submit.prevent="submitInquiry" class="contact-form">
            <div class="form-row">
              <div class="form-group">
                <label>Name</label>
                <input v-model="form.name" type="text" required placeholder="Your Name" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="form.email" type="email" required placeholder="Your Email" />
              </div>
            </div>
            <div class="form-group">
              <label>Type of Request</label>
              <select v-model="form.type">
                <option value="prayer">Prayer Request</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>
            <div class="form-group">
              <label>Message</label>
              <textarea v-model="form.message" required placeholder="How can we help?"></textarea>
            </div>
            <button type="submit" class="btn btn-secondary" :disabled="status === 'submitting'">
              {{ status === 'submitting' ? 'Sending...' : 'Send Message' }}
            </button>
            <p v-if="status === 'error'" class="error-msg">Failed to send. Please ensure Dyrected is running.</p>
          </form>

          <div v-else class="success-msg">
            <h3>Thank You!</h3>
            <p>Your request has been received. We will be in touch soon.</p>
            <button @click="status = ''" class="btn btn-primary">Send Another</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem;
}

section {
  padding: 5rem 0;
}

.bio {
  display: flex;
  gap: 4rem;
  align-items: center;
}

.bio-image {
  flex: 1;
}

.bio-image img {
  width: 100%;
  border-radius: 50%;
  border: 10px solid #f8f5f2;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.bio-text {
  flex: 1.5;
}

.bio-text h1 {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.lead {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e67e22;
  margin-bottom: 1.5rem;
}

.bio-text p {
  line-height: 1.8;
  color: #555;
  margin-bottom: 1rem;
}

.vision-values h2 {
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.card {
  background: #fff;
  padding: 2.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-top: 5px solid #2c3e50;
}

.card h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.cta {
  text-align: center;
  background-color: #f8f5f2;
  border-radius: 12px;
  margin-bottom: 4rem;
  padding: 4rem 2rem;
}

.contact-form {
  max-width: 600px;
  margin: 3rem auto 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

input, select, textarea {
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  height: 120px;
  resize: vertical;
}

.btn {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: #e67e22;
  color: white;
}

.btn-secondary {
  background-color: #2c3e50;
  color: white;
}

.success-msg {
  padding: 2rem;
  background: #d4edda;
  color: #155724;
  border-radius: 8px;
  margin-top: 2rem;
}

.error-msg {
  color: #721c24;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .bio {
    flex-direction: column;
    text-align: center;
  }
  .form-row {
    flex-direction: column;
  }
}
</style>
