<script setup lang="ts">
const { data: response } = await useDyrectedCollection("blog", {
  sort: "-publishedDate",
  depth: 1,
  limit: 100,
});

const posts = computed(() => response.value?.docs ?? []);

function authorName(post: any) {
  const a = post?.author;
  return a && typeof a === "object" ? a.name : "";
}

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";
}

function excerpt(html?: string, length = 160) {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

useHead({
  title: "Blog — SnackTrack Pro",
  meta: [
    {
      name: "description",
      content: "Insights, product updates, and snack intelligence from the SnackTrack Pro team.",
    },
  ],
});
</script>

<template>
  <main class="mx-auto max-w-5xl px-6 py-16 md:py-24">
    <header class="mb-12 md:mb-16">
      <SectionLabel text="Blog" />
      <h1 class="text-4xl md:text-5xl font-black text-foreground leading-tight tracking-tight mt-2">
        Snack intelligence, delivered.
      </h1>
      <p class="mt-4 text-lg text-muted-foreground max-w-2xl">
        Insights, product updates, and field notes from the frontlines of enterprise snack management.
      </p>
    </header>

    <div v-if="posts.length" class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <NuxtLink
        v-for="post in posts"
        :key="post.id"
        :to="`/blog/${post.slug}`"
        class="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-intelligence/30 transition-colors"
      >
        <div class="aspect-[16/9] bg-muted overflow-hidden">
          <DyrectedImage
            v-if="post.featuredImage"
            :media="post.featuredImage"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div class="flex flex-col flex-1 p-6">
          <div class="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span v-if="authorName(post)" class="font-semibold">{{ authorName(post) }}</span>
            <span v-if="authorName(post) && post.publishedDate">•</span>
            <time v-if="post.publishedDate">{{ formatDate(post.publishedDate) }}</time>
          </div>
          <h2 class="text-xl font-bold text-foreground leading-snug group-hover:text-intelligence transition-colors">
            {{ post.title }}
          </h2>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            {{ excerpt(post.content) }}
          </p>
          <span class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-intelligence">
            Read article
            <svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-20 border border-dashed border-border rounded-2xl">
      <p class="text-muted-foreground">No articles published yet. Check back soon.</p>
    </div>
  </main>
</template>
