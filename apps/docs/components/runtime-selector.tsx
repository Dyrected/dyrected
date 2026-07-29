'use client'

import Link from 'fumadocs-core/link'
import { Cloud, Server } from 'lucide-react'
import type { DocsSiteRuntime } from '@/lib/docs-runtime'
import { DOCS_SITE_RUNTIMES, getRuntimeSwitchUrl } from '@/lib/docs-runtime'
import { cn } from '@/lib/utils'

const RUNTIME_LABELS: Record<DocsSiteRuntime, string> = {
  cloud: 'Cloud',
  'self-hosted': 'Self-hosted',
}

const RUNTIME_ICONS = {
  cloud: Cloud,
  'self-hosted': Server,
} satisfies Record<DocsSiteRuntime, typeof Cloud>

export function RuntimeSelector({
  pathname,
  runtime,
}: {
  pathname: string
  runtime: DocsSiteRuntime
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl border bg-fd-muted/40 p-1"
      aria-label="Runtime selector"
    >
      {DOCS_SITE_RUNTIMES.map((targetRuntime) => {
        const Icon = RUNTIME_ICONS[targetRuntime]
        const active = runtime === targetRuntime

        return (
          <Link
            key={targetRuntime}
            href={getRuntimeSwitchUrl(pathname, targetRuntime)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
              active
                ? 'bg-fd-background text-fd-foreground shadow-sm'
                : 'text-fd-muted-foreground hover:bg-fd-accent/50 hover:text-fd-accent-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{RUNTIME_LABELS[targetRuntime]}</span>
          </Link>
        )
      })}
    </div>
  )
}
