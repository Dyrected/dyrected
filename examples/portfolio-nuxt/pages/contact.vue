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
  <div class="contact-page">
    <div class="container">
      <section class="contact-hero">
        <h1>Contact Us</h1>
        <p class="lead">We'd love to hear from you. Whether you have a question, a prayer request, or just want to say hello, feel free to reach out.</p>
      </section>

      <section class="contact-content">
        <div class="contact-grid">
          <div class="contact-info">
            <div class="info-item">
              <h3>Our Location</h3>
              <p>123 Grace Avenue<br>Faith City, ST 12345</p>
            </div>
            <div class="info-item">
              <h3>Phone</h3>
              <p>(555) 123-4567</p>
            </div>
            <div class="info-item">
              <h3>Email</h3>
              <p>hello@ministryofgrace.com</p>
            </div>
          </div>

          <div class="contact-form-wrapper">
            <form v-if="status !== 'success'" @submit.prevent="submitInquiry" class="contact-form">
              <div class="form-group">
                <label>Name</label>
                <input v-model="form.name" type="text" required placeholder="Your Name" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="form.email" type="email" required placeholder="Your Email" />
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
              <button type="submit" class="btn btn-primary" :disabled="status === 'submitting'">
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
  padding: 4rem 0;
}
.contact-hero {
  text-align: center;
  background-color: #f8f5f2;
  border-radius: 12px;
  margin-top: 2rem;
  padding: 6rem 2rem;
}
.contact-hero h1 {
  font-size: 3.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}
.lead {
  font-size: 1.25rem;
  color: #7f8c8d;
  max-width: 700px;
  margin: 0 auto;
}
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 4rem;
  margin-top: 2rem;
}
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.info-item h3 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}
.info-item p {
  color: #666;
  line-height: 1.6;
}
.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}
.form-group {
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
  height: 150px;
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
  text-align: center;
}
.btn-primary {
  background-color: #e67e22;
  color: white;
}
.success-msg {
  padding: 3rem;
  background: #d4edda;
  color: #155724;
  border-radius: 12px;
  text-align: center;
}
.error-msg {
  color: #721c24;
  margin-top: 1rem;
}
@media (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
}
</style>
