# Dyrected SEO & Social Metadata Plugin Spec (`@dyrected/plugin-seo`)

**Status:** Proposed / Future Architecture  
**Package:** `@dyrected/plugin-seo`  
**Inspiration:** Yoast SEO, Payload SEO Plugin, Next.js Metadata API, Vercel OG (Satori)  

---

## 1. Overview & Motivation

Search engine optimization and social share previews (Google, Twitter/X, Facebook, LinkedIn, WhatsApp, Slack) are essential for every modern website, agency client portal, and event page.

Without a dedicated SEO plugin:
- Content editors have no way to customize how pages appear when shared on social media or search results.
- Developers must manually wire up boilerplate OpenGraph tags, JSON-LD structured data, XML sitemaps, and robots.txt routes.

### The Solution: `@dyrected/plugin-seo`
A zero-config, first-class plugin that:
1. Automatically injects standard SEO fields into designated collections (e.g. `pages`, `posts`, `events`, `case-studies`).
2. Provides a **live interactive SERP & Social Card preview** in the Admin dashboard.
3. Dynamically generates branded 1200x630 **OpenGraph banner images** on the fly.
4. Auto-generates dynamic `/sitemap.xml` and `/robots.txt` endpoints.
5. Exports drop-in helpers for Next.js (`generateMetadata`) and Nuxt 3 (`useSeoMeta`).

---

## 2. Plugin Configuration & Field Injection

### 2.1 Configuration in `dyrected.config.ts`

```ts
import { seoPlugin } from '@dyrected/plugin-seo'

export default defineConfig({
  plugins: [
    seoPlugin({
      // Collections to attach SEO fields to
      collections: ['pages', 'posts', 'case-studies', 'events'],
      // Fallback defaults if fields are empty
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => `${doc.title} | Acme Studio`,
      generateDescription: ({ doc }) => doc.excerpt || doc.content?.slice(0, 155),
      generateOgImage: true, // Enables dynamic SVG/PNG banner generator
    }),
  ],
})
```

### 2.2 Auto-Injected Schema Fields

When registered, the plugin injects a collapsible `SEO & Social Metadata` field group:

```ts
{
  name: 'seo',
  type: 'group',
  label: 'SEO & Social Share Preview',
  admin: {
    position: 'sidebar', // or collapsible panel at bottom
  },
  fields: [
    {
      name: 'metaTitle',
      type: 'text',
      label: 'Meta Title',
      admin: {
        description: 'Recommended: 50–60 characters',
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      label: 'Meta Description',
      admin: {
        description: 'Recommended: 120–160 characters',
      },
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Social Share Image (1200x630)',
    },
    {
      name: 'canonicalUrl',
      type: 'text',
      label: 'Canonical URL (Optional)',
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      label: 'Hide from search engines (noindex)',
      defaultValue: false,
    },
    {
      name: 'schemaType',
      type: 'select',
      label: 'Structured Data Type (JSON-LD)',
      options: ['Article', 'Event', 'Organization', 'FAQPage', 'Product', 'WebPage'],
      defaultValue: 'WebPage',
    },
  ],
}
```

---

## 3. Interactive Admin UI: Live SERP & Social Preview

Inside the document editor, editors can switch between real-time simulated previews:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍 SEO & SOCIAL SHARE PREVIEW                                               │
│ [ 🌐 Google Search ]   [ 🐦 Twitter / X ]   [ 📱 WhatsApp / LinkedIn ]      │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  acme.com › blog › wedding-planning-guide                                   │
│  The Ultimate 2026 Wedding Planning Checklist | Acme Studio                 │
│  Everything you need to know about managing RSVPs, seating charts, and      │
│  catering choices with zero stress. Free downloadable template included.    │
│                                                                             │
│  Title Length: 58 / 60 chars  🟢 Good                                       │
│  Description:  142 / 160 chars 🟢 Good                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Automated Dynamic OpenGraph Image Generation

When `generateOgImage: true` is enabled, the plugin exposes an edge-compatible OG image generator endpoint:

```
GET /api/plugins/seo/og-image?collection=posts&id=123
```

* **Technology:** Uses Satori / SVG rendering (zero heavy Chromium/Puppeteer dependencies).
* **Output:** Generates a lightweight 1200x630 PNG with the document title, author photo, date, and brand logo.
* **Auto-fallback:** If the editor does not upload a custom `ogImage`, this dynamic generator URL is automatically served in meta tags.

---

## 5. Dynamic Sitemap & Robots.txt Generation

The plugin registers public crawler routes:

### 5.1 Dynamic Sitemap (`GET /sitemap.xml`)
Automatically queries all enabled collections, filters out `noIndex: true` and draft documents, and outputs valid XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://acme.com/</loc>
    <lastmod>2026-09-01T12:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://acme.com/blog/wedding-guide</loc>
    <lastmod>2026-09-03T16:00:00Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 5.2 Dynamic Robots (`GET /robots.txt`)
```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://acme.com/sitemap.xml
```

---

## 6. Frontend Framework Integration Helpers

### 6.1 Next.js 14+ App Router (`app/blog/[slug]/page.tsx`)

```tsx
import { getDyrectedMetadata } from '@dyrected/plugin-seo/next'
import { client } from '@/lib/dyrected'

export async function generateMetadata({ params }) {
  const post = await client.collection('posts').findOne({
    where: { slug: { equals: params.slug } },
  })

  return getDyrectedMetadata(post, {
    siteUrl: 'https://acme.com',
    siteName: 'Acme Studio',
    twitterHandle: '@acmestudio',
  })
}
```

### 6.2 Nuxt 3 (`pages/blog/[slug].vue`)

```vue
<script setup>
import { useDyrectedSeo } from '@dyrected/plugin-seo/nuxt'

const { data: post } = await useAsyncData('post', () => 
  client.collection('posts').findOne({ where: { slug: route.params.slug } })
)

useDyrectedSeo(post, {
  siteUrl: 'https://acme.com',
  siteName: 'Acme Studio',
})
</script>
```

---

## 7. Implementation Checklist

- [ ] **Step 1: Plugin Definition (`packages/plugins/seo/src/index.ts`)**  
  Export `seoPlugin(options)` with field schema injector and default generators.
- [ ] **Step 2: Admin Live SERP Component (`packages/plugins/seo/src/ui/SeoPreview.tsx`)**  
  Add tabbed SERP, Twitter, and Facebook preview widget with live character counters.
- [ ] **Step 3: Dynamic OG Image Endpoint**  
  Implement `/api/plugins/seo/og-image` using Satori SVG template.
- [ ] **Step 4: Sitemap & Robots Routes**  
  Register `/sitemap.xml` and `/robots.txt` handlers querying active collections.
- [ ] **Step 5: Next.js & Nuxt Framework Adapters**  
  Export `getDyrectedMetadata()` and `useDyrectedSeo()`.
