<script setup lang="ts">
const dyrected = useDyrected();

const { data: settings } = await useAsyncData('settings', () => 
  dyrected.getGlobal('settings', { 
    initialData: { 
      siteName: 'Ministry of Grace',
      footerText: '2026 Ministry of Grace. All rights reserved.'
    } 
  })
);

const { data: navigation } = await useAsyncData('navigation', () => 
  dyrected.getGlobal('navigation', {
    initialData: {
      menuItems: [
        { label: 'Home', navType: 'internal' },
        { label: 'About', navType: 'internal' },
        { label: 'Sermons', navType: 'internal' }
      ]
    }
  })
);

const siteTitle = computed(() => settings.value?.siteName || 'Ministry of Grace');
const footerText = computed(() => settings.value?.footerText || '2026 Ministry of Grace. All rights reserved.');
</script>

<template>
  <div>
    <header>
      <nav>
        <NuxtLink to="/" class="logo">{{ siteTitle }}</NuxtLink>
        <ul>
          <li v-for="item in navigation?.menuItems" :key="item.label">
             <NuxtLink v-if="item.navType === 'internal'" :to="item.label === 'Home' ? '/' : (item.label === 'Sermons' ? '/blog' : '/' + item.label.toLowerCase())">
               {{ item.label }}
             </NuxtLink>
             <a v-else :href="item.url" target="_blank">{{ item.label }}</a>
          </li>
          <template v-if="!navigation?.menuItems">
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li><NuxtLink to="/about">About</NuxtLink></li>
            <li><NuxtLink to="/blog">Sermons</NuxtLink></li>
          </template>
        </ul>
      </nav>
    </header>
    <main>
      <NuxtPage />
    </main>
    <footer>
      <p>&copy; {{ footerText }}</p>
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
