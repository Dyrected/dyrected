import { Hero } from '@/components/hero'
import { Card } from '@/components/ui/card'
import {
  BookOpen,
  Terminal,
  Zap,
  Layers,
  Database,
  Cloud,
} from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex-1 space-y-20 pb-20">
      <Hero
        title="Engineering-First Content Infrastructure"
        description="The headless CMS that lives in your codebase. Framework-agnostic, AI-native, and built for speed."
      >
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          {/* Primary CTA — Signal Lime */}
          <a
            href="/docs/getting-started/introduction"
            className="rounded-full px-8 py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: '#B6FF2E',
              color: '#111110',
              boxShadow: '0 4px 20px rgba(182,255,46,0.35)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#9BE600')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#B6FF2E')}
          >
            Get Started
          </a>
          {/* Secondary CTA — Violet outline */}
          <a
            href="https://github.com/she-WritesCode/dyrected"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-8 py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(124,61,255,0.4)',
              color: '#7C3DFF',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(124,61,255,0.06)'
              ;(e.currentTarget as HTMLElement).style.borderColor = '#7C3DFF'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,61,255,0.4)'
            }}
          >
            Star on GitHub
          </a>
        </div>
      </Hero>

      {/* Doc section cards */}
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

      {/* Open source / community — white break section per branding spec */}
      <section className="container mx-auto px-4 max-w-4xl text-center">
        <div
          className="rounded-3xl p-12"
          style={{
            background: '#FFFFFF',
            border: '1px solid #DED7F2',
            boxShadow: '0 2px 40px rgba(124,61,255,0.06)',
          }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display, serif)', color: '#111110' }}
          >
            Source Available &amp; Transparent
          </h2>
          <p className="mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: '#625F6C' }}>
            Dyrected is source-available and built for the community. Join our Discord to contribute
            or get help with your project.
          </p>
          <div className="flex justify-center gap-6 text-sm font-medium">
            <a
              href="#"
              className="transition-colors"
              style={{ color: '#7C3DFF' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#6427E8')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#7C3DFF')}
            >
              Discord
            </a>
            <span style={{ color: '#DED7F2' }}>•</span>
            <a
              href="#"
              className="transition-colors"
              style={{ color: '#7C3DFF' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#6427E8')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#7C3DFF')}
            >
              GitHub Discussions
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA — strongest color moment per branding spec */}
      <section className="container mx-auto px-4 max-w-4xl text-center">
        <div
          className="rounded-3xl py-16 px-8"
          style={{ background: '#B6FF2E' }}
        >
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display, serif)', color: '#111110' }}
          >
            Ready to build?
          </h2>
          <p className="mb-8 max-w-sm mx-auto text-sm leading-relaxed" style={{ color: '#111110', opacity: 0.7 }}>
            Drop Dyrected into your Next.js or Nuxt app and have your first collection live in
            minutes.
          </p>
          <a
            href="/docs/getting-started/introduction"
            className="inline-flex items-center rounded-full px-8 py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: '#111110',
              color: '#B6FF2E',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            Read the docs →
          </a>
        </div>
      </section>
    </main>
  )
}
