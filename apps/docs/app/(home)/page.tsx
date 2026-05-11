import { Hero } from '@/components/hero'
import { Card } from '@/components/ui/card'
import { 
  BookOpen, 
  Terminal, 
  Zap, 
  Layers, 
  Database, 
  Cloud 
} from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex-1 space-y-20 pb-20">
      <Hero 
        title="Engineering-First Content Infrastructure" 
        description="The headless CMS that lives in your codebase. Framework-agnostic, AI-native, and built for speed."
      >
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <a
            href="/docs/getting-started/introduction"
            className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90"
          >
            Get Started
          </a>
          <a
            href="https://github.com/she-WritesCode/dyrected"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border bg-background px-8 py-3 text-sm font-semibold transition-all hover:bg-muted"
          >
            Star on GitHub
          </a>
        </div>
      </Hero>

      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <section className="container mx-auto px-4 max-w-4xl text-center">
        <div className="rounded-3xl border bg-linear-to-b from-muted/50 to-transparent p-12">
          <h2 className="text-2xl font-bold mb-4">Source Available & Transparent</h2>
          <p className="text-muted-foreground mb-8">
            Dyrected is source-available and built for the community. 
            Join our Discord to contribute or get help with your project.
          </p>
          <div className="flex justify-center gap-4">
             <a href="#" className="text-sm font-medium hover:underline text-primary">Discord</a>
             <span className="text-muted-foreground">•</span>
             <a href="#" className="text-sm font-medium hover:underline text-primary">GitHub Discussions</a>
          </div>
        </div>
      </section>
    </main>
  )
}
