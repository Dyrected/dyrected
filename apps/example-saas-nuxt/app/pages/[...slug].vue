<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// Map block slugs to components. <DyrectedBlocks> renders each entry in the
// page's `layout` array by `blockType` and scopes its data-dy-path base
// (e.g. "layout.0"), so fields inside each block become click-to-edit targets
// in the admin live preview.
const blockComponents: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  hero: defineAsyncComponent(() => import('~/components/blocks/Hero.vue')),
  features: defineAsyncComponent(() => import('~/components/blocks/Features.vue')),
  richContent: defineAsyncComponent(() => import('~/components/blocks/RichText.vue')),
  cta: defineAsyncComponent(() => import('~/components/blocks/Cta.vue')),
  pricing: defineAsyncComponent(() => import('~/components/blocks/Pricing.vue')),
  timeline: defineAsyncComponent(() => import('~/components/blocks/Timeline.vue')),
  logos: defineAsyncComponent(() => import('~/components/blocks/Logos.vue')),
  stats: defineAsyncComponent(() => import('~/components/blocks/Stats.vue')),
  team: defineAsyncComponent(() => import('~/components/blocks/Team.vue')),
  press: defineAsyncComponent(() => import('~/components/blocks/Press.vue')),
  faq: defineAsyncComponent(() => import('~/components/blocks/Faq.vue')),
  testimonial: defineAsyncComponent(() => import('~/components/blocks/Testimonial.vue')),
  comparison: defineAsyncComponent(() => import('~/components/blocks/Comparison.vue')),
  contactForm: defineAsyncComponent(() => import('~/components/blocks/ContactForm.vue')),
}

const route = useRoute();
const slug = computed(() => {
  const s = Array.isArray(route.params.slug) ? route.params.slug.join("/") : route.params.slug;
  return s || "home";
});

const { data: response } = await useDyrectedCollection("pages", {
  where: { slug: { equals: slug.value } },
  limit: 1,
});

const pageData = computed(() => response.value?.docs?.[0]);

// Enable Live Preview
const { data: page } = useLivePreview({
  initialData: pageData.value,
});

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
  <main v-if="page">
    <DyrectedBlocks :items="page.layout" :components="blockComponents" path="layout" />
  </main>
  <div v-else-if="slug === 'home'" class="flex-1 flex items-center justify-center">
    <div class="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 class="text-4xl font-black text-white mb-4">Welcome to SnackTrack Pro</h1>
      <p class="text-slate-400 mb-8">
        Start by creating a page with the slug "home" in the
        <a href="/admin" class="text-gold-400 underline">Admin Dashboard</a>.
      </p>
    </div>
  </div>
</template>
