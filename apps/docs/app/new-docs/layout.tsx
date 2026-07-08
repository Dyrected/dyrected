import type { ReactNode } from 'react'
import { newDocsSource } from '@/app/source'
import { ClientDocsLayout } from '@/components/client-docs-layout'
import { prepareTree } from '@/lib/unpublished'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientDocsLayout tree={prepareTree(newDocsSource.pageTree)}>
      {children}
    </ClientDocsLayout>
  )
}
