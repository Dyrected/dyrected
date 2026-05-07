import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  Database,
  ImageIcon,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Sparkles,
  ArrowRight,
  Globe,
  ShieldCheck
} from "lucide-react";
import { cn } from "./lib/utils";
import { DyrectedProvider, useDyrected } from "./providers/dyrected-provider";
import { QueryProvider } from "./providers/query-provider";
import { AdminShell } from "./components/layout/admin-shell";
import { CollectionListPage } from "./pages/collections/list-page";
import { EditEntryPage } from "./pages/collections/edit-page";
import { MediaPage } from "./pages/media/media-page";
import { GlobalEditorPage } from "./pages/globals/editor-page";
import { useState } from "react";
import { Button } from "./components/ui/button";
import { Link } from "react-router-dom";

function Dashboard() {
  const { client, config } = useDyrected();

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client
  });

  const collections = schemas?.collections || [];
  const globals = schemas?.globals || [];

  const collectionCounts = useQueries({
    queries: collections.map(col => ({
      queryKey: ["collection-count", col.slug],
      queryFn: () => client!.find(col.slug, { limit: 1 }),
      enabled: !!client && !!col.slug
    }))
  });

  if (isLoadingSchemas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (collections.length === 0 && globals.length === 0) {
    return <SetupPrompt config={config} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Monitor and manage your site's content and structure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Collections</h3>
              <p className="text-3xl font-semibold">{collections.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-secondary/10 p-2 text-secondary-foreground">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Global Configs</h3>
              <p className="text-3xl font-semibold">{globals.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-accent/10 p-2 text-accent-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Media Files</h3>
              <p className="text-3xl font-bold">-</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Recent Collections
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/collections">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {collections.slice(0, 5).map((col, idx) => (
              <Link
                key={col.slug}
                to={`/collections/${col.slug}`}
                className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">{col.labels?.plural || col.slug}</p>
                  <p className="text-xs text-muted-foreground uppercase">{col.slug}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {collectionCounts[idx]?.isLoading ? "..." : (collectionCounts[idx]?.data as any)?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Entries</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-secondary-foreground" />
              Global Settings
            </h3>
          </div>
          <div className="grid gap-3">
            {globals.slice(0, 5).map((glb) => (
              <Link
                key={glb.slug}
                to={`/globals/${glb.slug}`}
                className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium group-hover:text-secondary-foreground transition-colors">{glb.label || glb.slug}</p>
                  <p className="text-xs text-muted-foreground uppercase">{glb.slug}</p>
                </div>
                <div className="bg-secondary/10 px-2 py-1 rounded text-[10px] font-bold text-secondary-foreground uppercase">
                  Global
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SetupPrompt({ config }: { config: any }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'next' | 'nuxt' | 'react' | 'vue'>('next');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getPrompt = (framework: string) => {
    const base = `You are helping integrate Dyrected CMS into a ${framework} project. Complete the entire setup automatically using the details below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITE CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Site Name : ${config.siteName}
Site ID   : ${config.siteId}
API Key   : ${config.apiKey}
API URL   : ${config.baseUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — CONTENT MODEL (dyrected.config.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use \`defineCollection\`, \`defineGlobal\`, and \`defineConfig\` from '@dyrected/core'.

SUPPORTED FIELD TYPES:
  Primitive  : text | textarea | richText | number | boolean | date | email | url | json
  Choice     : select | multiSelect           (requires \`options: [{ label, value }]\`)
  Structural : array | object                 (requires nested \`fields: [...]\`)
  Relation   : relationship                   (requires \`collection: '<slug>'\`)
  Media      : image                          (use a relationship to an upload collection)
  Blocks     : blocks                         (requires \`blocks: [{ slug, labels, fields }]\`)

COLLECTION OPTIONS:
  \`upload: true\`   — turns this collection into a media library (file uploads)
  \`auth: true\`     — adds login/register/me endpoints; password field is auto-added
  \`admin.group\`    — groups this collection under a sidebar heading
  \`admin.useAsTitle\` — field to use as the display title in the admin list view
  \`admin.hidden\`   — hide from sidebar (useful for internal/system collections)

FIELD OPTIONS:
  \`required\`        — validation
  \`unique\`          — database-level uniqueness
  \`defaultValue\`    — fallback value
  \`admin.condition\` — (data) => boolean — show/hide field based on other field values
  \`admin.readOnly\`  — display-only in the form
  \`admin.hidden\`    — completely hidden from editor UI
  \`access.read\`     — ({ user }) => boolean — field-level read access
  \`access.update\`   — ({ user }) => boolean — field-level write access
  \`hooks.beforeChange\` — [async (value) => newValue] — transform value before save
  \`hooks.afterRead\`    — [async (value) => newValue] — transform value after read

BLOCKS EXPLAINED:
  A \`blocks\` field stores an ordered array of typed content blocks.
  Each block has a \`blockType\` discriminator and its own set of fields.
  The admin UI renders a drag-and-drop block editor automatically.
  On the frontend, iterate the array and switch on \`block.blockType\`.

COMPLETE EXAMPLE:
\`\`\`typescript
import { defineCollection, defineGlobal, defineConfig } from '@dyrected/core'

// ── Media ──────────────────────────────────────────
const media = defineCollection({
  slug: 'media',
  labels: { singular: 'Media Item', plural: 'Media' },
  upload: true,
  fields: [
    { name: 'alt', type: 'text', label: 'Alt Text' },
    { name: 'caption', type: 'textarea', label: 'Caption' },
  ],
})

// ── Authentication collection ───────────────────────
const customers = defineCollection({
  slug: 'customers',
  labels: { singular: 'Customer', plural: 'Customers' },
  auth: true,                  // adds /customers/login, /customers/me, etc.
  admin: { group: 'Membership' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    // 'password' is auto-added when auth: true
    { name: 'avatar', type: 'relationship', collection: 'media' },
    { name: 'role', type: 'select', options: [
        { label: 'Member', value: 'member' },
        { label: 'VIP', value: 'vip' },
    ]},
  ],
})

// ── Pages with blocks ───────────────────────────────
const pages = defineCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: { useAsTitle: 'title', group: 'Content' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug',  type: 'text', required: true, unique: true },
    { name: 'seo', type: 'object', fields: [
        { name: 'metaTitle',       type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
        { name: 'ogImage',         type: 'relationship', collection: 'media' },
    ]},
    // Flexible page builder using blocks
    {
      name: 'layout',
      type: 'blocks',
      label: 'Page Layout',
      blocks: [
        {
          slug: 'hero',
          labels: { singular: 'Hero', plural: 'Heroes' },
          fields: [
            { name: 'heading',    type: 'text',         required: true },
            { name: 'subheading', type: 'textarea' },
            { name: 'image',      type: 'relationship', collection: 'media' },
            { name: 'ctaLabel',   type: 'text' },
            { name: 'ctaLink',    type: 'url' },
          ],
        },
        {
          slug: 'richContent',
          labels: { singular: 'Rich Content', plural: 'Rich Content Blocks' },
          fields: [
            { name: 'content', type: 'richText', required: true },
          ],
        },
        {
          slug: 'imageGallery',
          labels: { singular: 'Image Gallery', plural: 'Image Galleries' },
          fields: [
            { name: 'title', type: 'text' },
            { name: 'images', type: 'array', fields: [
                { name: 'image',   type: 'relationship', collection: 'media' },
                { name: 'caption', type: 'text' },
            ]},
            { name: 'columns', type: 'select', options: [
                { label: '2 Columns', value: '2' },
                { label: '3 Columns', value: '3' },
                { label: '4 Columns', value: '4' },
            ]},
          ],
        },
        {
          slug: 'callToAction',
          labels: { singular: 'Call to Action', plural: 'Calls to Action' },
          fields: [
            { name: 'heading',     type: 'text', required: true },
            { name: 'description', type: 'textarea' },
            { name: 'buttonLabel', type: 'text' },
            { name: 'buttonLink',  type: 'url' },
            { name: 'theme', type: 'select', options: [
                { label: 'Primary',   value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
                { label: 'Dark',      value: 'dark' },
            ]},
          ],
        },
      ],
    },
  ],
})

// ── Posts ───────────────────────────────────────────
const posts = defineCollection({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  admin: { useAsTitle: 'title', group: 'Content' },
  fields: [
    { name: 'title',    type: 'text',         required: true },
    { name: 'slug',     type: 'text',         required: true, unique: true },
    { name: 'excerpt',  type: 'textarea' },
    { name: 'content',  type: 'richText' },
    { name: 'image',    type: 'relationship', collection: 'media' },
    { name: 'author',   type: 'relationship', collection: 'customers' },
    { name: 'tags',     type: 'multiSelect',  options: [
        { label: 'News',      value: 'news' },
        { label: 'Tutorial',  value: 'tutorial' },
        { label: 'Release',   value: 'release' },
    ]},
    { name: 'publishedAt', type: 'date' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft',     value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
  access: {
    // Anyone can read; only authenticated users can write
    read:   () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
  },
})

// ── Globals ─────────────────────────────────────────
const navigation = defineGlobal({
  slug: 'navigation',
  label: 'Navigation',
  fields: [
    {
      name: 'menuItems',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url',   type: 'url' },
        { name: 'page',  type: 'relationship', collection: 'pages' },
        { name: 'openInNewTab', type: 'boolean', defaultValue: false },
        { name: 'children', type: 'array', fields: [
            { name: 'label', type: 'text' },
            { name: 'url',   type: 'url' },
        ]},
      ],
    },
  ],
})

const settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  fields: [
    { name: 'siteName',    type: 'text' },
    { name: 'tagline',     type: 'text' },
    { name: 'logo',        type: 'relationship', collection: 'media' },
    { name: 'favicon',     type: 'relationship', collection: 'media' },
    { name: 'footerText',  type: 'textarea' },
    { name: 'socialLinks', type: 'object', fields: [
        { name: 'twitter',   type: 'url' },
        { name: 'instagram', type: 'url' },
        { name: 'linkedin',  type: 'url' },
    ]},
    { name: 'analyticsId', type: 'text', admin: { description: 'Google Analytics measurement ID' } },
  ],
})

export default defineConfig({
  collections: [media, customers, pages, posts],
  globals:     [navigation, settings],
})
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — FRONTEND IMPLEMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const frameworks: Record<string, string> = {
      next: `Install \`@dyrected/sdk\` (or \`@dyrected/next\` if you want Next.js server helpers).

SDK CLIENT SETUP (\`lib/dyrected.ts\`):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: '${config.baseUrl}',
  apiKey:  '${config.apiKey}',
  siteId:  '${config.siteId}',
})
\`\`\`

FETCHING COLLECTIONS (Server Component):
\`\`\`tsx
import { dyrected } from '@/lib/dyrected'

// List with filters
const { docs: posts } = await dyrected.collection('posts')
  .find({ where: { status: { equals: 'published' } }, sort: '-publishedAt', limit: 10 })

// Single document by ID
const post = await dyrected.collection('posts').findOne(id, { depth: 2 })
\`\`\`

FETCHING GLOBALS:
\`\`\`tsx
const settings   = await dyrected.global('settings').get()
const navigation = await dyrected.global('navigation').get()
\`\`\`

RENDERING BLOCKS (switch on \`blockType\`):
\`\`\`tsx
export function PageLayout({ layout }: { layout: any[] }) {
  return (
    <>
      {layout.map((block, i) => {
        switch (block.blockType) {
          case 'hero':          return <HeroBlock key={i} {...block} />
          case 'richContent':   return <RichContentBlock key={i} {...block} />
          case 'imageGallery':  return <GalleryBlock key={i} {...block} />
          case 'callToAction':  return <CTABlock key={i} {...block} />
          default:              return null
        }
      })}
    </>
  )
}
\`\`\`

AUTH (customer login):
\`\`\`ts
const { token, user } = await dyrected.collection('customers').login(email, password)
dyrected.setToken(token)   // adds Authorization header to all future requests
const me = await dyrected.collection('customers').me()
\`\`\``,

      nuxt: `Install \`@dyrected/nuxt\` and add it to \`nuxt.config.ts\`:
\`\`\`ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    baseUrl: '${config.baseUrl}',
    apiKey:  '${config.apiKey}',
    siteId:  '${config.siteId}',
  }
})
\`\`\`

FETCHING COLLECTIONS (auto-imported composables):
\`\`\`ts
// In a page or composable — useDyrected() returns the raw SDK client
const dyrected = useDyrected()

const { data: posts } = await useAsyncData('posts', () =>
  dyrected.collection('posts')
    .find({ where: { status: { equals: 'published' } }, sort: '-publishedAt' })
)
\`\`\`

FETCHING GLOBALS (\`useDyrectedGlobal\`):
\`\`\`ts
const { data: settings }   = await useDyrectedGlobal('settings')
const { data: navigation } = await useDyrectedGlobal('navigation')
\`\`\`

RENDERING BLOCKS in a Vue template:
\`\`\`vue
<template>
  <template v-for="(block, i) in page.layout" :key="i">
    <HeroBlock        v-if="block.blockType === 'hero'"         v-bind="block" />
    <RichContentBlock v-else-if="block.blockType === 'richContent'"  v-bind="block" />
    <GalleryBlock     v-else-if="block.blockType === 'imageGallery'" v-bind="block" />
    <CTABlock         v-else-if="block.blockType === 'callToAction'" v-bind="block" />
  </template>
</template>
\`\`\`

AUTH (\`useDyrectedAuth\`):
\`\`\`ts
const { login, logout, user, isLoggedIn, fetchMe } = useDyrectedAuth('customers')

// Login
await login(email, password)

// Rehydrate on app boot (reads persisted cookie)
await fetchMe()
\`\`\``,

      react: `Install \`@dyrected/sdk\`:

CLIENT SETUP (\`lib/dyrected.ts\`):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: '${config.baseUrl}',
  apiKey:  '${config.apiKey}',
  siteId:  '${config.siteId}',
})
\`\`\`

FETCHING DATA (with React Query):
\`\`\`tsx
import { useQuery } from '@tanstack/react-query'
import { dyrected } from '@/lib/dyrected'

function Posts() {
  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: () => dyrected.collection('posts')
      .find({ where: { status: { equals: 'published' } }, sort: '-publishedAt' }),
  })

  return data?.docs.map(post => <PostCard key={post.id} post={post} />)
}
\`\`\`

FETCHING GLOBALS:
\`\`\`ts
const settings = await dyrected.global('settings').get()
\`\`\`

RENDERING BLOCKS:
\`\`\`tsx
function PageLayout({ layout }) {
  return layout.map((block, i) => {
    switch (block.blockType) {
      case 'hero':          return <HeroBlock key={i} {...block} />
      case 'richContent':   return <RichContentBlock key={i} {...block} />
      case 'imageGallery':  return <GalleryBlock key={i} {...block} />
      case 'callToAction':  return <CTABlock key={i} {...block} />
      default: return null
    }
  })
}
\`\`\`

AUTH:
\`\`\`ts
const { token, user } = await dyrected.collection('customers').login(email, password)
dyrected.setToken(token)
\`\`\``,

      vue: `Install \`@dyrected/sdk\`:

CLIENT SETUP (\`lib/dyrected.ts\`):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: '${config.baseUrl}',
  apiKey:  '${config.apiKey}',
  siteId:  '${config.siteId}',
})
\`\`\`

FETCHING DATA IN A COMPONENT:
\`\`\`ts
import { ref, onMounted } from 'vue'
import { dyrected } from '@/lib/dyrected'

const posts = ref([])
onMounted(async () => {
  const res = await dyrected.collection('posts')
    .find({ where: { status: { equals: 'published' } }, sort: '-publishedAt' })
  posts.value = res.docs
})
\`\`\`

FETCHING GLOBALS:
\`\`\`ts
const settings = await dyrected.global('settings').get()
\`\`\`

RENDERING BLOCKS in template:
\`\`\`vue
<template v-for="(block, i) in page.layout" :key="i">
  <HeroBlock        v-if="block.blockType === 'hero'"         v-bind="block" />
  <RichContentBlock v-else-if="block.blockType === 'richContent'"  v-bind="block" />
  <GalleryBlock     v-else-if="block.blockType === 'imageGallery'" v-bind="block" />
  <CTABlock         v-else-if="block.blockType === 'callToAction'" v-bind="block" />
</template>
\`\`\`

AUTH:
\`\`\`ts
const { token, user } = await dyrected.collection('customers').login(email, password)
dyrected.setToken(token)
const me = await dyrected.collection('customers').me()
\`\`\``
    };

    return base + frameworks[framework] + `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Blocks are stored as \`[{ blockType: '<slug>', ...fields }]\` — always switch on \`blockType\` when rendering.
- \`client.collection(slug)\` is the primary API entrypoint. Do NOT use \`client.collections\`.
- Globals use \`client.global(slug).get()\` and \`client.global(slug).update(data)\`.
- After login, call \`client.setToken(token)\` to authenticate all subsequent requests.
- The password field on auth collections is automatically stripped from all responses.
- Relationship fields are populated to the specified \`depth\` (default: 1). Set \`depth: 0\` for IDs only.

API Reference: ${config.baseUrl}/api/docs`;
  };


  const aiDeveloperPrompt = getPrompt(activeTab);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-3 w-3" />
          Ready to launch
        </div>
        <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          Finish Your Site Setup
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your site has been created! Now let's connect it to your application using AI.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <section className="rounded-2xl border bg-card overflow-hidden shadow-xl">
          <div className="p-6 border-b bg-muted/30">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Site Credentials
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Site ID", value: config.siteId, id: "siteId" },
                { label: "API Key", value: config.apiKey, id: "apiKey" },
                { label: "Base URL", value: config.baseUrl, id: "baseUrl" },
              ].map((item) => (
                <div key={item.id} className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{item.label}</label>
                  <div className="relative group">
                    <div className="p-3 pr-10 rounded-lg bg-muted text-sm font-mono truncate border border-transparent group-hover:border-primary/20 transition-all">
                      {item.value}
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value || "", item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground"
                    >
                      {copied === item.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card overflow-hidden shadow-xl ring-1 ring-primary/20">
          <div className="p-6 border-b bg-primary/5 flex items-center justify-between">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                AI Integration
              </h3>
              <div className="flex gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                {(['next', 'nuxt', 'react', 'vue'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                      activeTab === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === 'next' ? 'Next.js' : tab === 'nuxt' ? 'Nuxt' : tab}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Copy and paste this into your AI developer to handle everything automatically</p>
            </div>
            <Button
              onClick={() => copyToClipboard(aiDeveloperPrompt, "ai-developer")}
              className="relative overflow-hidden group"
            >
              <div className="flex items-center gap-2">
                {copied === "ai-developer" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "ai-developer" ? "Copied!" : "Copy Full Prompt"}
              </div>
            </Button>
          </div>
          <div className="p-6 bg-slate-950 text-slate-300 font-mono text-xs leading-relaxed max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <pre className="whitespace-pre-wrap">{aiDeveloperPrompt}</pre>
          </div>
        </section>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" asChild>
          <a href={`${config.baseUrl}/api/docs`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            API Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}


function CollectionRoute() {
  const { slug } = useParams();
  const { client } = useDyrected();

  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client
  });

  const schema = schemas?.collections.find((c: any) => c.slug === slug);

  if (schema?.upload) {
    return <MediaPage collectionSlug={slug!} />;
  }

  return <CollectionListPage slug={slug!} />;
}

export interface AdminUIProps {
  apiKey: string;
  baseUrl: string;
  siteId?: string;
}

export function AdminUI({ apiKey, baseUrl, siteId }: AdminUIProps) {
  return (
    <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
      <QueryProvider>
        <MemoryRouter>
          <AdminShell isEmbedded>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/collections/:slug" element={<CollectionRoute />} />
              <Route path="/collections/:slug/new" element={<EditEntryPage />} />
              <Route path="/collections/:slug/edit/:id" element={<EditEntryPage />} />
              <Route path="/globals/:slug" element={<GlobalEditorPage />} />
            </Routes>
          </AdminShell>
        </MemoryRouter>
      </QueryProvider>
    </DyrectedProvider>
  );
}
