<script setup lang="ts">
const route = useRoute();
const slug = computed(() => {
  const s = Array.isArray(route.params.slug) ? route.params.slug.join("/") : route.params.slug;
  return s || "home";
});

const { data: response } = await useDyrectedCollection("pages", {
  where: { slug: { equals: slug.value } },
  limit: 1,
});

const page = computed(() => response.value?.docs?.[0]);

if (!page.value && slug.value !== "home") {
  throw createError({ statusCode: 404, statusMessage: "Page Not Found" });
}

useHead({
  title: page.value?.seo?.metaTitle || page.value?.title || "SnackTrack Pro",
  meta: [
    {
      name: "description",
      content: page.value?.seo?.metaDescription || "Enterprise snack management.",
    },
  ],
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#050d1a]">
    <AppNavbar />
    <main v-if="page">
      <BlockRenderer v-for="(block, i) in page.layout" :key="i" :block="block" />
    </main>
    <div v-else-if="slug === 'home'" class="flex-1 flex items-center justify-center">
      <div class="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 class="text-4xl font-black text-white mb-4">Welcome to SnackTrack Pro</h1>
        <p class="text-slate-400 mb-8">
          Start by creating a page with the slug "home" in the
          <a href="/admin" class="text-[#f5c842] underline">Admin Dashboard</a>.
        </p>
      </div>
    </div>
    <AppFooter />
  </div>
</template>
