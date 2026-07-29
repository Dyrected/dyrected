import { Hero } from '@/components/hero'
import { Card } from '@/components/ui/card'
import { InstallCommand } from '@/components/install-command'
import { CopyPromptButton } from '@/components/copy-prompt-button'
import { NextLogo, NuxtLogo, ReactLogo, VueLogo } from '@/components/framework-logos'
import { getRuntimePageUrl } from '@/lib/docs-runtime'
import {
  Bot,
  Compass,
  Database,
  ShieldCheck,
  Eye,
  Rocket,
  ArrowRight,
} from 'lucide-react'

const DOCS_PRODUCT_RUNTIME = 'cloud'

// Framework quickstarts. AI agents is a first-class peer, listed first.
const quickstarts = [
  {
    label: 'AI agents',
    descriptor: 'Set up with a coding agent',
    href: getRuntimePageUrl(
      'quick-start-guides/coding-agents-and-ai-app-builders/setting-up-your-cloud-site',
      DOCS_PRODUCT_RUNTIME,
    ),
    badge: <Bot size={18} />,
  },
  {
    label: 'Next.js',
    descriptor: 'Cloud or self-hosted',
    href: getRuntimePageUrl('quick-start-guides/nextjs-quick-start/overview', DOCS_PRODUCT_RUNTIME),
    badge: <NextLogo />,
  },
  {
    label: 'Nuxt',
    descriptor: 'Cloud or self-hosted',
    href: getRuntimePageUrl('quick-start-guides/nuxtjs-quick-start/overview', DOCS_PRODUCT_RUNTIME),
    badge: <NuxtLogo />,
  },
  {
    label: 'React',
    descriptor: 'Cloud-backed setup',
    href: getRuntimePageUrl('quick-start-guides/reactjs-quick-start/overview', DOCS_PRODUCT_RUNTIME),
    badge: <ReactLogo />,
  },
  {
    label: 'Vue',
    descriptor: 'Cloud-backed setup',
    href: getRuntimePageUrl('quick-start-guides/vuejs-quick-start/overview', DOCS_PRODUCT_RUNTIME),
    badge: <VueLogo />,
  },
]

export default function HomePage() {
  return (
    <main className="flex-1 space-y-24 pb-24">
      <Hero
        title="Give every custom website a client-ready content backend"
        description="Dyrected Cloud hosts the CMS backend for your site: structured content, media, content APIs, editor access, workflows, and Cloud-safe hooks defined as content rules. Self-hosted Dyrected is there when the CMS needs to run inside your app backend."
      >
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <a
            href={getRuntimePageUrl('basics/getting-started/what-is-dyrected', DOCS_PRODUCT_RUNTIME)}
            className="btn-lime rounded-full px-8 py-3 text-sm font-semibold"
          >
            Start with Cloud
          </a>
          <a
            href={getRuntimePageUrl('basics/getting-started/choose-a-runtime', DOCS_PRODUCT_RUNTIME)}
            className="btn-violet-outline rounded-full px-8 py-3 text-sm font-semibold"
          >
            Choose a runtime
          </a>
          <a
            href="https://github.com/Dyrected/dyrected"
            target="_blank"
            rel="noreferrer"
            className="btn-violet-outline rounded-full px-8 py-3 text-sm font-semibold"
          >
            Star on GitHub
          </a>
        </div>
      </Hero>

      {/* Set up: for humans (install command) and for agents (copy prompt) */}
      <section className="container mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="setup-panel flex flex-col gap-4 rounded-2xl p-6">
            <div>
              <h2 className="setup-eyebrow text-xs font-semibold uppercase tracking-wide">
                For humans
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scaffold Dyrected into a new or existing project. Same command on any package manager.
              </p>
            </div>
            <InstallCommand />
            <a
              href={getRuntimePageUrl('basics/getting-started/installation', DOCS_PRODUCT_RUNTIME)}
              className="link-violet mt-auto inline-flex items-center gap-1 text-sm font-medium"
            >
              Installation guide
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="setup-panel flex flex-col gap-4 rounded-2xl p-6">
            <div>
              <h2 className="setup-eyebrow text-xs font-semibold uppercase tracking-wide">
                For agents
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste the setup prompt into Claude Code, Cursor, or any coding agent and let it wire
                Dyrected up for you.
              </p>
            </div>
            <div>
              <CopyPromptButton mode="cloud" />
            </div>
            <a
              href={getRuntimePageUrl(
                'quick-start-guides/coding-agents-and-ai-app-builders/using-the-dyrected-prompt',
                DOCS_PRODUCT_RUNTIME,
              )}
              className="link-violet mt-auto inline-flex items-center gap-1 text-sm font-medium"
            >
              Using the Dyrected prompt
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Quickstarts by framework */}
      <section className="container mx-auto max-w-6xl px-4">
        <h2
          className="mb-6 text-2xl font-medium tracking-normal text-foreground"
          style={{ fontFamily: 'var(--font-display, serif)' }}
        >
          Start in your stack
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {quickstarts.map((qs) => (
            <a
              key={qs.label}
              href={qs.href}
              className="doc-card group flex flex-col gap-3 rounded-xl p-5"
            >
              <div className="doc-card-icon flex h-10 w-10 items-center justify-center rounded-lg">
                {qs.badge}
              </div>
              <div>
                <h3 className="doc-card-title font-medium">{qs.label}</h3>
                <p className="doc-card-copy mt-0.5 text-xs leading-relaxed">{qs.descriptor}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Browse by intent — real top-level areas */}
      <section className="container mx-auto max-w-6xl px-4">
        <h2
          className="mb-6 text-2xl font-medium tracking-normal text-foreground"
          style={{ fontFamily: 'var(--font-display, serif)' }}
        >
          Explore the docs
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Core concepts"
            description="How collections, fields, globals, and access control fit together in a Dyrected config."
            href={getRuntimePageUrl('basics/getting-started/concepts', DOCS_PRODUCT_RUNTIME)}
            icon={<Compass size={20} />}
          />
          <Card
            title="Managing data"
            description="Query and mutate your content with the TypeScript SDK and the REST API."
            href={getRuntimePageUrl('managing-data/sdk-api/overview', DOCS_PRODUCT_RUNTIME)}
            icon={<Database size={20} />}
          />
          <Card
            title="The admin panel"
            description="Configure the editing experience your clients and teams actually use every day."
            href={getRuntimePageUrl('features/admin/overview', DOCS_PRODUCT_RUNTIME)}
            icon={<Eye size={20} />}
          />
          <Card
            title="Authentication"
            description="Use Cloud for content-workspace access, or self-hosted collection auth when Dyrected should own application users."
            href={getRuntimePageUrl('features/authentication/overview', DOCS_PRODUCT_RUNTIME)}
            icon={<ShieldCheck size={20} />}
          />
          <Card
            title="Live preview"
            description="Let editors see content changes reflected in your real frontend as they type."
            href={getRuntimePageUrl('features/live-preview/overview', DOCS_PRODUCT_RUNTIME)}
            icon={<Eye size={20} />}
          />
          <Card
            title="Deployment"
            description="Deploy Cloud-backed sites and self-hosted runtimes with the right boundary in mind."
            href={getRuntimePageUrl('deployment/production/deployment', DOCS_PRODUCT_RUNTIME)}
            icon={<Rocket size={20} />}
          />
        </div>
      </section>

      {/* Thin community strip */}
      <section className="container mx-auto max-w-4xl px-4">
        <div className="proof-section flex flex-col items-center gap-3 rounded-xl p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-base font-medium text-foreground">Source-available and community-built</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Contribute, ask questions, or follow along as Dyrected grows.
            </p>
          </div>
          <div className="flex shrink-0 gap-6 text-sm font-medium">
            <a
              href="https://github.com/Dyrected/dyrected/discussions"
              target="_blank"
              rel="noreferrer"
              className="link-violet"
            >
              Ask a question
            </a>
            <span className="proof-divider">•</span>
            <a
              href="https://github.com/Dyrected/dyrected"
              target="_blank"
              rel="noreferrer"
              className="link-violet"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
