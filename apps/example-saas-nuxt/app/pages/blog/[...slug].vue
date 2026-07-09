<script setup lang="ts">
const route = useRoute();
const slug = computed(() => {
  const s = Array.isArray(route.params.slug) ? route.params.slug.join("/") : route.params.slug;
  return s || "";
});

const { data: response } = await useDyrectedCollection("blog", {
  where: { slug: { equals: slug.value } },
  limit: 1,
  depth: 1,
});

const pageData = computed(() => response.value?.docs?.[0]);

// Live preview (Option B — composable). Also powers click-to-edit: the
// data-dy-path attrs below become editable targets in the admin preview.
const { data: blog } = useLivePreview({
  initialData: pageData.value,
});

if (!blog.value) {
  throw createError({ statusCode: 404, statusMessage: "Article Not Found" });
}

// Relationships resolve to objects at depth >= 1; guard for the unpopulated
// (id string) case so rendering never breaks.
const author = computed(() => {
  const a = blog.value?.author;
  return a && typeof a === "object" ? a : null;
});

const publishedDate = computed(() => {
  const d = blog.value?.publishedDate;
  return d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
});

// Click-to-edit attrs for top-level fields (no block base path → just the field name).
const dyTitle = useDyPath("title");
const dyContent = useDyPath("content");

useHead({
  title: blog.value?.seo?.metaTitle || blog.value?.title || "SnackTrack Pro Blog",
  meta: [
    {
      name: "description",
      content: blog.value?.seo?.metaDescription || blog.value?.title || "Enterprise snack management.",
    },
  ],
});
</script>

<template>
  <main v-if="blog" class="mx-auto max-w-3xl px-6 py-16 md:py-24">
    <NuxtLink to="/blog" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-intelligence transition-colors mb-8">
      ← Back to blog
    </NuxtLink>

    <header class="mb-10">
      <h1 v-bind="dyTitle" class="text-3xl md:text-5xl font-black text-foreground leading-tight tracking-tight">
        {{ blog.title }}
      </h1>

      <div v-if="author || publishedDate" class="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
        <span v-if="author" class="font-semibold text-muted-foreground">{{ author.name }}</span>
        <span v-if="author && publishedDate" class="text-muted-foreground">•</span>
        <time v-if="publishedDate">{{ publishedDate }}</time>
      </div>
    </header>

    <DyrectedImage
      v-if="blog.featuredImage"
      :media="blog.featuredImage"
      class="w-full rounded-2xl border border-border mb-12 object-cover"
    />

    <article
      v-bind="dyContent"
      class="prose dark:prose-invert prose-accent max-w-none prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-a:text-intelligence prose-strong:text-foreground prose-img:rounded-xl"
      v-html="blog.content"
    />
  </main>
</template>

<style scoped>
.prose-accent :deep(a) { color: hsl(var(--intelligence)); }
.prose-accent :deep(strong) { color: hsl(var(--foreground)); }
</style>
