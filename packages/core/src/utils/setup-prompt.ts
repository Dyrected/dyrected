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
  const isSelfHosted = config.isSelfHosted ?? (config.baseUrl?.includes("localhost") || !config.apiKey);
  const envPrefix = activeTab === "next" ? "NEXT_PUBLIC_" : activeTab === "nuxt" ? "NUXT_PUBLIC_" : "";

  const mission = `You are a Senior Content Architect. Your mission is to create a robust CMS integration plan for a ${frameworkLabel} website using Dyrected CMS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Framework: ${frameworkLabel}
- Host Type: ${isSelfHosted ? "Self-Hosted (Local/Private Server)" : "Managed (Dyrected Cloud)"}
- API Base : ${config.baseUrl || "http://localhost:3000"}
${isSelfHosted ? "" : `- Site ID  : ${config.siteId}\n- API Key  : ${config.apiKey}`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ARCHITECTURE & CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- API ACCESS: Use \`client.collection(slug)\` as the primary entry point. Do NOT use \`client.collections\`.
- ZERO-STATE ROBUSTNESS: Always use \`initialData\` in all data fetches to ensure the site renders correctly on first load.
- MARKETING INDEPENDENCE: Use a dynamic \`pages\` collection with a catch-all route for marketing-managed pages. 
- BLOCKS-BASED DESIGN: Use \`blocks\` for flexible page builders. Iterate the array and switch on \`blockType\` in your frontend.
- DATA PRESERVATION: Do NOT modify or overwrite existing pages without first extracting and preserving their data.
- NO DEPRECATIONS: Use the framework-specific \`DyrectedAdmin\` components (Next/Nuxt) which handle routing and CSS automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. REQUIRED DELIVERABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your final response MUST include:
1. A complete content model plan (\`dyrected.config.ts\`).
2. The Admin UI mounting route (e.g. \`/admin\`) using the specialized \`DyrectedAdmin\` component.
3. A catch-all frontend page route for CMS-managed dynamic pages.
4. A block type list covering existing site sections (Hero, Content, CTA, etc.).
5. A migration/fallback strategy for current static pages.
6. A safe schema sync step using \`npx @dyrected/cli sync:schema\`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PHASE 0 — DISCOVERY & PRESERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing any code, you MUST:
1. BACKUP: Propose a plan to save current site content into a \`migration/\` folder.
2. ASK QUESTIONS: If the site content types are unknown, ask the user:
   - "What are your core content types (Services, Team, Projects)?"
   - "Which existing pages must remain static vs. becoming dynamic?"
   - "What layouts should marketing be able to manage with blocks?"
   - "What existing hardcoded sections must be preserved?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. TECHNICAL REFERENCE (Field Types & Syntax)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use \`defineCollection\`, \`defineGlobal\`, and \`defineConfig\` from '@dyrected/core'.

FIELD TYPES:
- Primitive  : text | textarea | richText | number | boolean | date | email | url | json
- Choice     : select | multiSelect (requires \`options: [{ label, value }]\`)
- Structural : array | object (requires \`fields: [...]\`)
- Relation   : relationship (requires \`collection: '<slug>'\`)
- Media      : relationship to an upload collection (e.g. 'media')
- Blocks     : blocks (requires \`blocks: [{ slug, labels, fields }]\`)

COLLECTION OPTIONS:
- \`upload: true\`: Use for media libraries.
- \`auth: true\`: Adds auth endpoints (login/me) and an auto-managed password field.
- \`admin.useAsTitle\`: Field to display in admin lists.

BLOCKS SYNTAX:
Blocks are stored as \`[{ blockType: 'slug', ...fields }]\`. The Admin UI renders a drag-and-drop editor for these automatically.

SCHEMA EXAMPLE:
\`\`\`ts
import { defineCollection, defineConfig } from '@dyrected/core'

const media = defineCollection({
  slug: 'media',
  upload: true,
  fields: [{ name: 'alt', type: 'text' }]
})

const pages = defineCollection({
  slug: 'pages',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'layout', type: 'blocks', blocks: [
      { slug: 'hero', fields: [{ name: 'title', type: 'text' }] }
    ]}
  ]
})

export default defineConfig({ collections: [media, pages] })
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. IMPLEMENTATION DETAILS (${frameworkLabel})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const frameworks: Record<string, string> = {
    next: `1. **SDK Setup** (\`lib/dyrected.ts\`):
\`\`\`ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  baseUrl: process.env.${envPrefix}DYRECTED_URL || '${config.baseUrl || "http://localhost:3000"}',${
    isSelfHosted
      ? ""
      : `
  apiKey:  process.env.${envPrefix}DYRECTED_API_KEY || '${config.apiKey}',
  siteId:  process.env.${envPrefix}SITE_ID || '${config.siteId}',`
  }
})
\`\`\`

2. **Admin Dashboard** (\`app/admin/[[...slug]]/page.tsx\`):
\`\`\`tsx
import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  // DyrectedAdmin handles router, CSS, and "use client" for you
  return <DyrectedAdmin basename="/admin" />
}
\`\`\`
`,

    nuxt: `1. **Nuxt Config** (\`nuxt.config.ts\`):
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

2. **Admin Dashboard** (\`pages/admin.vue\`):
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
    mission +
    (frameworks[activeTab] || frameworks.next) +
    `
  API Reference: https://docs.dyrected.com`
  );
}
