export interface SetupPromptConfig {
  siteName?: string;
  siteId?: string;
  apiKey?: string;
  baseUrl?: string;
  isSelfHosted?: boolean;
}

export function generateAIPrompt(activeTab: "next" | "nuxt" | "react" | "vue", config: SetupPromptConfig) {
  const frameworkLabel =
    activeTab === "next"
      ? "Next.js"
      : activeTab === "nuxt"
        ? "Nuxt"
        : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const backendPkg = activeTab === "nuxt" ? "@dyrected/nuxt" : "@dyrected/next";
  const isSelfHosted = config.isSelfHosted ?? (config.baseUrl?.includes("localhost") || !config.apiKey);

  const baseIntro = isSelfHosted
    ? `You are a Senior Content Architect. Your mission is to integrate Dyrected CMS into a ${config.siteName || "new"} project using ${frameworkLabel}. This is a SELF-HOSTED installation.\nThe backend is already configured via ${backendPkg}.\nYour priority is DATA PRESERVATION and creating a CMS that empowers marketing teams.`
    : `You are a Senior Content Architect. Your mission is to integrate Dyrected CMS into a ${config.siteName || "new"} project using ${frameworkLabel}. Complete the entire setup automatically, including embedding the Admin UI and syncing the schema. Your priority is DATA PRESERVATION and marketing independence.`;

  const credentials = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITE CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${config.siteName ? `Site Name : ${config.siteName}\n` : ""}${isSelfHosted ? "" : `Site ID   : ${config.siteId}\nAPI Key   : ${config.apiKey}\n`}API URL   : ${config.baseUrl || "http://localhost:3000"}
`;

  const importantNotes = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT NOTES — READ BEFORE ACTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- \`client.collection(slug)\` is the primary API entrypoint. Do NOT use \`client.collections\`.
- Blocks are stored as \`[{ blockType: '<slug>', ...fields }]\` — always switch on \`blockType\` when rendering.
- MARKETING INDEPENDENCE: Always use a dynamic \`pages\` collection with a catch-all route. Marketing should create pages without a developer. (Exceptions: Special pages like Contact or those with complex forms may use static routes).
- AUTO-SEEDING: Use \`initialData\` in all data fetches to ensure the site is never empty on first load.
- Globals use \`client.global(slug).get()\` and \`client.global(slug).update(data)\`.
- Relationship fields are populated to the specified \`depth\` (default: 1). Set \`depth: 0\` for IDs only.
- SYNC SCHEMA: After creating the content model, you MUST execute \`npx @dyrected/cli sync:schema\` immediately. This is non-negotiable for a working setup.
- EMBED ADMIN: You MUST create a route (e.g. \`/admin\`) and mount the Admin UI components described below.
- ALL-IN-ONE: Your goal is to give the user a project that is READY TO SHIP. Do the setup, do the embedding, and do the sync in one go.
`;

  const strategy = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 0 — DATA PRESERVATION & STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. BACKUP: If an existing site is provided, you MUST extract all current content (text, assets, structure) and save it into a \`migration/\` folder as structured .md files BEFORE modifying any code. Never lose data.
2. DISCOVERY: If NO existing site is provided, STOP and ask the user:
   - "What are your core content types (e.g. Services, Team, Blog)?"
   - "How do you want your marketing team to manage the page layouts?"
3. ARCHITECTURAL CREATIVITY: Design the CMS for longevity. Use \`blocks\` for flexible page builders, \`globals\` for site settings, and \`collections\` for repeated content.

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
  \`admin.condition\` — "expression" — Jexl string expression to show/hide field (e.g. "status == \\"published\\"")
  \`admin.layout\`    — "radio" | "dropdown" — Visual layout for select/multiSelect
  \`admin.direction\` — "vertical" | "horizontal" — Layout direction for radio groups
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
    { name: 'avatar', type: 'relationship', relationTo: 'media' },
    { name: 'role', type: 'select', admin: { layout: 'radio' }, options: [
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
        { name: 'ogImage',         type: 'relationship', relationTo: 'media' },
    ]},
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
            { name: 'image',      type: 'relationship', relationTo: 'media' },
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
      ],
    },
  ],
})

export default defineConfig({
  collections: [media, customers, pages],
  admin: {
    branding: {
      primaryColor: '#4f46e5',
      logo: '/logo.png',
    }
  }
})
\`\`\`

${
  isSelfHosted
    ? ""
    : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — CHOOSE YOUR MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The developer can choose between two modes:

1. CLOUD MODE (Managed)
   - Use the SITE CREDENTIALS above.
   - Point baseUrl to ${config.baseUrl}.
   - Content is stored in Dyrected Cloud.

2. SELF-HOSTED MODE (Core)
   - Do NOT use apiKey/siteId (unless for proxying).
   - Use a database adapter like \`SqliteAdapter\` from '@dyrected/db-sqlite'.
   - Content is stored locally in the developer's project.
`
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP ${isSelfHosted ? "2" : "3"} — MOUNTING THE ADMIN UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Admin UI can be mounted on any path (e.g. /cms-admin).
Pass the \`basename\` prop to the \`<AdminUI />\` component to match your route.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP ${isSelfHosted ? "3" : "4"} — FRONTEND IMPLEMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const frameworks: Record<string, string> = {
    next: `Install \`@dyrected/next\` and \`@dyrected/admin\`.

1. **SDK Setup** (\`lib/dyrected.ts\`):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: '${config.baseUrl || "http://localhost:3000"}',${
    isSelfHosted
      ? ""
      : `
  apiKey:  '${config.apiKey}',
  siteId:  '${config.siteId}',`
  }
})
\`\`\`

2. **Admin Dashboard** (\`app/admin/[[...slug]]/page.tsx\`):
\`\`\`tsx
import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  return <DyrectedAdmin basename="/admin" />
}
\`\`\`
`,

    nuxt: `Install \`@dyrected/nuxt\` and add it to \`nuxt.config.ts\`:
\`\`\`ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    baseUrl: '${config.baseUrl || "http://localhost:3000"}',${
      isSelfHosted
        ? ""
        : `
    apiKey:  '${config.apiKey}',
    siteId:  '${config.siteId}',`
    }
  },
})
\`\`\`

MOUNTING THE ADMIN DASHBOARD (\`pages/admin.vue\`):
\`\`\`vue
<script setup lang="ts">
// DyrectedAdmin is auto-imported by the module
definePageMeta({ layout: false })
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin basename="/admin" />
  </ClientOnly>
</template>
\`\`\`
`,

    react: `Install \`@dyrected/sdk\`:

CLIENT SETUP (\`lib/dyrected.ts\`):
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

MOUNTING THE ADMIN DASHBOARD (\`pages/admin.tsx\`):
\`\`\`tsx
import { AdminUI } from '@dyrected/admin'
import '@dyrected/admin/styles'

export default function AdminPage() {
  return (
    <div style={{ height: '100vh' }}>
      <AdminUI 
        apiKey='${config.apiKey}'
        siteId='${config.siteId}'
        baseUrl='${config.baseUrl || "https://api.dyrected.cloud"}'
      />
    </div>
  )
}
\`\`\`
`,

    vue: `Install \`@dyrected/sdk\`:

CLIENT SETUP (\`lib/dyrected.ts\`):
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

MOUNTING THE ADMIN DASHBOARD (\`pages/admin.vue\`):
\`\`\`vue
<template>
  <div ref="container" style="height: 100vh" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { renderAdminUI } from '@dyrected/admin'
import '@dyrected/admin/styles'

const container = ref(null)
onMounted(() => {
  renderAdminUI(container.value, {
    apiKey: '${config.apiKey}',
    siteId: '${config.siteId}',
    baseUrl: '${config.baseUrl || "https://api.dyrected.cloud"}'
  })
})
</script>
\`\`\`
`,
  };

  return (
    baseIntro +
    credentials +
    importantNotes +
    strategy +
    (frameworks[activeTab] || frameworks.next) +
    `
  API Reference: https://docs.dyrected.com`
  );
}
