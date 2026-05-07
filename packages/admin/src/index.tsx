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
    const base = `I need to integrate Dyrected CMS into my ${framework} project. Please complete the entire setup automatically.

**Site Details:**
- Site Name: ${config.siteName}
- Site ID: ${config.siteId}
- API Key: ${config.apiKey}
- API Base URL: ${config.baseUrl}

**Step 1: Content Model Definition**
Create a 'dyrected.config.ts' that defines your schema. 

**Supported Field Types:**
'text', 'textarea', 'richText', 'number', 'boolean', 'date', 'select', 'multiSelect', 'email', 'url', 'relationship', 'array', 'object', 'json', 'blocks'.

**Advanced Config:**
- \`labels\`: { singular: string, plural: string }
- \`upload\`: true (to enable media/image uploads for this collection)
- \`auth\`: true (to enable authentication for this collection)
- \`admin\`: { hidden: boolean, useAsTitle: string, group: string }

Example:
\`\`\`typescript
import { defineCollection, defineConfig } from '@dyrected/core'

const media = defineCollection({
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  upload: true,
  fields: [
    { name: 'alt', type: 'text' }
  ]
})

const pages = defineCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'featuredImage', type: 'relationship', collection: 'media' }
  ]
})

const posts = defineCollection({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  upload: true,
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richText' }
  ]
})

const navigation = defineGlobal({
  slug: 'navigation',
  label: 'Navigation',
  fields: [
    { 
      name: 'menuItems', 
      type: 'array', 
      fields: [
        { name: 'label', type: 'text' },
        { name: 'link', type: 'relationship', collection: 'pages' }
      ]
    }
  ]
})

const settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  fields: [
    { name: 'siteName', type: 'text' },
    { name: 'logo', type: 'relationship', collection: 'media' },
    { name: 'footerText', type: 'textarea' }
  ]
})

export default defineConfig({
  collections: [media, pages, posts],
  globals: [navigation, settings]
})
\`\`\`

**Step 2: Schema Sync**
You can sync your schema automatically during build. Add this to your 'package.json':
\`\`\`json
"scripts": {
  "build": "dyrected sync:schema && next build"
}
\`\`\`
Or run it manually:
\`npx dyrected sync:schema --api-key ${config.apiKey} --site-id ${config.siteId}\`

**Step 3: Frontend Implementation**
`;

    const frameworks: Record<string, string> = {
      next: `Install '@dyrected/next'. 
Use 'getDyrectedClient()' in Server Components to fetch data:
\`\`\`tsx
import { getDyrectedClient } from '@dyrected/next/server'
const dyrected = getDyrectedClient()
const { docs } = await dyrected.collections.find('posts')
\`\`\``,
      nuxt: `Install '@dyrected/nuxt'. 
Register the module in 'nuxt.config.ts' and use 'useDyrectedServer()' in your pages:
\`\`\`ts
const dyrected = useDyrectedServer()
const { data: posts } = await useAsyncData('posts', () => dyrected.collections.find('posts'))
\`\`\``,
      react: `Install '@dyrected/sdk'. 
Initialize the client and fetch data in your components:
\`\`\`tsx
import { createClient } from '@dyrected/sdk'
const dyrected = createClient({ 
  apiUrl: '${config.baseUrl}', 
  apiKey: '${config.apiKey}' 
})
const { docs } = await dyrected.collections.find('posts')
\`\`\``,
      vue: `Install '@dyrected/sdk'. 
Initialize the client and use it in your Vue components:
\`\`\`ts
import { createClient } from '@dyrected/sdk'
const dyrected = createClient({ 
  apiUrl: '${config.baseUrl}', 
  apiKey: '${config.apiKey}' 
})
const posts = ref([])
onMounted(async () => {
  const res = await dyrected.collections.find('posts')
  posts.value = res.docs
})
\`\`\``
    };

    return base + frameworks[framework] + `\n\n**Documentation Reference:**\nFor more advanced configurations (hooks, access control, custom blocks), refer to:\n${config.baseUrl}/api/docs`;
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
