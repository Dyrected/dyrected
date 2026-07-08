import type { ReactNode } from 'react'
import { newDocsSource } from '@/app/source'
import { ClientDocsLayout } from '@/components/client-docs-layout'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientDocsLayout tree={newDocsSource.pageTree}>
      {children}
    </ClientDocsLayout>
  )
}
