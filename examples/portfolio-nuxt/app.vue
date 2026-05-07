<script setup lang="ts">
const dyrected = useDyrected();
const { data: settings } = await useAsyncData('settings', () => 
  dyrected.getGlobal('settings').catch(() => ({ siteName: 'Ministry of Grace' }))
);

const siteTitle = computed(() => settings.value?.siteName || 'Ministry of Grace');
</script>

<template>
  <div>
    <header>
      <nav>
        <NuxtLink to="/" class="logo">{{ siteTitle }}</NuxtLink>
        <ul>
          <li><NuxtLink to="/">Home</NuxtLink></li>
          <li><NuxtLink to="/about">About</NuxtLink></li>
          <li><NuxtLink to="/blog">Sermons</NuxtLink></li>
        </ul>
      </nav>
    </header>
    <main>
      <NuxtPage />
    </main>
    <footer>
      <p>&copy; 2026 Ministry of Grace. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped>
header {
  border-bottom: 1px solid #eee;
  padding: 1.5rem 2rem;
  background-color: white;
  position: sticky;
  top: 0;
  z-index: 100;
}
nav {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
}
nav ul {
  display: flex;
  gap: 2rem;
  list-style: none;
  padding: 0;
  margin: 0;
}
nav a {
  text-decoration: none;
  color: #2c3e50;
  font-weight: 500;
  transition: color 0.3s;
}
nav a:hover {
  color: #e67e22;
}
main {
  min-height: 80vh;
}
footer {
  border-top: 1px solid #eee;
  padding: 3rem 1rem;
  text-align: center;
  background-color: #2c3e50;
  color: white;
}
</style>
