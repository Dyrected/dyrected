'use client'

import { useState } from 'react'
import { Cloud, Server, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Backend = 'cloud' | 'self-hosted'
type Framework = 'nextjs' | 'nuxtjs'

const GUIDES: Record<string, { label: string; href: string }> = {
  cloud: { label: 'Cloud Backend guide', href: '/docs/getting-started/quickstart#cloud-backend' },
  nextjs: { label: 'Self-hosted Next.js guide', href: '/docs/getting-started/quickstart#self-hosted-nextjs' },
  nuxtjs: { label: 'Self-hosted Nuxt.js guide', href: '/docs/getting-started/quickstart#self-hosted-nuxtjs' },
}

function ChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'doc-card group flex flex-1 flex-col gap-2 rounded-xl p-5 text-left transition-colors',
        'border border-fd-border hover:border-fd-primary/50'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fd-muted">
          {icon}
        </div>
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="text-sm text-fd-muted-foreground">{description}</p>
    </button>
  )
}

export function SetupWizard() {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [framework, setFramework] = useState<Framework | null>(null)

  function reset() {
    setBackend(null)
    setFramework(null)
  }

  const guideKey = backend === 'cloud' ? 'cloud' : framework
  const guide = guideKey ? GUIDES[guideKey] : null

  return (
    <div className="not-prose my-6 rounded-xl border border-fd-border bg-fd-card p-5">
      <p className="mb-4 text-sm font-medium text-fd-muted-foreground">
        Not sure where to start? Answer one or two questions and we'll take you to the right guide.
      </p>

      {!backend && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <ChoiceCard
            icon={<Cloud className="h-4 w-4" />}
            title="Dyrected Cloud"
            description="Managed backend, hosted by Dyrected. Fastest way to go live."
            onClick={() => setBackend('cloud')}
          />
          <ChoiceCard
            icon={<Server className="h-4 w-4" />}
            title="Self-hosted"
            description="Runs inside your own Next.js or Nuxt.js app. You own the infrastructure."
            onClick={() => setBackend('self-hosted')}
          />
        </div>
      )}

      {backend === 'self-hosted' && !framework && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <ChoiceCard
            icon={<Server className="h-4 w-4" />}
            title="Next.js"
            description="App Router project."
            onClick={() => setFramework('nextjs')}
          />
          <ChoiceCard
            icon={<Server className="h-4 w-4" />}
            title="Nuxt.js"
            description="Nuxt 3 project."
            onClick={() => setFramework('nuxtjs')}
          />
        </div>
      )}

      {guide && (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href={guide.href} className="flex items-center gap-2">
              Go to the {guide.label}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-fd-muted-foreground hover:text-fd-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start over
          </button>
        </div>
      )}
    </div>
  )
}
