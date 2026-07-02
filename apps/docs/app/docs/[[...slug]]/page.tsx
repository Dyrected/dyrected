import type { Metadata } from 'next'
import { readFile } from 'node:fs/promises'
import { notFound } from 'next/navigation'
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
import { source } from '@/app/source'

interface Props {
  params: Promise<{ slug?: string[] }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
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
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsDescription>{page.data.description}</DocsDescription>
        </div>
        <CopyPageButton content={rawContent} />
      </div>
      <DocsBody>
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
          }}
        />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
