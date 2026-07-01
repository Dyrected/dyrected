import { Hero } from '@/components/hero'
import { Card } from '@/components/ui/card'
import { BookOpen, Terminal, Zap, Layers, Database, Cloud } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex-1 space-y-20 pb-20">
      <Hero
        title="Give every site you build a client-ready admin"
        description="Dyrected adds a safe content admin to websites and SaaS apps, so clients and teams can update content without touching your design or creating engineering tickets."
      >
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <a href="/docs/getting-started/introduction" className="btn-lime rounded-full px-8 py-3 text-sm font-semibold">
            Get Started
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
        <p className="max-w-2xl text-sm text-muted-foreground">
          Use the hosted admin at <span className="font-medium text-foreground">app.dyrected.com</span> for automatic updates,
          or mount the admin inside your app at <span className="font-medium text-foreground">/admin</span> for a white-label handoff.
        </p>
      </Hero>

      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card
            title="Guides"
            description="Step-by-step tutorials on building blogs, portfolios, and enterprise dashboards with Dyrected."
            href="/docs/guides/building-a-blog"
            icon={<BookOpen size={20} />}
          />
          <Card
            title="REST API"
            description="Explore the comprehensive REST API endpoints for content manipulation and retrieval."
            href="/docs/reference/rest-api"
            icon={<Terminal size={20} />}
          />
          <Card
            title="SDK Reference"
            description="Deep dive into our TypeScript SDK, including hooks for React, Next.js, and Nuxt."
            href="/docs/reference/sdk"
            icon={<Zap size={20} />}
          />
          <Card
            title="Core Concepts"
            description="Understand how collections, fields, and access control work under the hood."
            href="/docs/concepts/collections"
            icon={<Layers size={20} />}
          />
          <Card
            title="Storage Adapters"
            description="Configure Local, S3, or Cloudinary storage for your media and file uploads."
            href="/docs/adapters/storage"
            icon={<Database size={20} />}
          />
          <Card
            title="Deployment"
            description="Guides for deploying Dyrected to Docker, Railway, or Vercel with ease."
            href="/docs/deployment/docker"
            icon={<Cloud size={20} />}
          />
        </div>
      </section>

      {/* Proof section: white in light mode, Violet Black in dark mode. */}
      <section className="container mx-auto px-4 max-w-4xl text-center">
        <div className="proof-section rounded-lg p-12">
          <h2
            className="text-2xl font-medium tracking-normal mb-4 text-foreground"
            style={{ fontFamily: 'var(--font-display, serif)' }}
          >
            Source Available &amp; Transparent
          </h2>
          <p className="mb-8 max-w-lg mx-auto leading-relaxed text-sm text-muted-foreground">
            Dyrected is source-available and built for the community. Join our Discord to contribute
            or get help with your project.
          </p>
          <div className="flex justify-center gap-6 text-sm font-medium">
            <a href="#" className="link-violet">Discord</a>
            <span className="proof-divider">•</span>
            <a href="#" className="link-violet">GitHub Discussions</a>
          </div>
        </div>
      </section>

      {/* Final CTA — strongest color moment: full Signal Lime section */}
      <section className="container mx-auto px-4 max-w-4xl text-center">
        <div className="cta-lime rounded-lg py-16 px-8">
          <h2
            className="text-3xl font-medium tracking-normal mb-4"
            style={{ fontFamily: 'var(--font-display, serif)' }}
          >
            Ready to build?
          </h2>
          <p className="cta-lime-copy mb-8 max-w-sm mx-auto text-sm leading-relaxed">
            Define what editors can change in code, then choose hosted admin or embedded admin based on how you want to hand it off.
          </p>
          <a href="/docs/getting-started/introduction" className="btn-dark-on-lime inline-flex items-center rounded-full px-8 py-3 text-sm font-semibold">
            Read the docs →
          </a>
        </div>
      </section>
    </main>
  )
}
