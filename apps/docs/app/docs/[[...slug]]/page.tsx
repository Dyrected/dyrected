import type { Metadata } from 'next'
import { readFile } from 'node:fs/promises'
import { notFound } from 'next/navigation'
import Link from 'fumadocs-core/link'
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Steps, Step } from 'fumadocs-ui/components/steps'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import { Files, File, Folder } from 'fumadocs-ui/components/files'
import { CopyPageButton } from '@/components/copy-page-button'
import { CopyPromptButton } from '@/components/copy-prompt-button'
import { SetupWizard } from '@/components/setup-wizard'
import { Note, Warning } from '@/components/callouts'
import { Mermaid } from '@/components/mermaid'
import { RecipeExample } from '@/components/recipe-example'
import { SafeScriptTag } from '@/components/safe-script-tag'
import { source } from '@/app/source'
import { isUnpublishedSlug, showUnpublished } from '@/lib/unpublished'
import { ArrowUpRight, Cloud } from 'lucide-react'

interface Props {
  params: Promise<{ slug?: string[] }>
}

function CloudRailCard() {
  return (
    <div className="mt-4 rounded-2xl border border-fd-border bg-linear-to-br from-fd-card via-fd-card to-fd-muted/55 p-4 shadow-[0_18px_46px_-42px_var(--surface-shadow)]">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_10px_28px_-18px_rgba(182,255,46,0.8)]">
        <Cloud className="h-4 w-4" />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fd-primary">
          Dyrected Cloud
        </p>
        <h3 className="text-sm font-semibold leading-5 text-fd-foreground">
          Get your backend ready in minutes
        </h3>
        <p className="text-sm leading-5 text-fd-muted-foreground">
          Use a managed database, storage, APIs, and admin dashboard without setting up the infrastructure yourself. Keep hosting your app wherever you choose.
        </p>
      </div>
      <Link
        href="/docs/quick-start-guides/nextjs-quick-start/setting-up-your-cloud-site"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent)] px-3 py-2 text-sm font-medium text-[color:var(--accent-foreground)] transition-transform transition-colors hover:bg-[color:var(--accent-hover)] hover:-translate-y-px"
      >
        Set Up My Backend
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  if (isUnpublishedSlug(slug) && !showUnpublished) notFound()
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body
  const rawContent = page.absolutePath
    ? await readFile(page.absolutePath, 'utf-8').catch(() => '')
    : ''

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      lastUpdate={(page.data as any).lastModified}
      tableOfContent={{
        footer: <CloudRailCard />,
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <DocsTitle style={{ fontFamily: 'var(--font-display, serif)', fontWeight: 500 }}>
            {page.data.title}
          </DocsTitle>
          <DocsDescription style={{ fontFamily: 'var(--font-sans, sans-serif)' }}>
            {page.data.description}
          </DocsDescription>
        </div>
        <CopyPageButton content={rawContent} />
      </div>
      <DocsBody style={{ fontFamily: 'var(--font-sans, sans-serif)' }}>
        <MDX
          components={{
            ...defaultMdxComponents,
            Tab,
            Tabs,
            Steps,
            Step,
            Accordion,
            Accordions,
            TypeTable,
            Files,
            File,
            Folder,
            CopyPromptButton,
            SetupWizard,
            Note,
            Warning,
            Mermaid,
            RecipeExample,
            script: SafeScriptTag,
          }}
        />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  const params = source.generateParams()
  if (showUnpublished) return params
  return params.filter((param) => !isUnpublishedSlug(param.slug))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (isUnpublishedSlug(slug) && !showUnpublished) notFound()
  const page = source.getPage(slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
