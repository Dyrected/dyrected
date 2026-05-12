export interface SetupPromptConfig {
  siteName?: string;
  siteId?: string;
  apiKey?: string;
  baseUrl?: string;
  isSelfHosted?: boolean;
  existingSite?: boolean;
}

// ─────────────────────────────────────────────
// Section builders
// ─────────────────────────────────────────────

function buildEnvironmentSection(frameworkLabel: string, isSelfHosted: boolean, config: SetupPromptConfig): string {
  const credentialLines = isSelfHosted ? "" : `- Site ID  : ${config.siteId}\n- API Key  : ${config.apiKey}`;

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Framework : ${frameworkLabel}
- Host Type : ${isSelfHosted ? "Self-Hosted (Local/Private Server)" : "Managed (Dyrected Cloud)"}
- API Base  : ${config.baseUrl || "http://localhost:3000"}
${credentialLines}`;
}

function buildDiagnosticSection(existingSite: boolean): string {
  if (existingSite) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PHASE 0 — DIAGNOSTIC (EXISTING SITE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing any code, scan the existing codebase and report:
- All hardcoded text strings that should be CMS-managed
- All repeated data structures that should become collections
- All static pages that marketing will want to edit independently
- Any existing fetch or API calls that overlap with Dyrected

Then propose a backup plan: extract all current content into a
migration/ folder as structured .md or .json files BEFORE
modifying any code.

Do NOT write any implementation code until you have reported
your findings and the user has confirmed the content plan.`;
  }

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PHASE 0 — DISCOVERY (NEW SITE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a new project. Before designing the content model, ask:
- "What are your core content types? (e.g. Services, Team, Blog, Projects)"
- "Which pages should marketing manage independently with blocks?"
- "Are there any pages that must remain static and never become CMS-managed?"
- "What is the primary goal of the site — marketing, e-commerce, portfolio, SaaS?"

Do NOT write any code until the user has answered these questions.`;
}

function buildConstraintsSection(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. ARCHITECTURE & CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- API ACCESS         : Use client.collection(slug) as the only entry point.
- ZERO-STATE         : Always use initialData in all data fetches so the site
                       renders correctly on first load and never throws during render.
- MARKETING FREEDOM  : Use a dynamic pages collection with a catch-all route
                       so marketing can create and manage pages without a developer.
- BLOCKS DESIGN      : Use blocks for flexible page builders. Store as
                       [{ blockType: 'slug', ...fields }] and switch on blockType
                       in the frontend renderer.
- DATA SAFETY        : Never overwrite or drop existing content or pages.
                       Preserve everything before making changes.
- RESILIENCE         : If Dyrected backend is unreachable, fall back to
                       initialData and show stale content — never an error page.
                       All relationship fields must handle null gracefully.
                       Every block renderer must have a default fallback case.`;
}

function buildSchemaRulesSection(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. SCHEMA EVOLUTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never drop existing fields from the schema. Mark unused fields as deprecated only.
- All new fields must have a defaultValue.
- Never rename a field slug — add a new field and migrate data separately.
- Run npx @dyrected/cli sync:schema after every config change.`;
}

function buildDoNotSection(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. DO NOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Do NOT use client.collections — always use client.collection(slug).
- Do NOT add custom auth middleware to the admin route.
  Dyrected handles admin authentication internally. Do not wrap,
  protect, or redirect the admin route yourself.
- Do NOT use renderAdminUI in a Nuxt project. Use the DyrectedAdmin
  component which is auto-imported by @dyrected/nuxt.
- Do NOT modify or overwrite existing pages without first preserving their data.
- Do NOT drop, rename, or remove fields from an existing schema.
- Do NOT integrate blog posts or testimonials unless explicitly requested.
- Do NOT skip the diagnostic or discovery phase.`;
}

function buildTechnicalReferenceSection(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. TECHNICAL REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use defineCollection, defineGlobal, and defineConfig from '@dyrected/core'.

FIELD TYPES:
- Primitive  : text | textarea | richText | number | boolean | date | email | url | json
- Choice     : select | multiSelect           (requires options: [{ label, value }])
- Structural : array | object                 (requires nested fields: [...])
- Relation   : relationship                   (requires collection: '<slug>')
- Media      : relationship to an upload collection (e.g. 'media')
- Blocks     : blocks                         (requires blocks: [{ slug, labels, fields }])

COLLECTION OPTIONS:
- upload: true       — media library with file upload support
- auth: true         — adds login/me endpoints; password field is auto-managed
- admin.useAsTitle   — field used as display title in admin list view
- admin.group        — groups collection under a sidebar heading
- admin.hidden       — hides collection from the sidebar (internal/system use)

FIELD OPTIONS:
- required           — validation
- unique             — database-level uniqueness constraint
- defaultValue       — fallback value (required on all new fields added to existing schemas)
- admin.condition    — Jexl expression string to conditionally show/hide field
                       e.g. "status == \\"published\\""
- admin.readOnly     — display only, not editable
- admin.hidden       — hidden from editor UI entirely
- hooks.beforeChange — [async (value) => newValue] transform before save
- hooks.afterRead    — [async (value) => newValue] transform after read

GLOBALS:
Use defineGlobal for single-instance documents like site settings or navigation.
Access via client.global(slug).get() and client.global(slug).update(data).

BLOCKS:
Blocks are stored as [{ blockType: '<slug>', ...fields }].
The admin renders a drag-and-drop block editor automatically.
On the frontend, iterate the array and switch on block.blockType.
Always include a default case in your switch for unknown block types.

COMPLETE SCHEMA EXAMPLE:
\`\`\`ts
import { defineCollection, defineGlobal, defineConfig } from '@dyrected/core'
import { MongoAdapter } from '@dyrected/db-mongodb'
import { S3StorageAdapter } from '@dyrected/storage-s3'

const media = defineCollection({
  slug: 'media',
  upload: true,
  fields: [
    { name: 'alt', type: 'text', label: 'Alt Text' },
  ],
})

const pages = defineCollection({
  slug: 'pages',
  admin: { useAsTitle: 'title', group: 'Content' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug',  type: 'text', required: true, unique: true },
    { name: 'seo', type: 'object', fields: [
      { name: 'metaTitle',       type: 'text' },
      { name: 'metaDescription', type: 'textarea' },
      { name: 'ogImage',         type: 'relationship', collection: 'media' },
    ]},
    {
      name: 'layout',
      type: 'blocks',
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

const settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  fields: [
    { name: 'siteName',   type: 'text' },
    { name: 'tagline',    type: 'text' },
    { name: 'logo',       type: 'relationship', collection: 'media' },
    { name: 'footerText', type: 'textarea' },
  ],
})

export default defineConfig({
  collections: [media, pages],
  globals: [settings],
  db: new MongoAdapter({
    url: process.env.DATABASE_URL!,
    dbName: 'dyrected_cms',
  }),
  storage: new S3StorageAdapter({
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  }),
})
\`\`\``;
}

function buildDeliverablesSection(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. REQUIRED DELIVERABLES — IN THIS ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return your response in exactly this order. Do not combine steps. Do not skip steps.

1. Diagnostic findings (what exists, what needs to become CMS-managed)
2. dyrected.config.ts — complete file
3. Admin route file — complete file
4. Catch-all frontend page route — complete file
5. Block components — names and fields only
6. Migration/fallback strategy — numbered steps
7. Schema sync command

API Reference: https://docs.dyrected.com`;
}

// ─────────────────────────────────────────────
// Framework-specific implementation sections
// ─────────────────────────────────────────────

function buildFrameworkSection(
  activeTab: "next" | "nuxt" | "react" | "vue",
  isSelfHosted: boolean,
  config: SetupPromptConfig,
): string {
  const envPrefix = activeTab === "next" ? "NEXT_PUBLIC_" : activeTab === "nuxt" ? "NUXT_PUBLIC_" : "";

  const credentialEnvLines = isSelfHosted
    ? ""
    : `
  apiKey:  process.env.${envPrefix}DYRECTED_API_KEY || '${config.apiKey}',
  siteId:  process.env.${envPrefix}SITE_ID || '${config.siteId}',`;

  const baseUrlLine = `process.env.${envPrefix}DYRECTED_URL || '${config.baseUrl || "http://localhost:3000"}'`;

  const sections: Record<string, string> = {
    next: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. IMPLEMENTATION — Next.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SDK Setup (lib/dyrected.ts):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: ${baseUrlLine},${credentialEnvLines}
})
\`\`\`

2. Admin Route (app/admin/[[...slug]]/page.tsx):
\`\`\`tsx
import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  // DyrectedAdmin handles routing, auth, and CSS automatically.
  // Do NOT wrap this in custom auth middleware.
  return <DyrectedAdmin basename="/admin" />
}
\`\`\`

3. Catch-all Page Route (app/[...slug]/page.tsx):
\`\`\`tsx
import { dyrected } from '@/lib/dyrected'

export default async function CmsPage({ params }: { params: { slug: string[] } }) {
  const slug = params.slug?.join('/') || 'home'
  const page = await dyrected.collection('pages').findOne({ where: { slug: { equals: slug } } })

  if (!page) return <div>Page not found</div>

  return (
    <main>
      {page.layout?.map((block: any, i: number) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </main>
  )
}
\`\`\``,

    nuxt: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. IMPLEMENTATION — Nuxt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Nuxt Config (nuxt.config.ts):
\`\`\`ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    baseUrl: process.env.${envPrefix}DYRECTED_URL || '${config.baseUrl || "http://localhost:3000"}',${
      isSelfHosted
        ? ""
        : `
    apiKey:  process.env.${envPrefix}DYRECTED_API_KEY || '${config.apiKey}',
    siteId:  process.env.${envPrefix}SITE_ID || '${config.siteId}',`
    }
  },
})
\`\`\`

2. Admin Route (pages/admin.vue):
\`\`\`vue
<script setup lang="ts">
// DyrectedAdmin is auto-imported by @dyrected/nuxt.
// Do NOT manually import it.
// Do NOT use renderAdminUI here.
// Do NOT add custom auth middleware — Dyrected handles authentication.
definePageMeta({ layout: false })
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin basename="/admin" />
  </ClientOnly>
</template>
\`\`\`

3. Catch-all Page Route (pages/[...slug].vue):
\`\`\`vue
<script setup lang="ts">
const route = useRoute()
const slug = computed(() => 
  Array.isArray(route.params.slug) 
    ? route.params.slug.join('/') 
    : route.params.slug || 'home'
)

const { data: page } = await useDyrected('pages').findOne({
  where: { slug: { equals: slug.value } },
  initialData: null,
})
</script>

<template>
  <main v-if="page">
    <BlockRenderer
      v-for="(block, i) in page.layout"
      :key="i"
      :block="block"
    />
  </main>
  <div v-else>Page not found</div>
</template>
\`\`\``,

    react: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. IMPLEMENTATION — React
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SDK Setup (lib/dyrected.ts):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: '${config.baseUrl || "https://api.dyrected.cloud"}',${
    isSelfHosted
      ? ""
      : `
  apiKey:  '${config.apiKey}',
  siteId:  '${config.siteId}',`
  }
})
\`\`\`

2. Admin Route (pages/admin.tsx):
\`\`\`tsx
import { AdminUI } from '@dyrected/admin'
import '@dyrected/admin/styles'

export default function AdminPage() {
  return (
    <div style={{ height: '100vh' }}>
      <AdminUI
        baseUrl="${config.baseUrl || "https://api.dyrected.cloud"}"${
          isSelfHosted
            ? ""
            : `
        apiKey="${config.apiKey}"
        siteId="${config.siteId}"`
        }
      />
    </div>
  )
}
\`\`\``,

    vue: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. IMPLEMENTATION — Vue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SDK Setup (lib/dyrected.ts):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: '${config.baseUrl || "https://api.dyrected.cloud"}',${
    isSelfHosted
      ? ""
      : `
  apiKey:  '${config.apiKey}',
  siteId:  '${config.siteId}',`
  }
})
\`\`\`

2. Admin Route (pages/admin.vue):
\`\`\`vue
<template>
  <div ref="container" style="height: 100vh" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { renderAdminUI } from '@dyrected/admin'
import '@dyrected/admin/styles'

const container = ref(null)
let cleanup: (() => void) | undefined

onMounted(() => {
  cleanup = renderAdminUI(container.value, {
    baseUrl: '${config.baseUrl || "https://api.dyrected.cloud"}',${
      isSelfHosted
        ? ""
        : `
    apiKey: '${config.apiKey}',
    siteId: '${config.siteId}',`
    }
  })
})

onUnmounted(() => cleanup?.())
</script>
\`\`\``,
  };

  return sections[activeTab] || sections.next;
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

export function generateAIPrompt(activeTab: "next" | "nuxt" | "react" | "vue", config: SetupPromptConfig): string {
  const frameworkLabel =
    activeTab === "next"
      ? "Next.js"
      : activeTab === "nuxt"
        ? "Nuxt"
        : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  const isSelfHosted = config.isSelfHosted === true || (!config.apiKey && !config.siteId);

  const existingSite = config.existingSite ?? false;

  const sections = [
    `You are a Senior Content Architect. Your mission is to integrate Dyrected CMS into a ${frameworkLabel} project. Your priority is DATA PRESERVATION and creating a CMS that empowers marketing teams to move independently without raising tickets to engineering.`,
    buildEnvironmentSection(frameworkLabel, isSelfHosted, config),
    buildDiagnosticSection(existingSite),
    buildConstraintsSection(),
    buildSchemaRulesSection(),
    buildDoNotSection(),
    buildTechnicalReferenceSection(),
    buildDeliverablesSection(),
    buildFrameworkSection(activeTab, isSelfHosted, config),
  ];

  return sections.join("\n");
}
